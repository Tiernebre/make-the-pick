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
import { createWatchlistRepository } from "./watchlist.repository.ts";

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
  name: "watchlistRepository.create: inserts a watchlist item",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createWatchlistRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const { player } = await createTestLeague(db, userId);
      const pool = await createTestPool(db, player.leagueId);
      const [item] = await createTestPoolItems(db, pool.id, ["pikachu"]);

      const watchlistEntry = await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: item.id,
        position: 0,
      });

      assertEquals(watchlistEntry.leaguePlayerId, player.id);
      assertEquals(watchlistEntry.draftPoolItemId, item.id);
      assertEquals(watchlistEntry.position, 0);
      assertEquals(typeof watchlistEntry.id, "string");
      assertEquals(watchlistEntry.createdAt instanceof Date, true);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name:
    "watchlistRepository.create: enforces unique (league_player_id, draft_pool_item_id)",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createWatchlistRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const { player } = await createTestLeague(db, userId);
      const pool = await createTestPool(db, player.leagueId);
      const [item] = await createTestPoolItems(db, pool.id, ["pikachu"]);

      await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: item.id,
        position: 0,
      });

      await assertRejects(
        () =>
          repo.create({
            leaguePlayerId: player.id,
            draftPoolItemId: item.id,
            position: 1,
          }),
      );
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name:
    "watchlistRepository.findByLeaguePlayerId: returns items ordered by position",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createWatchlistRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const { player } = await createTestLeague(db, userId);
      const pool = await createTestPool(db, player.leagueId);
      const items = await createTestPoolItems(db, pool.id, [
        "pikachu",
        "charizard",
        "bulbasaur",
      ]);

      await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: items[0].id,
        position: 2,
      });
      await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: items[1].id,
        position: 0,
      });
      await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: items[2].id,
        position: 1,
      });

      const watchlist = await repo.findByLeaguePlayerId(player.id);
      assertEquals(watchlist.length, 3);
      assertEquals(watchlist[0].draftPoolItemId, items[1].id);
      assertEquals(watchlist[1].draftPoolItemId, items[2].id);
      assertEquals(watchlist[2].draftPoolItemId, items[0].id);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name:
    "watchlistRepository.findByLeaguePlayerId: returns empty array when none",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createWatchlistRepository(db);

    try {
      const watchlist = await repo.findByLeaguePlayerId(crypto.randomUUID());
      assertEquals(watchlist, []);
    } finally {
      await client.end();
    }
  },
});

Deno.test({
  name:
    "watchlistRepository.findByLeaguePlayerIdAndDraftPoolItemId: returns item when exists",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createWatchlistRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const { player } = await createTestLeague(db, userId);
      const pool = await createTestPool(db, player.leagueId);
      const [item] = await createTestPoolItems(db, pool.id, ["pikachu"]);

      const created = await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: item.id,
        position: 0,
      });

      const found = await repo.findByLeaguePlayerIdAndDraftPoolItemId(
        player.id,
        item.id,
      );
      assertEquals(found?.id, created.id);
      assertEquals(found?.position, 0);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name:
    "watchlistRepository.findByLeaguePlayerIdAndDraftPoolItemId: returns null when not found",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createWatchlistRepository(db);

    try {
      const found = await repo.findByLeaguePlayerIdAndDraftPoolItemId(
        crypto.randomUUID(),
        crypto.randomUUID(),
      );
      assertEquals(found, null);
    } finally {
      await client.end();
    }
  },
});

Deno.test({
  name: "watchlistRepository.getMaxPosition: returns max position value",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createWatchlistRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const { player } = await createTestLeague(db, userId);
      const pool = await createTestPool(db, player.leagueId);
      const items = await createTestPoolItems(db, pool.id, [
        "pikachu",
        "charizard",
      ]);

      await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: items[0].id,
        position: 0,
      });
      await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: items[1].id,
        position: 5,
      });

      const maxPos = await repo.getMaxPosition(player.id);
      assertEquals(maxPos, 5);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name: "watchlistRepository.getMaxPosition: returns null when no items",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createWatchlistRepository(db);

    try {
      const maxPos = await repo.getMaxPosition(crypto.randomUUID());
      assertEquals(maxPos, null);
    } finally {
      await client.end();
    }
  },
});

Deno.test({
  name:
    "watchlistRepository.deleteByLeaguePlayerIdAndDraftPoolItemId: removes the item",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createWatchlistRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const { player } = await createTestLeague(db, userId);
      const pool = await createTestPool(db, player.leagueId);
      const [item] = await createTestPoolItems(db, pool.id, ["pikachu"]);

      await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: item.id,
        position: 0,
      });

      await repo.deleteByLeaguePlayerIdAndDraftPoolItemId(
        player.id,
        item.id,
      );

      const found = await repo.findByLeaguePlayerIdAndDraftPoolItemId(
        player.id,
        item.id,
      );
      assertEquals(found, null);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});

Deno.test({
  name:
    "watchlistRepository.replaceAllPositions: updates positions to match order",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createWatchlistRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const { player } = await createTestLeague(db, userId);
      const pool = await createTestPool(db, player.leagueId);
      const items = await createTestPoolItems(db, pool.id, [
        "pikachu",
        "charizard",
        "bulbasaur",
      ]);

      const w0 = await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: items[0].id,
        position: 0,
      });
      const w1 = await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: items[1].id,
        position: 1,
      });
      const w2 = await repo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: items[2].id,
        position: 2,
      });

      // Reverse the order
      await repo.replaceAllPositions(player.id, [w2.id, w1.id, w0.id]);

      const reordered = await repo.findByLeaguePlayerId(player.id);
      assertEquals(reordered.length, 3);
      assertEquals(reordered[0].id, w2.id);
      assertEquals(reordered[0].position, 0);
      assertEquals(reordered[1].id, w1.id);
      assertEquals(reordered[1].position, 1);
      assertEquals(reordered[2].id, w0.id);
      assertEquals(reordered[2].position, 2);
    } finally {
      await cleanup(db, client, [userId]);
    }
  },
});
