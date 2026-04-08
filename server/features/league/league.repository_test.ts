import { assertEquals } from "@std/assert";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../db/schema.ts";
import { league, leaguePlayer, user } from "../../db/schema.ts";
import { createLeagueRepository } from "./league.repository.ts";

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

Deno.test({
  name: "leagueRepository.createWithCreator: creates league and creator player",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);

      const result = await repo.createWithCreator(userId, {
        name: "Test League",
        inviteCode: "TESTCODE",
      });

      assertEquals(result.name, "Test League");
      assertEquals(result.inviteCode, "TESTCODE");
      assertEquals(result.createdBy, userId);
      assertEquals(result.status, "setup");

      const players = await db.select().from(leaguePlayer).where(
        eq(leaguePlayer.leagueId, result.id),
      );
      assertEquals(players.length, 1);
      assertEquals(players[0].userId, userId);
      assertEquals(players[0].role, "creator");
    } finally {
      await db.delete(leaguePlayer);
      await db.delete(league);
      await db.delete(user).where(eq(user.id, userId));
      await client.end();
    }
  },
});

Deno.test({
  name: "leagueRepository.findById: returns league when it exists",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const created = await repo.createWithCreator(userId, {
        name: "Find Me",
        inviteCode: "FINDME01",
      });

      const found = await repo.findById(created.id);
      assertEquals(found?.id, created.id);
      assertEquals(found?.name, "Find Me");
    } finally {
      await db.delete(leaguePlayer);
      await db.delete(league);
      await db.delete(user).where(eq(user.id, userId));
      await client.end();
    }
  },
});

Deno.test({
  name: "leagueRepository.findById: returns null when not found",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);

    try {
      const found = await repo.findById(crypto.randomUUID());
      assertEquals(found, null);
    } finally {
      await client.end();
    }
  },
});

Deno.test({
  name: "leagueRepository.findByInviteCode: returns league by code",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const created = await repo.createWithCreator(userId, {
        name: "Invite League",
        inviteCode: "INVITE01",
      });

      const found = await repo.findByInviteCode("INVITE01");
      assertEquals(found?.id, created.id);
    } finally {
      await db.delete(leaguePlayer);
      await db.delete(league);
      await db.delete(user).where(eq(user.id, userId));
      await client.end();
    }
  },
});

Deno.test({
  name: "leagueRepository.addPlayer: adds a member to a league",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const creatorId = crypto.randomUUID();
    const memberId = crypto.randomUUID();

    try {
      await createTestUser(db, creatorId);
      await createTestUser(db, memberId);
      const created = await repo.createWithCreator(creatorId, {
        name: "Join League",
        inviteCode: "JOIN0001",
      });

      const player = await repo.addPlayer(created.id, memberId);
      assertEquals(player.leagueId, created.id);
      assertEquals(player.userId, memberId);
      assertEquals(player.role, "member");
    } finally {
      await db.delete(leaguePlayer);
      await db.delete(league);
      await db.delete(user).where(eq(user.id, creatorId));
      await db.delete(user).where(eq(user.id, memberId));
      await client.end();
    }
  },
});

Deno.test({
  name: "leagueRepository.findPlayer: finds an existing player",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const created = await repo.createWithCreator(userId, {
        name: "Player League",
        inviteCode: "PLAYER01",
      });

      const player = await repo.findPlayer(created.id, userId);
      assertEquals(player?.userId, userId);
      assertEquals(player?.role, "creator");
    } finally {
      await db.delete(leaguePlayer);
      await db.delete(league);
      await db.delete(user).where(eq(user.id, userId));
      await client.end();
    }
  },
});

Deno.test({
  name: "leagueRepository.findPlayer: returns null when not a member",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const created = await repo.createWithCreator(userId, {
        name: "No Member League",
        inviteCode: "NOMEMB01",
      });

      const player = await repo.findPlayer(created.id, crypto.randomUUID());
      assertEquals(player, null);
    } finally {
      await db.delete(leaguePlayer);
      await db.delete(league);
      await db.delete(user).where(eq(user.id, userId));
      await client.end();
    }
  },
});

Deno.test({
  name: "leagueRepository.findAllByUserId: returns leagues the user belongs to",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      await repo.createWithCreator(userId, {
        name: "League A",
        inviteCode: "USRLGA01",
      });
      await repo.createWithCreator(userId, {
        name: "League B",
        inviteCode: "USRLGB01",
      });

      const leagues = await repo.findAllByUserId(userId);
      assertEquals(leagues.length, 2);
    } finally {
      await db.delete(leaguePlayer);
      await db.delete(league);
      await db.delete(user).where(eq(user.id, userId));
      await client.end();
    }
  },
});
