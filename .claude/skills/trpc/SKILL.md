---
name: trpc
description: Call tRPC API endpoints directly from the CLI for debugging, troubleshooting, and inspecting server behavior. Also supports seeding fake data into the dev database. Use when the user asks to test, debug, call, or inspect tRPC procedures, or seed dev data.
---

# CLI Tool

The server CLI (`server/cli.ts`) is a subcommand dispatcher with two main
capabilities: calling tRPC procedures and seeding fake data.

## How to Run

From the project root:

```bash
cd server && deno task cli <command> [options]
```

Or with the root-level task shortcuts:

```bash
deno task trpc <command> [options]     # tRPC commands
```

## Commands

### tRPC (default)

Call tRPC API endpoints directly via `trpc-cli` for debugging and
troubleshooting.

```bash
deno task cli trpc <command> [options]
# or shorthand:
deno task trpc <command> [options]
```

#### Available tRPC Commands

```bash
deno task trpc health check
deno task trpc league list
deno task trpc league create --name "My League"
deno task trpc league get-by-id --id <uuid>
deno task trpc league list-players --league-id <uuid>
deno task trpc league join --invite-code <code>
deno task trpc league delete --id <uuid>
```

#### Discovering Commands

```bash
deno task trpc --help                    # List all top-level routers
deno task trpc <router> --help           # List procedures in a router
deno task trpc <router> <proc> --help    # Show input options for a procedure
```

### Seed

Generate and insert fake pseudo-data into the dev database.

#### Seed general data (users + leagues)

```bash
deno task cli seed data                          # 5 users, 2 leagues (defaults)
deno task cli seed data --users 10 --leagues 3   # custom counts
```

Creates fake users (with accounts and sessions), leagues, and populates leagues
with members. Each run is additive — new UUIDs every time.

#### Seed players into an existing league

```bash
deno task cli seed league --league-id <uuid>              # 4 players (default)
deno task cli seed league --league-id <uuid> --players 8  # custom count
```

Creates fake users and adds them as members to the specified league. Useful for
testing leagues with many participants locally.

#### Seed help

```bash
deno task cli seed --help
```

## Environment Variables

- `DATABASE_URL` — Postgres connection string (required, loaded from `.env`)

## Tips

- tRPC output is JSON — pipe to `jq` for filtering:
  `deno task trpc league list | jq '.[].name'`
- The tRPC CLI requires the CLI seed user (`cli@dev.local`). Run
  `deno task cli seed data` first if it doesn't exist.
- The CLI uses the same router, services, and repositories as the running server
  — it's a real call, not a mock
- New routers added to `appRouter` are automatically available as tRPC CLI
  subcommands
- Fake seeded users get `@fake.local` emails and Pokemon-themed names
