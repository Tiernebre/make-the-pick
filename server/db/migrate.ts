import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { logger } from "../logger.ts";

const log = logger.child({ module: "db.migrate" });

const connectionString = Deno.env.get("DATABASE_URL");
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

log.debug("connecting to database for migrations");
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

const migrationsFolder = new URL("./migrations", import.meta.url).pathname;
log.debug({ migrationsFolder }, "running migrations");
await migrate(db, { migrationsFolder });

log.info("migrations complete");
await client.end();
log.debug("migration connection closed");
