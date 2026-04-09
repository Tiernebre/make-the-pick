import type { Pokemon } from "@make-the-pick/shared";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../db/schema.ts";
import { logger } from "../../logger.ts";
import { generateFakeUsers } from "./generators.ts";

const log = logger.child({ module: "cli.seed.dev" });

const DEV_USER_ID = "dev-tiernebre";
const DEV_USER_EMAIL = "tiernebre@gmail.com";

const LEAGUE_STATUSES = ["setup", "drafting", "competing", "complete"] as const;

interface DevLeagueSpec {
  name: string;
  status: (typeof LEAGUE_STATUSES)[number];
  gameVersion?: string;
}

const LEAGUE_SPECS: DevLeagueSpec[] = [
  { name: "Setup League", status: "setup" },
  { name: "Drafting League", status: "drafting" },
  { name: "Competing League", status: "competing" },
  { name: "Complete League", status: "complete" },
  { name: "Pokemon Emerald League", status: "setup", gameVersion: "emerald" },
];

const ROUNDS = 6;
const PLAYERS_PER_LEAGUE = 4;

function createDb() {
  const connectionString = Deno.env.get("DATABASE_URL");
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });
  return { db, client };
}

type Db = ReturnType<typeof createDb>["db"];

async function ensureDevUser(db: Db) {
  const existing = await db.select().from(schema.user).where(
    eq(schema.user.email, DEV_USER_EMAIL),
  );

  if (existing.length > 0) {
    log.info({ email: DEV_USER_EMAIL }, "dev user already exists");
    return existing[0];
  }

  const now = new Date();
  const [user] = await db.insert(schema.user).values({
    id: DEV_USER_ID,
    name: "Brendan Tierney",
    email: DEV_USER_EMAIL,
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  await db.insert(schema.account).values({
    id: `${DEV_USER_ID}-account`,
    accountId: `${DEV_USER_ID}-google`,
    providerId: "google",
    userId: user.id,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();

  await db.insert(schema.session).values({
    id: `${DEV_USER_ID}-session`,
    token: `${DEV_USER_ID}-session-token`,
    expiresAt: new Date("2099-01-01"),
    createdAt: now,
    updatedAt: now,
    ipAddress: "127.0.0.1",
    userAgent: "DevSeed",
    userId: user.id,
  }).onConflictDoNothing();

  log.info({ email: DEV_USER_EMAIL }, "dev user created");
  return user;
}

async function ensureFakePlayers(db: Db, count: number) {
  const fakeUsers = generateFakeUsers(count);
  const inserted = await db.insert(schema.user).values(fakeUsers).returning();

  for (const u of inserted) {
    await db.insert(schema.account).values({
      id: `${u.id}-account`,
      accountId: `${u.id}-google`,
      providerId: "google",
      userId: u.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    await db.insert(schema.session).values({
      id: `${u.id}-session`,
      token: `${u.id}-session-token`,
      expiresAt: new Date("2099-01-01"),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: "127.0.0.1",
      userAgent: "DevSeed",
      userId: u.id,
    }).onConflictDoNothing();
  }

  log.info({ count: inserted.length }, "fake players created");
  return inserted;
}

function loadPokemonData(): Pokemon[] {
  const path = new URL(
    "../../../packages/shared/data/pokemon.json",
    import.meta.url,
  );
  const raw = Deno.readTextFileSync(path);
  return JSON.parse(raw) as Pokemon[];
}

async function createDraftPoolForLeague(
  db: Db,
  leagueId: string,
  playerCount: number,
) {
  const pokemonData = loadPokemonData();
  const poolSize = Math.min(ROUNDS * playerCount * 2, pokemonData.length);
  const selected = pokemonData.slice(0, poolSize);

  const [pool] = await db.insert(schema.draftPool).values({
    leagueId,
    name: "Draft Pool",
  }).returning();

  const poolItems = selected.map((pokemon) => ({
    draftPoolId: pool.id,
    name: pokemon.name,
    thumbnailUrl: pokemon.spriteUrl,
    metadata: {
      pokemonId: pokemon.id,
      types: pokemon.types,
      baseStats: pokemon.baseStats,
      generation: pokemon.generation,
    },
  }));

  await db.insert(schema.draftPoolItem).values(poolItems);

  log.info(
    { poolId: pool.id, itemCount: poolItems.length },
    "draft pool created",
  );
  return pool;
}

async function createDraftForLeague(
  db: Db,
  leagueId: string,
  poolId: string,
  playerIds: string[],
  status: "pending" | "in_progress" | "complete",
) {
  const now = new Date();
  const [insertedDraft] = await db.insert(schema.draft).values({
    leagueId,
    poolId,
    format: "snake",
    status,
    pickOrder: playerIds,
    currentPick: status === "complete" ? ROUNDS * playerIds.length : 0,
    startedAt: status !== "pending" ? now : null,
    completedAt: status === "complete" ? now : null,
  }).returning();

  log.info(
    { draftId: insertedDraft.id, status },
    "draft created",
  );
  return insertedDraft;
}

async function createWatchlistForCommissioner(
  db: Db,
  leagueId: string,
  userId: string,
  poolId: string,
) {
  const [player] = await db.select().from(schema.leaguePlayer).where(
    eq(schema.leaguePlayer.leagueId, leagueId),
  ).then((rows) => rows.filter((r) => r.userId === userId));

  if (!player) return;

  const poolItems = await db.select().from(schema.draftPoolItem).where(
    eq(schema.draftPoolItem.draftPoolId, poolId),
  ).limit(5);

  for (let i = 0; i < poolItems.length; i++) {
    await db.insert(schema.watchlistItem).values({
      leaguePlayerId: player.id,
      draftPoolItemId: poolItems[i].id,
      position: i,
    }).onConflictDoNothing();
  }

  log.info(
    { leagueId, count: poolItems.length },
    "watchlist items created for dev user",
  );
}

async function seedLeague(
  db: Db,
  spec: DevLeagueSpec,
  commissioner: { id: string },
  members: { id: string }[],
) {
  const rulesConfig = {
    draftFormat: "snake" as const,
    numberOfRounds: ROUNDS,
    pickTimeLimitSeconds: 120,
    poolSizeMultiplier: 2,
    ...(spec.gameVersion ? { gameVersion: spec.gameVersion } : {}),
  };

  const [league] = await db.insert(schema.league).values({
    name: spec.name,
    status: spec.status,
    sportType: "pokemon",
    rulesConfig,
    maxPlayers: PLAYERS_PER_LEAGUE,
    inviteCode: `DEV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    createdBy: commissioner.id,
  }).returning();

  // Add commissioner
  await db.insert(schema.leaguePlayer).values({
    leagueId: league.id,
    userId: commissioner.id,
    role: "commissioner",
  });

  // Add members (fill up to PLAYERS_PER_LEAGUE - 1)
  const membersToAdd = members.slice(0, PLAYERS_PER_LEAGUE - 1);
  for (const member of membersToAdd) {
    await db.insert(schema.leaguePlayer).values({
      leagueId: league.id,
      userId: member.id,
      role: "member",
    });
  }

  const allPlayerIds = [
    commissioner.id,
    ...membersToAdd.map((m) => m.id),
  ];

  // Create backing data based on status
  if (spec.status !== "setup") {
    const pool = await createDraftPoolForLeague(
      db,
      league.id,
      allPlayerIds.length,
    );

    const draftStatus = spec.status === "drafting" ? "in_progress" : "complete";
    await createDraftForLeague(
      db,
      league.id,
      pool.id,
      allPlayerIds,
      draftStatus,
    );

    // Add watchlist items for the dev user
    await createWatchlistForCommissioner(db, league.id, commissioner.id, pool.id);
  }

  log.info(
    { name: league.name, status: league.status, id: league.id },
    "league seeded",
  );
  return league;
}

export async function seedDev() {
  const { db, client } = createDb();

  try {
    const devUser = await ensureDevUser(db);
    const fakePlayers = await ensureFakePlayers(db, PLAYERS_PER_LEAGUE - 1);

    for (const spec of LEAGUE_SPECS) {
      await seedLeague(db, spec, devUser, fakePlayers);
    }

    log.info("dev seed complete");
  } finally {
    await client.end();
  }
}
