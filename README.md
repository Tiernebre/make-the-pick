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
