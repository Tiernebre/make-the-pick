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
