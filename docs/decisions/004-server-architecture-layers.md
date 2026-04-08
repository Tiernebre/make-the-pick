# ADR-004: Server Architecture Layers and Coding Conventions

## Status

Accepted (2026-04-08)

## Context

The project is about to move from scaffolding into real feature work (Leagues,
drafting, scoring). Today the server is deliberately flat:

- tRPC procedures contain business logic and database queries inline
- There is no service or repository layer
- The only modules are structural (`db/`, `trpc/`, `auth/`, `ws/`)
- Some logic is duplicated (REST `/api/health` and tRPC `health.check`)

This worked fine for bootstrapping, but as features grow we need a shared
understanding of **where code goes** so that:

1. Business rules are testable without HTTP or database concerns
2. Features are discoverable — a new contributor can find league logic quickly
3. The codebase stays consistent across features built by different sessions

### Current flow

```
Request → Hono → tRPC procedure → Drizzle query → Response
```

Everything lives in the procedure. There's nowhere to put business logic that
isn't a direct query-and-return.

## Decision

Adopt a **three-layer architecture** organized by **feature domain**, not by
technical layer.

### The three layers

| Layer                       | Responsibility                                            | May depend on              | Tested with                   |
| --------------------------- | --------------------------------------------------------- | -------------------------- | ----------------------------- |
| **Router** (tRPC procedure) | Input validation, auth gate, call service, shape response | Service                    | Integration tests (real HTTP) |
| **Service**                 | Business rules, orchestration, domain logic               | Repository, other Services | Unit tests (injected deps)    |
| **Repository**              | Data access — single table or closely related tables      | Drizzle, DB schema         | Integration tests (real DB)   |

### Organizing by feature domain

Group files by domain, not by layer:

```
server/
├── main.ts                     # HTTP wiring (thin, no logic)
├── trpc/
│   ├── trpc.ts                 # tRPC init, procedure/protectedProcedure
│   ├── context.ts              # Per-request context factory
│   └── router.ts               # Merges all feature routers
├── db/
│   ├── schema.ts               # ALL Drizzle table definitions (single file)
│   ├── connection.ts           # DB singleton
│   └── migrations/
├── auth/
│   └── auth.ts                 # better-auth config
├── features/
│   ├── health/
│   │   ├── health.router.ts    # tRPC router for health endpoints
│   │   ├── health.service.ts   # Business logic (if any)
│   │   └── health.repository.ts
│   ├── league/
│   │   ├── league.router.ts
│   │   ├── league.service.ts
│   │   ├── league.service_test.ts
│   │   ├── league.repository.ts
│   │   └── league.repository_test.ts
│   └── draft/
│       ├── draft.router.ts
│       ├── draft.service.ts
│       └── draft.repository.ts
└── ws/
    └── ...                     # WebSocket handlers (separate concern)
```

### Layer rules

**Router (procedure) — thin and boring**

- Selects `procedure` or `protectedProcedure`
- Declares `.input()` and `.output()` Zod schemas (from `@make-the-pick/shared`)
- Calls one service method
- Returns the result — no data transformation beyond what tRPC output validation
  handles
- **No business logic, no direct Drizzle calls**

```ts
// features/league/league.router.ts
export const leagueRouter = router({
  create: protectedProcedure
    .input(createLeagueSchema)
    .output(leagueSchema)
    .mutation(({ ctx, input }) => {
      return leagueService.create(ctx.user.id, input);
    }),
});
```

**Service — where the interesting code lives**

- Contains business rules, validation beyond schema shape, orchestration
- Receives primitives or plain objects — never `ctx` directly
- May call multiple repositories or other services
- **No Drizzle imports, no SQL, no `db` reference**
- Stateless — all state comes through function arguments
- Dependencies injected via constructor or factory function

```ts
// features/league/league.service.ts
export function createLeagueService(deps: { leagueRepo: LeagueRepository }) {
  return {
    async create(userId: string, input: CreateLeagueInput) {
      const inviteCode = generateInviteCode();
      return deps.leagueRepo.createWithCreator(userId, {
        ...input,
        inviteCode,
      });
    },
  };
}
```

**Repository — data access only**

- Wraps Drizzle queries for a single domain (one or a few related tables)
- Returns plain objects or Drizzle row types — no domain transformations
- May encapsulate complex joins or transactions
- **No business logic — if you're writing an `if` statement, it probably belongs
  in the service**

```ts
// features/league/league.repository.ts
export function createLeagueRepository(db: Database) {
  return {
    async createWithCreator(userId: string, data: NewLeague) {
      return db.transaction(async (tx) => {
        const [league] = await tx.insert(leagues).values(data).returning();
        await tx.insert(leaguePlayers).values({
          leagueId: league.id,
          userId,
          role: "creator",
        });
        return league;
      });
    },
  };
}
```

### Dependency injection approach

Use **factory functions** (not classes, not a DI container). Each service/repo
exports a `createXxx` function that accepts its dependencies and returns an
object of methods.

Wire everything together at startup in a single composition root — a
`server/features/mod.ts` or similar file that instantiates repos, passes them
into services, and exports the assembled feature routers.

### Shared package role

`@make-the-pick/shared` continues to own:

- Zod schemas for API inputs and outputs
- Inferred TypeScript types
- Shared constants and enums

It does **not** contain business logic or server-side types (like Drizzle row
types).

### Conventions

- **File naming**: `<domain>.<layer>.ts` — e.g. `league.service.ts`,
  `league.repository.ts`
- **Test naming**: `<domain>.<layer>_test.ts` (Deno convention, underscore)
- **One domain per directory** under `server/features/`
- **`mod.ts` barrel files** at each feature directory for public exports
- **Schema stays centralized** in `server/db/schema.ts` — not split per feature.
  Drizzle Kit needs a single schema import for migrations, and having all tables
  in one file makes relationship definitions straightforward.
- **No `index.ts`** — Deno convention is `mod.ts`

## Alternatives Considered

### 1. Stay flat — logic in tRPC procedures

**Pros**: Less boilerplate, fewer files, fast to write.

**Cons**: Business logic becomes untestable without spinning up the full tRPC
stack. Rules get duplicated across procedures. Hard to reuse logic (e.g., draft
validation needed from both HTTP and WebSocket paths).

### 2. Two layers only (router + service, no repository)

**Pros**: Fewer files. Services call Drizzle directly.

**Cons**: Services become hard to unit test because they need a real database.
Business logic and query construction get tangled. When a query is used by
multiple services, there's no shared place for it.

### 3. Organize by layer instead of by domain

```
server/
├── routers/
│   ├── league.router.ts
│   └── draft.router.ts
├── services/
│   ├── league.service.ts
│   └── draft.service.ts
└── repositories/
    ├── league.repository.ts
    └── draft.repository.ts
```

**Pros**: Familiar to developers coming from Spring/NestJS-style codebases.

**Cons**: Related code is scattered across directories. Adding a feature touches
three different folders. Feature boundaries become unclear. Harder to reason
about what a single feature needs.

## Consequences

### What becomes easier

- **Testing** — services can be unit tested with mock repositories, no database
  needed for fast feedback
- **Discoverability** — all league code lives in `server/features/league/`
- **Reuse** — the same service can be called from tRPC, WebSocket handlers, or
  background jobs without duplicating logic
- **Code review** — layer violations are obvious (a router importing Drizzle, a
  service importing `db`)

### What becomes harder

- **More files** — each new feature needs at minimum a router, service, and
  repository file, even for simple CRUD
- **Wiring** — dependencies must be explicitly assembled; there's no magic
  injection
- **Learning curve** — contributors need to understand which layer owns which
  responsibility

### Pragmatic escape hatches

- For trivially simple features (health check), it's fine to have a thin service
  that just delegates to the repo — don't add artificial complexity
- If a feature genuinely has no business logic, the router _can_ call the
  repository directly, but this should be the exception and called out in review
