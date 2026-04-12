# [Make The Pick](https://makethepick.gg/)

A real-time web app for drafting Pokemon with friends. Create a league, invite
players, draft your team live with snake-draft ordering, manage watchlists, and
track picks in real time via WebSockets.

Built as a proof-of-concept for a larger "draft & trade anything" platform.

## Features

- **Leagues** — Create leagues, invite players via invite codes, and manage the
  league lifecycle (setup, drafting, competing, complete). Commissioners control
  league transitions.
- **Real-time drafts** — Snake-draft format with live pick notifications over
  WebSockets. Configurable pick time limits and round counts.
- **Species drafting** — Optional mode where the draft unit is an entire
  evolution line rather than individual Pokemon.
- **Watchlists** — Personal, reorderable watchlists for scouting the draft pool.
- **Pool item notes** — Private annotations on any pool item for draft prep.
- **NPC players** — Bot players that auto-pick during drafts for testing or
  filling out leagues.
- **Commissioner controls** — Override picks, force auto-picks, and manage
  league settings.
- **Draft pool generation** — Pools generated from PokeAPI data, filterable by
  game version and catch rate.

## Tech Stack

| Layer     | Technology                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------- |
| Runtime   | [Deno](https://deno.land/) 2.x                                                                          |
| Server    | [Hono](https://hono.dev/) + [tRPC](https://trpc.io/)                                                    |
| Client    | [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [Mantine](https://mantine.dev/)             |
| Database  | [PostgreSQL](https://www.postgresql.org/) 17 + [Drizzle ORM](https://orm.drizzle.team/)                 |
| Auth      | [Better Auth](https://www.better-auth.com/) (Google OAuth)                                              |
| Real-time | Native Deno WebSockets                                                                                  |
| Testing   | Deno test (server), [Vitest](https://vitest.dev/) (client), [Playwright](https://playwright.dev/) (E2E) |
| Deploy    | Docker, GitHub Actions, DigitalOcean                                                                    |

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

| Task                                | Description                                    |
| ----------------------------------- | ---------------------------------------------- |
| `deno task dev`                     | Start both server and client in dev mode       |
| `deno task test`                    | Run all tests (server + client)                |
| `deno task test:server`             | Run server tests only                          |
| `deno task test:client`             | Run client tests only                          |
| `deno task test:e2e`                | Run Playwright end-to-end tests                |
| `deno task setup`                   | Copy `.env.example` to `.env` and install deps |
| `deno task build`                   | Build the client for production                |
| `deno task start`                   | Start the server in production mode            |
| `deno task db:start`                | Start PostgreSQL via Docker Compose            |
| `deno task db:stop`                 | Stop PostgreSQL                                |
| `deno task db:generate`             | Generate Drizzle ORM migrations                |
| `deno task db:migrate`              | Run database migrations                        |
| `deno task sync:pokemon`            | Sync Pokemon data from PokeAPI                 |
| `deno task sync:pokemon-encounters` | Sync encounter data from PokeAPI               |
| `deno task sync:pokemon-evolutions` | Sync evolution data from PokeAPI               |

## Project Structure

```
make-the-pick/
├── server/
│   ├── main.ts               # Hono app entry point
│   ├── db/
│   │   ├── schema.ts         # All Drizzle table definitions
│   │   └── migrations/       # Drizzle migration journal
│   ├── features/             # Domain modules (router → service → repository)
│   │   ├── league/
│   │   ├── draft/
│   │   ├── draft-pool/
│   │   ├── watchlist/
│   │   ├── pool-item-note/
│   │   └── user/
│   ├── trpc/                 # tRPC initialization and router
│   └── ws/                   # WebSocket handlers
├── client/
│   └── src/
│       ├── features/         # Feature-organized components and hooks
│       │   ├── league/
│       │   ├── draft/
│       │   └── pokemon-version/
│       ├── components/       # Shared components
│       └── hooks/            # Shared hooks
├── packages/shared/          # Zod schemas shared between client and server
├── e2e/                      # Playwright end-to-end tests
├── scripts/                  # Data sync scripts (PokeAPI)
└── docs/                     # Domain docs, ADRs, and product roadmap
```

## E2E Tests

End-to-end tests use [Playwright](https://playwright.dev/) and run the full app
in production mode against a separate database.

### Running tests

Make sure PostgreSQL is running (`deno task db:start`), then:

```sh
deno task test:e2e
```

That's it. On first run, Playwright's global setup automatically creates the
`make_the_pick_e2e` database and runs migrations. Subsequent runs reuse the
database and only apply new migrations.

You'll need Playwright browsers installed once:

```sh
cd e2e && npx playwright install chromium
```

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

## License

[MIT](./LICENSE)
