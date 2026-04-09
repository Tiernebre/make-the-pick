import { assertEquals } from "@std/assert";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../db/schema.ts";
import {
  draft,
  draftPool,
  draftPoolItem,
  league,
  leaguePlayer,
  poolItemNote,
  user,
} from "../../db/schema.ts";
import { createPoolItemNoteRepository } from "./pool-item-note.repository.ts";

function createTestDb() {
  const connectionString = Deno.env.get("DATABASE_URL");
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for integration tests");
  }
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });
  return { db, client };
}

async function createTestUser(
  db: ReturnType<typeof drizzle<typeof schema>>,
  id: string,
) {
  const [testUser] = await db.insert(user).values({
    id,
    name: "Test User",
    email: `${id}@test.com`,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return testUser;
}

async function createTestLeague(
  db: ReturnType<typeof drizzle<typeof schema>>,
  userId: string,
) {
  const inviteCode = crypto.randomUUID().slice(0, 8).toUpperCase();
  const [newLeague] = await db.insert(league).values({
    name: "Test League",
    inviteCode,
    createdBy: userId,
  }).returning();
  const [player] = await db.insert(leaguePlayer).values({
    leagueId: newLeague.id,
    userId,
    role: "commissioner",
  }).returning();
  return { league: newLeague, player };
}

async function createTestPool(
  db: ReturnType<typeof drizzle<typeof schema>>,
  leagueId: string,
) {
  const [pool] = await db.insert(draftPool).values({
    leagueId,
    name: "Test Pool",
  }).returning();
  return pool;
}

async function createTestPoolItems(
  db: ReturnType<typeof drizzle<typeof schema>>,
  poolId: string,
  names: string[],
) {
  const items = await db.insert(draftPoolItem).values(
    names.map((name) => ({
      draftPoolId: poolId,
      name,
      thumbnailUrl: null,
      metadata: null,
    })),
  ).returning();
  return items;
}

async function cleanup(
  db: ReturnType<typeof drizzle<typeof schema>>,
  client: ReturnType<typeof postgres>,
  userIds: string[],
) {
  await db.delete(poolItemNote);
  await db.delete(draft);
  await db.delete(draftPoolItem);
  await db.delete(draftPool);
  await db.delete(leaguePlayer);
  await db.delete(league);
  for (const userId of userIds) {
    await db.delete(user).where(eq(user.id, userId));
  }
  await client.end();
}

Deno.test({
  name: "poolItemNoteRepository.upsert: inserts a new note",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createPoolItemNoteRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const { player } = await createTestLeague(db, userId);
      const pool = await createTestPool(db, player.leagueId);
      const [item] = await createTestPoolItems(db, pool.id, ["pikachu"]);

      const note = await repo.upsert({
        leaguePlayerId: player.id,
        draftPoolItemId: item.id,
        content: "Sleeper pick",
      });

      assertEquals(note.leaguePlayerId, player.id);
      assertEquals(note.draftPoolItemId, item.id);
      assertEquals(note.content, "Sleeper pick");
      assertEquals(typeof note.id, "string");
      assertEquals(note.createdAt instanceof Date, true);
      assertEquals(note.updatedAt instanceof Date, true);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name: "poolItemNoteRepository.upsert: updates existing note content",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createPoolItemNoteRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const { player } = await createTestLeague(db, userId);
      const pool = await createTestPool(db, player.leagueId);
      const [item] = await createTestPoolItems(db, pool.id, ["pikachu"]);

      const original = await repo.upsert({
        leaguePlayerId: player.id,
        draftPoolItemId: item.id,
        content: "Sleeper pick",
      });

      const updated = await repo.upsert({
        leaguePlayerId: player.id,
        draftPoolItemId: item.id,
        content: "Actually not that great",
      });

      assertEquals(updated.id, original.id);
      assertEquals(updated.content, "Actually not that great");
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name:
    "poolItemNoteRepository.findByLeaguePlayerId: returns all notes for a player",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createPoolItemNoteRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const { player } = await createTestLeague(db, userId);
      const pool = await createTestPool(db, player.leagueId);
      const items = await createTestPoolItems(db, pool.id, [
        "pikachu",
        "charizard",
      ]);

      await repo.upsert({
        leaguePlayerId: player.id,
        draftPoolItemId: items[0].id,
        content: "Note 1",
      });
      await repo.upsert({
        leaguePlayerId: player.id,
        draftPoolItemId: items[1].id,
        content: "Note 2",
      });

      const notes = await repo.findByLeaguePlayerId(player.id);
      assertEquals(notes.length, 2);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name:
    "poolItemNoteRepository.findByLeaguePlayerId: returns empty array when none",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createPoolItemNoteRepository(db);

    try {
      const notes = await repo.findByLeaguePlayerId(crypto.randomUUID());
      assertEquals(notes, []);
    } finally {
      await client.end();
    }
  },
});

Deno.test({
  name:
    "poolItemNoteRepository.deleteByLeaguePlayerIdAndDraftPoolItemId: removes the note",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createPoolItemNoteRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const { player } = await createTestLeague(db, userId);
      const pool = await createTestPool(db, player.leagueId);
      const [item] = await createTestPoolItems(db, pool.id, ["pikachu"]);

      await repo.upsert({
        leaguePlayerId: player.id,
        draftPoolItemId: item.id,
        content: "To be deleted",
      });

      await repo.deleteByLeaguePlayerIdAndDraftPoolItemId(
        player.id,
        item.id,
      );

      const notes = await repo.findByLeaguePlayerId(player.id);
      assertEquals(notes.length, 0);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});
