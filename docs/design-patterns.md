# Design Patterns

This is a living document describing the current architecture and coding
conventions. Update it as patterns evolve.

## Server Architecture

### Three-Layer Pattern

The server uses three layers, organized by feature domain under
`server/features/`:

```
server/features/<domain>/
├── <domain>.router.ts          # tRPC procedures
├── <domain>.service.ts         # Business logic
├── <domain>.service_test.ts
├── <domain>.repository.ts      # Data access (Drizzle)
├── <domain>.repository_test.ts
└── mod.ts                      # Public exports
```

**Router** — Thin glue. Picks `procedure` or `protectedProcedure`, declares
input/output Zod schemas, calls one service method, returns the result. No
business logic, no direct Drizzle calls.

**Service** — Business rules and orchestration. Receives plain arguments (never
`ctx`). No Drizzle imports or `db` references. Dependencies are injected via
factory function arguments.

**Repository** — Drizzle queries for a single domain. May encapsulate
transactions and joins. No business logic — if you're writing an `if`, it
probably belongs in the service.

### Dependency Injection

Factory functions, not classes or DI containers:

```ts
export function createLeagueRepository(db: Database) {
  return {
    async findById(id: string) {/* ... */},
    async create(data: NewLeague) {/* ... */},
  };
}

export function createLeagueService(deps: {
  leagueRepo: ReturnType<typeof createLeagueRepository>;
}) {
  return {
    async create(userId: string, input: CreateLeagueInput) {/* ... */},
  };
}
```

Dependencies are wired together in a composition root (`server/features/mod.ts`)
at startup. In tests, swap real dependencies for fakes.

### Shared Package (`@make-the-pick/shared`)

Owns the contract between server and client:

- Zod schemas for API inputs and outputs
- Inferred TypeScript types
- Shared constants and enums

Does **not** contain business logic or server-side types (Drizzle row types).

### Database Schema

All Drizzle table definitions live in a single file: `server/db/schema.ts`.
Drizzle Kit needs a single schema import for migrations, and co-locating tables
makes relationship definitions straightforward.

## Client Architecture

### Feature-Based Organization

Client code mirrors the server's feature-based structure. Feature-specific
pages, components, and hooks live together under `client/src/features/`.
Top-level `components/` and `hooks/` are reserved for genuinely shared code.

```
client/src/
├── main.tsx              # React root mount
├── App.tsx               # Providers, top-level routing
├── trpc.ts               # tRPC React client
├── auth.ts               # better-auth React client
├── components/           # Shared UI (AuthGuard, Layout, etc.)
├── hooks/                # Shared hooks (useWebSocket, etc.)
└── features/
    ├── league/
    │   ├── LeagueListPage.tsx
    │   ├── CreateLeagueForm.tsx
    │   ├── use-leagues.ts        # tRPC hook wrapper
    │   └── ...
    └── draft/
        ├── DraftRoomPage.tsx
        ├── DraftBoard.tsx
        ├── use-draft.ts
        └── ...
```

### Where things go

| What                       | Where                | Example                |
| -------------------------- | -------------------- | ---------------------- |
| Route-level component      | `features/<domain>/` | `LeagueListPage.tsx`   |
| Feature-specific component | `features/<domain>/` | `CreateLeagueForm.tsx` |
| Feature-specific hook      | `features/<domain>/` | `use-leagues.ts`       |
| Shared UI component        | `components/`        | `AuthGuard.tsx`        |
| Shared hook                | `hooks/`             | `use-web-socket.ts`    |
| App-wide provider/config   | `src/` root          | `trpc.ts`, `auth.ts`   |

**Rule of thumb:** if a component or hook is only used within one feature, it
lives in that feature's directory. Move it to the shared folder only when a
second feature needs it.

### Data Fetching

All server communication goes through tRPC React Query hooks. The `AppRouter`
type is imported directly from the server — no code generation step.
Feature-specific hooks (e.g. `use-leagues.ts`) wrap tRPC calls to keep
components focused on rendering.

### Authentication

`better-auth/react` provides session hooks. `AuthGuard` wraps routes that
require authentication.

## File Naming Conventions

| What                 | Pattern                    | Example                  |
| -------------------- | -------------------------- | ------------------------ |
| Server feature file  | `<domain>.<layer>.ts`      | `league.service.ts`      |
| Server test (Deno)   | `<domain>.<layer>_test.ts` | `league.service_test.ts` |
| Client test (Vitest) | `<name>.test.tsx`          | `App.test.tsx`           |
| Barrel export        | `mod.ts`                   | (never `index.ts`)       |

## Testing Strategy

| Tier                | Runner                   | What it tests                       |
| ------------------- | ------------------------ | ----------------------------------- |
| Shared schemas      | `Deno.test`              | Zod schema validation, pure logic   |
| Server repositories | `Deno.test`              | Data access against a real database |
| Server services     | `Deno.test`              | Business logic with injected fakes  |
| Client components   | Vitest + Testing Library | UI rendering, interactions          |
| E2E                 | Playwright               | Full-stack user flows               |

## Feature Inventory

Each row was verified against the actual directory contents under
`server/features/` and `client/src/features/`.

| Feature           | Router | Service | Repository | Client UI?                              | Notes                                                                                                                   |
| ----------------- | :----: | :-----: | :--------: | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `draft`           |   ✓    |    ✓    |     ✓      | `client/src/features/draft/`            | Full stack. Includes SSE push, NPC scheduler, and timer logic as extra files alongside the three core layers.           |
| `draft-pool`      |   ✓    |    ✓    |     ✓      | No dedicated folder — consumed by draft | Pool generation and scouting reveal. Client UI lives inside `client/src/features/draft/` (e.g. `DraftPoolPage.tsx`).    |
| `league`          |   ✓    |    ✓    |     ✓      | `client/src/features/league/`           | Full stack. Covers league CRUD, player management, and league lifecycle.                                                |
| `pool-item-note`  |   ✓    |    ✓    |     ✓      | Server-only                             | Notes attached to draft pool items. Client hook `use-pool-item-notes.ts` lives inside `client/src/features/draft/`.     |
| `user`            |   ✓    |    ✓    |     ✓      | Server-only                             | User profile and account management. No dedicated client feature folder.                                                |
| `watchlist`       |   ✓    |    ✓    |     ✓      | Server-only                             | Per-player watchlists. Client hook `use-watchlist.ts` lives inside `client/src/features/draft/`.                        |
| `pokemon-version` |   ✓    |    —    |     —      | Hook only (`use-pokemon-versions.ts`)   | Exception to the layered pattern. Returns a static in-memory list of Pokémon versions; no service or repository needed. |

**Key observation:** `pool-item-note`, `watchlist`, and `user` have no client
feature folder. Their client-side access hooks live inside
`client/src/features/draft/` because they are consumed exclusively from the
draft room. Search there first when looking for their client-side code.

## Request Flow Example: `draft.makePick`

This walks a single tRPC mutation from the browser call through every layer to
the database write. Use it as a navigation template for any other procedure.

### 1. Client call site

```ts
// client/src/features/draft/use-draft.ts
trpc.draft.makePick.useMutation(...)
```

The tRPC React client resolves `draft.makePick` through the `AppRouter` type
imported directly from the server — no code generation.

### 2. Router (`server/features/draft/draft.router.ts`)

```ts
makePick: protectedProcedure
  .input(makePickInputSchema)          // Zod schema from @make-the-pick/shared
  .mutation(({ ctx, input }) => {
    return draftService.makePick({
      userId: ctx.user.id,
      leagueId: input.leagueId,
      poolItemId: input.poolItemId,
    });
  }),
```

The router enforces auth (`protectedProcedure`), declares the input schema, and
delegates immediately to the service. No business logic here.

### 3. Service (`server/features/draft/draft.service.ts`)

```ts
async makePick({ userId, leagueId, poolItemId }) {
  // ... guard checks: draft exists, status is in_progress, caller's turn ...
  createdPickRow = await deps.draftRepo.createPick({ draftId, leaguePlayerId, poolItemId, pickNumber });
  await deps.draftRepo.incrementCurrentPick(draftRow.id);
  // ... broadcast SSE event, handle end-of-draft ...
}
```

All business rules live here: turn validation, duplicate-pick detection,
end-of-draft detection, and SSE broadcast. Dependencies (`draftRepo`,
`leagueRepo`, etc.) are injected via the factory function — never imported
directly.

### 4. Repository (`server/features/draft/draft.repository.ts`)

```ts
async createPick(input: CreatePickInput): Promise<DraftPickRow> {
  const [row] = await db.insert(draftPick).values({ ... }).returning();
  return row;
}
```

The repository owns the Drizzle query. It handles the unique-constraint race
condition by catching the violation and throwing a typed
`DraftPickConflictError` so the service can map it to a tRPC `CONFLICT`
response.

### 5. Database

The `draftPick` table is defined in `server/db/schema.ts`. The repository writes
one row per pick; `incrementCurrentPick` updates the `currentPick` counter on
the parent `draft` row in the same feature's repository.
