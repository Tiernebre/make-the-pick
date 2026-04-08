/**
 * E2E test setup script — run via Deno before Playwright.
 *
 * Creates the E2E database (if missing) and runs migrations.
 * Invoked automatically by `deno task test:e2e`.
 */
import postgres from "postgres";

const E2E_DB = "make_the_pick_e2e";
const ADMIN_URL =
  "postgres://make_the_pick:make_the_pick@localhost:5432/postgres";
const E2E_URL = Deno.env.get("DATABASE_URL_E2E") ??
  `postgres://make_the_pick:make_the_pick@localhost:5432/${E2E_DB}`;

// 1. Create the E2E database if it doesn't exist
const admin = postgres(ADMIN_URL);
const existing =
  await admin`SELECT 1 FROM pg_database WHERE datname = ${E2E_DB}`;
if (existing.length === 0) {
  await admin.unsafe(`CREATE DATABASE ${E2E_DB} OWNER make_the_pick`);
  console.log(`Created database "${E2E_DB}".`);
}
await admin.end();

// 2. Run Drizzle migrations against the E2E database
const migrate = new Deno.Command("deno", {
  args: ["run", "--allow-net", "--allow-env", "--allow-read", "db/migrate.ts"],
  cwd: new URL("../server", import.meta.url).pathname,
  env: { DATABASE_URL: E2E_URL },
  stdout: "inherit",
  stderr: "inherit",
});
const { code } = await migrate.output();
if (code !== 0) {
  Deno.exit(code);
}
