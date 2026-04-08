# Draftr

A real-time web app for drafting and trading Pokemon with friends. Create a
league, draft your team live, negotiate trades, and compete in challenge runs —
all scored by a configurable rules engine.

Built as a proof-of-concept for a larger "draft & trade anything" platform.

## Prerequisites

- [Deno](https://deno.land/) (v2+)
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Getting Started

1. **Start the database:**

   ```sh
   deno task db:start
   ```

   This launches a PostgreSQL 17 container via Docker Compose.

2. **Start the dev servers:**

   ```sh
   deno task dev
   ```

   This automatically creates a `.env` file from `.env.example` if one doesn't
   exist, then starts both the server and client in parallel.

   - Server: Deno backend with tRPC
   - Client: React frontend via Vite

3. **Stop the database** when you're done:

   ```sh
   deno task db:stop
   ```

## Available Tasks

| Task                | Description                                   |
| ------------------- | --------------------------------------------- |
| `deno task dev`     | Start both server and client in dev mode      |
| `deno task test`    | Run all tests (server + client)               |
| `deno task setup`   | Copy `.env.example` to `.env` (if not present)|
| `deno task db:start`| Start PostgreSQL via Docker Compose           |
| `deno task db:stop` | Stop PostgreSQL                               |

## Environment Variables

Configuration lives in `.env` (created automatically from `.env.example` on
first run). See `.env.example` for available variables.

## Status

Early development — see the
[technical proposal](./docs/decisions/001-initial-technical-proposal.md) for the
full vision and architecture.

## License

[MIT](./LICENSE)
