# [Make The Pick](https://makethepick.gg/)

A real-time web app for drafting and trading Pokemon with friends. Create a
league, draft your team live, negotiate trades, and compete in challenge runs —
all scored by a configurable rules engine.

Built as a proof-of-concept for a larger "draft & trade anything" platform.

## Prerequisites

- [Deno](https://deno.land/) (v2+)
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Getting Started

1. **Start everything:**

   ```sh
   deno task dev
   ```

   This single command handles the full setup:
   - Creates `.env` from `.env.example` (if not present)
   - Installs dependencies (`deno install`)
   - Starts PostgreSQL via Docker Compose
   - Launches the server (Deno + tRPC) and client (React + Vite) in parallel

2. **Stop the database** when you're done:

   ```sh
   deno task db:stop
   ```

## Available Tasks

| Task                     | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `deno task dev`          | Start both server and client in dev mode       |
| `deno task test`         | Run all tests (server + client)                |
| `deno task setup`        | Copy `.env.example` to `.env` and install deps |
| `deno task build`        | Build the client for production                |
| `deno task start`        | Start the server in production mode            |
| `deno task db:start`     | Start PostgreSQL via Docker Compose            |
| `deno task db:stop`      | Stop PostgreSQL                                |
| `deno task db:generate`  | Generate Drizzle ORM migrations                |
| `deno task db:migrate`   | Run database migrations                        |
| `deno task sync:pokemon` | Sync Pokemon data from PokeAPI                 |
| `deno task test:e2e`     | Run Playwright end-to-end tests                |

## E2E Tests

End-to-end tests use [Playwright](https://playwright.dev/) and run the full app
in production mode against a separate database.

### First-time setup

1. **Create the E2E database.** If you started Docker before the init script was
   added, run this once:

   ```sh
   docker exec make-the-pick-postgres-1 psql -U make_the_pick \
     -c "CREATE DATABASE make_the_pick_e2e OWNER make_the_pick;"
   ```

   New Docker volumes pick this up automatically via `scripts/init-e2e-db.sql`.

2. **Run migrations** against the E2E database:

   ```sh
   DATABASE_URL="postgres://make_the_pick:make_the_pick@localhost:5432/make_the_pick_e2e" \
     deno task db:migrate
   ```

3. **Install Playwright browsers** (Chromium only):

   ```sh
   cd e2e && npx playwright install chromium
   ```

### Running tests

```sh
DATABASE_URL_E2E="postgres://make_the_pick:make_the_pick@localhost:5432/make_the_pick_e2e" \
  deno task test:e2e
```

Playwright will build the client, start the server on port 3000, run the tests,
and tear everything down. If the server is already running on port 3000, it
reuses it (skipped in CI).

### How it works

- The app boots in **production mode** — Vite builds the client, Hono serves it
  as static files alongside the API on port 3000.
- Auth is handled by **seeding user and session rows directly into the E2E
  database** and injecting the session cookie into the browser context. No
  server-side auth bypass — this is the same mechanism Google OAuth produces at
  the end of a real login.
- The E2E database is **truncated between test suites** to keep tests isolated.

### In CI

The `e2e` job in `.github/workflows/ci.yml` runs after unit and integration
tests pass. It spins up its own Postgres service, installs Chromium, runs
migrations, and executes the tests. On failure, the Playwright HTML report is
uploaded as a build artifact.

## Environment Variables

Configuration lives in `.env` (created automatically from `.env.example` on
first run). Key variables:

| Variable                      | Description                             |
| ----------------------------- | --------------------------------------- |
| `DATABASE_URL`                | PostgreSQL connection string            |
| `BETTER_AUTH_SECRET`          | Secret for Better Auth sessions         |
| `BETTER_AUTH_URL`             | App URL for auth callbacks              |
| `GOOGLE_CLIENT_ID`            | Google OAuth client ID                  |
| `GOOGLE_CLIENT_SECRET`        | Google OAuth client secret              |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated list of trusted origins |

## Status

Early development — see the
[technical proposal](./docs/decisions/001-initial-technical-proposal.md) for the
full vision and architecture.

## License

[MIT](./LICENSE)
