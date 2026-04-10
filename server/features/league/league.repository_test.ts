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

const defaultSettings = {
  sportType: "pokemon" as const,
  maxPlayers: 8,
  rulesConfig: {
    draftFormat: "snake",
    numberOfRounds: 6,
    pickTimeLimitSeconds: null,
    poolSizeMultiplier: 2,
  },
};

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
  name:
    "leagueRepository.createWithCommissioner: creates league and commissioner player",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);

      const result = await repo.createWithCommissioner(userId, {
        name: "Test League",
        inviteCode: "TESTCODE",
        ...defaultSettings,
      });

      assertEquals(result.name, "Test League");
      assertEquals(result.inviteCode, "TESTCODE");
      assertEquals(result.createdBy, userId);
      assertEquals(result.status, "setup");
      assertEquals(result.sportType, "pokemon");
      assertEquals(result.maxPlayers, 8);
      assertEquals(result.rulesConfig, defaultSettings.rulesConfig);

      const players = await db.select().from(leaguePlayer).where(
        eq(leaguePlayer.leagueId, result.id),
      );
      assertEquals(players.length, 1);
      assertEquals(players[0].userId, userId);
      assertEquals(players[0].role, "commissioner");
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
      const created = await repo.createWithCommissioner(userId, {
        name: "Find Me",
        inviteCode: "FINDME01",
        ...defaultSettings,
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
      const created = await repo.createWithCommissioner(userId, {
        name: "Invite League",
        inviteCode: "INVITE01",
        ...defaultSettings,
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
      const created = await repo.createWithCommissioner(creatorId, {
        name: "Join League",
        inviteCode: "JOIN0001",
        ...defaultSettings,
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
      const created = await repo.createWithCommissioner(userId, {
        name: "Player League",
        inviteCode: "PLAYER01",
        ...defaultSettings,
      });

      const player = await repo.findPlayer(created.id, userId);
      assertEquals(player?.userId, userId);
      assertEquals(player?.role, "commissioner");
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
      const created = await repo.createWithCommissioner(userId, {
        name: "No Member League",
        inviteCode: "NOMEMB01",
        ...defaultSettings,
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
  name: "leagueRepository.deleteById: deletes a league and cascades to players",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const created = await repo.createWithCommissioner(userId, {
        name: "Delete Me",
        inviteCode: "DELETE01",
        ...defaultSettings,
      });

      await repo.deleteById(created.id);

      const found = await repo.findById(created.id);
      assertEquals(found, null);

      const players = await db.select().from(leaguePlayer).where(
        eq(leaguePlayer.leagueId, created.id),
      );
      assertEquals(players.length, 0);
    } finally {
      await db.delete(leaguePlayer);
      await db.delete(league);
      await db.delete(user).where(eq(user.id, userId));
      await client.end();
    }
  },
});

Deno.test({
  name:
    "leagueRepository.findPlayersByLeagueId: returns players with user info",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const creatorId = crypto.randomUUID();
    const memberId = crypto.randomUUID();

    try {
      await createTestUser(db, creatorId);
      await db.insert(user).values({
        id: memberId,
        name: "Member User",
        email: `${memberId}@test.com`,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const created = await repo.createWithCommissioner(creatorId, {
        name: "Players League",
        inviteCode: "PLAYERS1",
        ...defaultSettings,
      });
      await repo.addPlayer(created.id, memberId);

      const players = await repo.findPlayersByLeagueId(created.id);
      assertEquals(players.length, 2);

      const creator = players.find((p) => p.userId === creatorId);
      const member = players.find((p) => p.userId === memberId);

      assertEquals(creator?.role, "commissioner");
      assertEquals(creator?.name, "Test User");
      assertEquals(creator?.image, null);
      assertEquals(member?.role, "member");
      assertEquals(member?.name, "Member User");
      assertEquals(member?.image, null);

      for (const p of players) {
        assertEquals(typeof p.id, "string");
        assertEquals(typeof p.joinedAt, "object");
      }
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
  name:
    "leagueRepository.updateSettings: updates sport_type, max_players, and rules_config",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      const created = await repo.createWithCommissioner(userId, {
        name: "Settings League",
        inviteCode: "STTNG001",
        ...defaultSettings,
      });

      const rulesConfig = {
        draftFormat: "snake",
        numberOfRounds: 10,
        pickTimeLimitSeconds: null,
      };

      const updated = await repo.updateSettings(created.id, {
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig,
      });

      assertEquals(updated.sportType, "pokemon");
      assertEquals(updated.maxPlayers, 8);
      assertEquals(updated.rulesConfig, rulesConfig);

      // Verify persistence by reading back
      const found = await repo.findById(created.id);
      assertEquals(found?.sportType, "pokemon");
      assertEquals(found?.maxPlayers, 8);
      assertEquals(found?.rulesConfig, rulesConfig);
    } finally {
      await db.delete(leaguePlayer);
      await db.delete(league);
      await db.delete(user).where(eq(user.id, userId));
      await client.end();
    }
  },
});

Deno.test({
  name:
    "leagueRepository.countPlayers: returns the number of players in a league",
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
      const created = await repo.createWithCommissioner(creatorId, {
        name: "Count League",
        inviteCode: "COUNT001",
        ...defaultSettings,
      });

      // Commissioner is already one player
      let playerCount = await repo.countPlayers(created.id);
      assertEquals(playerCount, 1);

      await repo.addPlayer(created.id, memberId);
      playerCount = await repo.countPlayers(created.id);
      assertEquals(playerCount, 2);
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
  name: "leagueRepository.deletePlayer: removes a player from a league",
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
      const created = await repo.createWithCommissioner(creatorId, {
        name: "Remove Player League",
        inviteCode: "REMOVE01",
        ...defaultSettings,
      });
      await repo.addPlayer(created.id, memberId);

      const before = await repo.findPlayer(created.id, memberId);
      assertEquals(before?.userId, memberId);

      await repo.deletePlayer(created.id, memberId);

      const after = await repo.findPlayer(created.id, memberId);
      assertEquals(after, null);

      // Commissioner still exists
      const commissioner = await repo.findPlayer(created.id, creatorId);
      assertEquals(commissioner?.role, "commissioner");
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
  name: "leagueRepository.findAllByUserId: returns leagues the user belongs to",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { db, client } = createTestDb();
    const repo = createLeagueRepository(db);
    const userId = crypto.randomUUID();

    try {
      await createTestUser(db, userId);
      await repo.createWithCommissioner(userId, {
        name: "League A",
        inviteCode: "USRLGA01",
        ...defaultSettings,
      });
      await repo.createWithCommissioner(userId, {
        name: "League B",
        inviteCode: "USRLGB01",
        ...defaultSettings,
      });

      const leagues = await repo.findAllByUserId(userId);
      assertEquals(leagues.length, 2);

      for (const l of leagues) {
        assertEquals(typeof l.id, "string");
        assertEquals(typeof l.name, "string");
        assertEquals(typeof l.status, "string");
        assertEquals(typeof l.inviteCode, "string");
      }
    } finally {
      await db.delete(leaguePlayer);
      await db.delete(league);
      await db.delete(user).where(eq(user.id, userId));
      await client.end();
    }
  },
});
