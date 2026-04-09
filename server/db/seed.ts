import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { logger } from "../logger.ts";
import * as schema from "./schema.ts";

const log = logger.child({ module: "db.seed" });

const connectionString = Deno.env.get("DATABASE_URL");
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

const now = new Date();

const users = [
  {
    id: "dev-user-1",
    name: "Alice Johnson",
    email: "alice@dev.local",
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "dev-user-2",
    name: "Bob Smith",
    email: "bob@dev.local",
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "dev-user-3",
    name: "Charlie Davis",
    email: "charlie@dev.local",
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  },
];

const accounts = users.map((user) => ({
  id: `${user.id}-account`,
  accountId: `${user.id}-google`,
  providerId: "google",
  userId: user.id,
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  scope: null,
  password: null,
  createdAt: now,
  updatedAt: now,
}));

const sessions = users.map((user) => ({
  id: `${user.id}-session`,
  token: `${user.id}-session-token`,
  expiresAt: new Date("2099-01-01"),
  createdAt: now,
  updatedAt: now,
  ipAddress: "127.0.0.1",
  userAgent: "DevSeed",
  userId: user.id,
}));

const leagues = [
  {
    id: "a1b2c3d4-0001-4000-8000-000000000001",
    name: "Pokemon Draft League Alpha",
    status: "setup" as const,
    rulesConfig: null,
    inviteCode: "ALPHA-INVITE",
    createdBy: users[0].id,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000002",
    name: "Competitive Picks Beta",
    status: "setup" as const,
    rulesConfig: null,
    inviteCode: "BETA-INVITE",
    createdBy: users[1].id,
    createdAt: now,
    updatedAt: now,
  },
];

const leaguePlayers = [
  // League 1: Alice (creator) + Bob and Charlie as members
  {
    id: "b2c3d4e5-0001-4000-8000-000000000001",
    leagueId: leagues[0].id,
    userId: users[0].id,
    role: "creator" as const,
    joinedAt: now,
  },
  {
    id: "b2c3d4e5-0001-4000-8000-000000000002",
    leagueId: leagues[0].id,
    userId: users[1].id,
    role: "member" as const,
    joinedAt: now,
  },
  {
    id: "b2c3d4e5-0001-4000-8000-000000000003",
    leagueId: leagues[0].id,
    userId: users[2].id,
    role: "member" as const,
    joinedAt: now,
  },
  // League 2: Bob (creator) + Alice as member
  {
    id: "b2c3d4e5-0001-4000-8000-000000000004",
    leagueId: leagues[1].id,
    userId: users[1].id,
    role: "creator" as const,
    joinedAt: now,
  },
  {
    id: "b2c3d4e5-0001-4000-8000-000000000005",
    leagueId: leagues[1].id,
    userId: users[0].id,
    role: "member" as const,
    joinedAt: now,
  },
];

log.info("seeding dev database...");

await db.insert(schema.user).values(users).onConflictDoNothing();
log.info({ count: users.length }, "users seeded");

await db.insert(schema.account).values(accounts).onConflictDoNothing();
log.info({ count: accounts.length }, "accounts seeded");

await db.insert(schema.session).values(sessions).onConflictDoNothing();
log.info({ count: sessions.length }, "sessions seeded");

await db.insert(schema.league).values(leagues).onConflictDoNothing();
log.info({ count: leagues.length }, "leagues seeded");

await db.insert(schema.leaguePlayer).values(leaguePlayers)
  .onConflictDoNothing();
log.info({ count: leaguePlayers.length }, "league players seeded");

for (const league of leagues) {
  log.info(
    { name: league.name, inviteCode: league.inviteCode },
    "league invite code",
  );
}

log.info("dev database seeding complete");
await client.end();
