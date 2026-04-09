---
name: trpc
description: Call tRPC API endpoints directly from the CLI for debugging, troubleshooting, and inspecting server behavior. Use when the user asks to test, debug, call, or inspect tRPC procedures.
---

# tRPC CLI Skill

Call tRPC API endpoints directly via `trpc-cli` for debugging and
troubleshooting.

## How to Run

From the `server/` directory:

```bash
cd server && DATABASE_URL=postgres://make_the_pick:make_the_pick@localhost:5432/make_the_pick \
  TRPC_CLI_USER_EMAIL=tiernebre@gmail.com \
  deno task trpc <command> [options]
```

Or directly:

```bash
cd server && DATABASE_URL=postgres://make_the_pick:make_the_pick@localhost:5432/make_the_pick \
  TRPC_CLI_USER_EMAIL=tiernebre@gmail.com \
  DENO_ENV=production \
  deno run --allow-net --allow-env --allow-read --allow-sys cli.ts <command> [options]
```

## Environment Variables

- `DATABASE_URL` — Postgres connection string (required)
- `TRPC_CLI_USER_EMAIL` — Email of the user to authenticate as (required).
  Default: `tiernebre@gmail.com`

## Available Commands

### Health

```bash
deno task trpc health check
```

### League

```bash
deno task trpc league list
deno task trpc league create --name "My League"
deno task trpc league get-by-id --id <uuid>
deno task trpc league list-players --league-id <uuid>
deno task trpc league join --invite-code <code>
deno task trpc league delete --id <uuid>
```

## Discovering Commands

```bash
deno task trpc --help                # List all top-level routers
deno task trpc <router> --help       # List procedures in a router
deno task trpc <router> <proc> --help  # Show input options for a procedure
```

## Tips

- Output is JSON — pipe to `jq` for filtering:
  `deno task trpc league list | jq '.[].name'`
- To act as a different user, change `TRPC_CLI_USER_EMAIL` to another email in
  the database
- The CLI uses the same router, services, and repositories as the running server
  — it's a real call, not a mock
- New routers added to `appRouter` are automatically available as CLI
  subcommands
