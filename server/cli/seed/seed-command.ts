import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../db/schema.ts";
import { logger } from "../../logger.ts";
import {
  CLI_USER_EMAIL,
  generateCliUser,
  generateFakeLeague,
  generateFakeUsers,
} from "./generators.ts";

const log = logger.child({ module: "cli.seed" });

interface SeedOptions {
  users: number;
  leagues: number;
}

interface SeedLeagueOptions {
  leagueId: string;
  players: number;
}

export function parseArgs(
  args: string[],
): { command: string; options: SeedOptions | SeedLeagueOptions | null } {
  const subcommand = args[0] ?? "data";

  if (subcommand === "league") {
    let leagueId = "";
    let players = 4;

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--league-id" && args[i + 1]) {
        leagueId = args[i + 1];
        i++;
      } else if (args[i] === "--players" && args[i + 1]) {
        players = parseInt(args[i + 1], 10);
        i++;
      }
    }

    if (!leagueId) {
      throw new Error("--league-id is required for seed league");
    }

    return { command: "league", options: { leagueId, players } };
  }

  let users = 5;
  let leagues = 2;

  for (let i = subcommand === "data" ? 1 : 0; i < args.length; i++) {
    if (args[i] === "--users" && args[i + 1]) {
      users = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--leagues" && args[i + 1]) {
      leagues = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { command: "data", options: { users, leagues } };
}

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

async function seedAccountAndSession(db: Db, userId: string) {
  await db.insert(schema.account).values({
    id: `${userId}-account`,
    accountId: `${userId}-google`,
    providerId: "google",
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoNothing();

  await db.insert(schema.session).values({
    id: `${userId}-session`,
    token: `${userId}-session-token`,
    expiresAt: new Date("2099-01-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: "127.0.0.1",
    userAgent: "FakeSeed",
    userId,
  }).onConflictDoNothing();
}

async function seedData(options: SeedOptions) {
  const { db, client } = createDb();

  try {
    // Always ensure the CLI user exists (used by tRPC CLI)
    const cliUser = generateCliUser();
    await db.insert(schema.user).values(cliUser).onConflictDoNothing();
    await seedAccountAndSession(db, cliUser.id);
    log.info(
      { name: cliUser.name, email: CLI_USER_EMAIL },
      "CLI user seeded",
    );

    const fakeUsers = generateFakeUsers(options.users);

    const insertedUsers = await db.insert(schema.user).values(fakeUsers)
      .returning();
    log.info({ count: insertedUsers.length }, "fake users created");

    const allUsers = [cliUser, ...insertedUsers];

    for (const u of insertedUsers) {
      await seedAccountAndSession(db, u.id);
    }
    log.info({ count: insertedUsers.length }, "accounts and sessions created");

    for (let i = 0; i < options.leagues; i++) {
      const creator = allUsers[i % allUsers.length];
      const fakeLeague = generateFakeLeague(creator.id);

      const [insertedLeague] = await db.insert(schema.league).values(fakeLeague)
        .returning();
      log.info(
        { name: insertedLeague.name, inviteCode: insertedLeague.inviteCode },
        "league created",
      );

      await db.insert(schema.leaguePlayer).values({
        leagueId: insertedLeague.id,
        userId: creator.id,
        role: "commissioner",
      }).onConflictDoNothing();

      const otherUsers = allUsers.filter((u) => u.id !== creator.id);
      const membersToAdd = otherUsers.slice(
        0,
        Math.min(otherUsers.length, (fakeLeague.maxPlayers ?? 8) - 1),
      );

      for (const member of membersToAdd) {
        await db.insert(schema.leaguePlayer).values({
          leagueId: insertedLeague.id,
          userId: member.id,
          role: "member",
        }).onConflictDoNothing();
      }

      log.info(
        { count: membersToAdd.length + 1 },
        "league players added",
      );
    }

    log.info("seed data complete");
  } finally {
    await client.end();
  }
}

async function seedLeague(options: SeedLeagueOptions) {
  const { db, client } = createDb();

  try {
    const [targetLeague] = await db.select().from(schema.league).where(
      eq(schema.league.id, options.leagueId),
    );

    if (!targetLeague) {
      const allLeagues = await db.select().from(schema.league);
      console.error(`Error: League with id "${options.leagueId}" not found.`);
      console.error("Available leagues:");
      for (const l of allLeagues) {
        console.error(`  ${l.id} — ${l.name}`);
      }
      Deno.exit(1);
    }

    const fakeUsers = generateFakeUsers(options.players);

    const insertedUsers = await db.insert(schema.user).values(fakeUsers)
      .returning();
    log.info({ count: insertedUsers.length }, "fake users created");

    for (const u of insertedUsers) {
      await seedAccountAndSession(db, u.id);
    }

    for (const u of insertedUsers) {
      await db.insert(schema.leaguePlayer).values({
        leagueId: targetLeague.id,
        userId: u.id,
        role: "member",
      }).onConflictDoNothing();
    }

    log.info(
      {
        league: targetLeague.name,
        playersAdded: insertedUsers.length,
      },
      "players seeded into league",
    );
  } finally {
    await client.end();
  }
}

export async function runSeedCommand(args: string[]) {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    return;
  }

  const { command, options } = parseArgs(args);

  if (command === "league") {
    await seedLeague(options as SeedLeagueOptions);
  } else {
    await seedData(options as SeedOptions);
  }
}

function printHelp() {
  console.log(`
Usage: deno task cli seed <subcommand> [options]

Subcommands:
  data      Seed the CLI user, fake users, and leagues (default)
  league    Seed fake players into an existing league

The 'data' subcommand always creates the CLI user (cli@dev.local) used by
the tRPC CLI, plus additional fake users with randomized Pokemon-themed names.

Options for 'data':
  --users <n>       Number of additional fake users to create (default: 5)
  --leagues <n>     Number of fake leagues to create (default: 2)

Options for 'league':
  --league-id <id>  ID of the league to add players to (required)
  --players <n>     Number of fake players to add (default: 4)

Examples:
  deno task cli seed data
  deno task cli seed data --users 10 --leagues 3
  deno task cli seed league --league-id abc-123 --players 8
`);
}
