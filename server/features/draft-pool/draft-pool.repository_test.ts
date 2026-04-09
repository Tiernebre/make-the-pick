import { assertEquals, assertRejects } from "@std/assert";
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
  user,
  watchlistItem,
} from "../../db/schema.ts";
import { createDraftPoolRepository } from "./draft-pool.repository.ts";

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
  await db.insert(leaguePlayer).values({
    leagueId: newLeague.id,
    userId,
    role: "commissioner",
  });
  return newLeague;
}

async function cleanup(
  db: ReturnType<typeof drizzle<typeof schema>>,
  client: ReturnType<typeof postgres>,
  userIds: string[],
) {
  await db.delete(watchlistItem);
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
  name: "draftPoolRepository.create: inserts a pool row",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createDraftPoolRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const testLeague = await createTestLeague(db, userId);

      const pool = await repo.create(testLeague.id, "Gen 1 Pool");

      assertEquals(pool.leagueId, testLeague.id);
      assertEquals(pool.name, "Gen 1 Pool");
      assertEquals(typeof pool.id, "string");
      assertEquals(pool.createdAt instanceof Date, true);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name: "draftPoolRepository.create: enforces unique league_id constraint",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createDraftPoolRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const testLeague = await createTestLeague(db, userId);

      await repo.create(testLeague.id, "First Pool");

      await assertRejects(
        () => repo.create(testLeague.id, "Second Pool"),
      );
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name: "draftPoolRepository.createItems: batch inserts items with metadata",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createDraftPoolRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const testLeague = await createTestLeague(db, userId);
      const pool = await repo.create(testLeague.id, "Items Pool");

      const items = await repo.createItems([
        {
          draftPoolId: pool.id,
          name: "pikachu",
          thumbnailUrl: "https://example.com/pikachu.png",
          metadata: {
            pokemonId: 25,
            types: ["electric"],
            baseStats: {
              hp: 35,
              attack: 55,
              defense: 40,
              specialAttack: 50,
              specialDefense: 50,
              speed: 90,
            },
            generation: "generation-i",
          },
        },
        {
          draftPoolId: pool.id,
          name: "charizard",
          thumbnailUrl: "https://example.com/charizard.png",
          metadata: {
            pokemonId: 6,
            types: ["fire", "flying"],
            baseStats: {
              hp: 78,
              attack: 84,
              defense: 78,
              specialAttack: 109,
              specialDefense: 85,
              speed: 100,
            },
            generation: "generation-i",
          },
        },
      ]);

      assertEquals(items.length, 2);
      assertEquals(items[0].name, "pikachu");
      assertEquals(items[0].draftPoolId, pool.id);
      assertEquals(items[0].thumbnailUrl, "https://example.com/pikachu.png");
      assertEquals(
        (items[0].metadata as { pokemonId: number }).pokemonId,
        25,
      );
      assertEquals(items[1].name, "charizard");
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name:
    "draftPoolRepository.createItems: enforces unique (draft_pool_id, name)",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createDraftPoolRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const testLeague = await createTestLeague(db, userId);
      const pool = await repo.create(testLeague.id, "Dupe Pool");

      await repo.createItems([
        {
          draftPoolId: pool.id,
          name: "pikachu",
          thumbnailUrl: null,
          metadata: null,
        },
      ]);

      await assertRejects(
        () =>
          repo.createItems([
            {
              draftPoolId: pool.id,
              name: "pikachu",
              thumbnailUrl: null,
              metadata: null,
            },
          ]),
      );
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name: "draftPoolRepository.findByLeagueId: returns pool when it exists",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createDraftPoolRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const testLeague = await createTestLeague(db, userId);
      const created = await repo.create(testLeague.id, "Find Pool");

      const found = await repo.findByLeagueId(testLeague.id);
      assertEquals(found?.id, created.id);
      assertEquals(found?.name, "Find Pool");
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name: "draftPoolRepository.findByLeagueId: returns null when not found",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createDraftPoolRepository(db);

    try {
      const found = await repo.findByLeagueId(crypto.randomUUID());
      assertEquals(found, null);
    } finally {
      await client.end();
    }
  },
});

Deno.test({
  name: "draftPoolRepository.findItemsByPoolId: returns all items in a pool",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createDraftPoolRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const testLeague = await createTestLeague(db, userId);
      const pool = await repo.create(testLeague.id, "Items Pool");

      await repo.createItems([
        {
          draftPoolId: pool.id,
          name: "bulbasaur",
          thumbnailUrl: null,
          metadata: null,
        },
        {
          draftPoolId: pool.id,
          name: "charmander",
          thumbnailUrl: null,
          metadata: null,
        },
        {
          draftPoolId: pool.id,
          name: "squirtle",
          thumbnailUrl: null,
          metadata: null,
        },
      ]);

      const items = await repo.findItemsByPoolId(pool.id);
      assertEquals(items.length, 3);
      const names = items.map((i) => i.name).sort();
      assertEquals(names, ["bulbasaur", "charmander", "squirtle"]);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name:
    "draftPoolRepository.deleteByLeagueId: removes pool and cascades to items",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createDraftPoolRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const testLeague = await createTestLeague(db, userId);
      const pool = await repo.create(testLeague.id, "Delete Pool");

      await repo.createItems([
        {
          draftPoolId: pool.id,
          name: "eevee",
          thumbnailUrl: null,
          metadata: null,
        },
      ]);

      await repo.deleteByLeagueId(testLeague.id);

      const found = await repo.findByLeagueId(testLeague.id);
      assertEquals(found, null);

      const items = await db.select().from(draftPoolItem).where(
        eq(draftPoolItem.draftPoolId, pool.id),
      );
      assertEquals(items.length, 0);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});
