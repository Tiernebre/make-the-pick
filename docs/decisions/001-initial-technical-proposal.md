# ADR-001: Initial Technical Proposal

## Status

Proposed

## Overview

A real-time web application where players draft Pokemon, trade with each other, and compete in challenge runs — scored by a configurable rules engine. Built as a proof-of-concept for a larger "draft & trade anything" platform.

The long-term vision is a **universal draft engine** that can be applied to anything (stocks, cities, movies, sports), but the first iteration focuses on **Pokemon challenge drafts** to validate the core loop.

---

## Product Goals

- **Public-facing** — built for friends initially, designed for anyone to use
- **Real-time drafts** — all players online together, picking live
- **Configurable rules** — league creators define scoring and draft rules
- **Social via Discord** — no in-app chat; lean on existing social tools
- **Pokemon-first** — proof-of-concept scoped to Pokemon drafting and challenge tracking
- **Open source** — MIT licensed

---

## Core Game Loop

```
1. CREATE LEAGUE    →  League creator sets rules, invites players
2. DRAFT            →  Real-time pick phase (snake, auction, etc.)
3. TRADE WINDOW     →  Players propose and negotiate trades
4. COMPETE          →  Players complete their challenge runs
5. SCORE            →  Rules engine evaluates outcomes
6. LEADERBOARD      →  Results tracked across seasons
```

---

## Tech Stack

### Runtime: Deno 2.x

First-class TypeScript with zero config — no separate `tsconfig.json`, ESLint, Prettier, or Jest setup. Deno's built-in formatter, linter, and test runner replace an entire Node.js toolchain. Web standard APIs (`fetch`, `Request`, `Response`, `WebSocket`) mean the knowledge transfers outside Deno. Deno 2.x added full npm compatibility, removing the ecosystem gap that held back Deno 1.x.

**Considered:** Node.js — mature and battle-tested but requires assembling a toolchain (TypeScript compiler, bundler, linter, formatter, test runner) that Deno provides out of the box.

### Formatting: `deno fmt`

All code — server, client, shared packages, and E2E tests — is formatted with `deno fmt`. One formatter, one style, zero config. No Prettier, no `.prettierrc`, no editor plugin differences between contributors. `deno fmt` is run from the repo root and covers every workspace.

**Considered:** Prettier — industry standard but requires a separate dependency, config file, and plugin management. Using `deno fmt` everywhere keeps the toolchain unified under Deno.

### Backend: Hono

Lightweight, TypeScript-first web framework built on web standards. Familiar middleware pattern (like Express) but modern, typed, and runtime-agnostic — runs on Deno, Node, Cloudflare Workers, and Bun with no code changes. Small API surface means less framework to learn and fewer opinions to fight.

**Considered:** Express — industry standard but untyped, callback-heavy, and not built for modern runtimes. Fastify — strong performance focus but heavier and more Node-coupled.

### Frontend: React + Vite

React is the industry standard with the largest ecosystem of libraries, patterns, and developer knowledge. Vite provides instant dev server startup and hot module replacement. Together they're a proven, well-understood pairing with excellent tooling.

**Considered:** SolidJS, Svelte — both are excellent but have smaller ecosystems. For a project that benefits from off-the-shelf component libraries (Mantine) and community patterns, React's ecosystem wins.

### Design System: Mantine

Full-featured, off-the-shelf React component library with 100+ components, built-in hooks, form handling, notifications, and dark mode support. Covers the UI needs for league management, draft rooms, and data display without building a design system from scratch. Works with Vite out of the box.

**Considered:** Shadcn/ui + Tailwind — high quality but requires assembling your own design system from primitives. Chakra UI — similar scope but v3 rewrite left the ecosystem fragmented. MUI — most complete but heavyweight and highly opinionated.

### Client State Management: Vanilla React

tRPC + React Query handles all server state (fetching, caching, mutations). For local state (draft room WebSocket messages, UI state), vanilla React patterns (`useState`, `useReducer`, context) are sufficient. No state management library needed for MVP.

**Considered:** Zustand, Jotai — both lightweight, but adding a state library before complexity demands it is premature. Easy to introduce later if the draft room state outgrows `useReducer`.

### Client Routing: Wouter

Tiny (~2KB), hooks-based router with a stable API. Covers path matching, route params, nested routes, and SPA navigation — nothing more. No framework ambitions, no major version churn.

**Considered:** React Router — painful versioning history (v5 → v6 breaking changes, v7 blurring into Remix). TanStack Router — type-safe but increasingly tied to TanStack Start's full-stack framework pitch.

### Real-time: Deno Native WebSocket

Deno has built-in WebSocket support with no extra dependencies. For a draft room, we need full control over the connection lifecycle (join, pick, disconnect/reconnect, timer sync) — a raw WebSocket server gives that without the abstraction overhead of Socket.IO or similar libraries.

**Considered:** Socket.IO — adds automatic reconnection and rooms but brings significant bundle size and abstracts away control we need for the draft state machine.

### Pokemon Data: Local JSON + PokeAPI Sync Script

Pokemon data lives as a local JSON seed file — no runtime dependency on external APIs. A Deno script fetches from [PokeAPI](https://pokeapi.co/) and outputs the seed file. Run it manually whenever you want to re-sync (new Pokemon, updated stats/moves, etc.). The output is committed to the repo so the app has predictable, version-controlled data with zero external calls at runtime.

**Considered:** PokeAPI at runtime — adds latency, rate limits, and an external dependency on the critical path of drafts.

### Database: PostgreSQL

Relational data (leagues, players, rosters, trades, picks) fits naturally into tables with foreign keys and constraints. PostgreSQL is mature, reliable, and has strong support for JSON columns (useful for flexible rules config). It's the most widely supported database across hosting platforms.

**Considered:** SQLite — simpler but limited concurrent write support, which matters for real-time drafts with multiple players picking simultaneously.

### ORM: Drizzle

Type-safe SQL query builder that stays close to SQL rather than abstracting it away. Generates raw SQL migration files (not programmatic migrations), so the migration history is readable and auditable. Lightweight with good Deno support.

**Considered:** Prisma — more features but heavier, uses its own schema language (not TypeScript), and has a binary engine dependency that complicates Deno deployment. Kysely — excellent query builder but lacks built-in migration tooling.

### API Layer: tRPC

End-to-end typesafe API where server procedures are directly callable from the React client with full autocompletion. No hand-written fetch calls, no duplicated request/response types, no code generation step. Define a Zod schema on the server, and the client knows the input and output types automatically.

**Considered:** REST + OpenAPI — requires maintaining a separate spec and generating client code. GraphQL — powerful but adds complexity (schema language, resolvers, client cache) that's unnecessary when the frontend and backend share a codebase.

### Validation: Zod

Runtime schema validation with TypeScript type inference. Serves triple duty: tRPC input validation, form validation (via Mantine's form integration), and shared domain type definitions. One schema definition produces both runtime checks and compile-time types.

**Considered:** Yup, Valibot — both capable but Zod has the deepest integration with tRPC and the strongest TypeScript inference.

### Monorepo: Deno Workspaces

Deno's built-in workspace support allows sharing Zod schemas, types, and constants between the server and client packages without publishing to a registry. No need for Turborepo, Nx, or other monorepo tooling — Deno handles it natively.

**Considered:** npm workspaces + Turborepo — adds build orchestration complexity that Deno workspaces avoid entirely.

### Authentication: Better Auth + Google OAuth

Better Auth is a TypeScript-first, framework-agnostic auth library. It handles the full OAuth flow, session management, and cookie handling while storing everything in our own PostgreSQL database via its Drizzle adapter. No external auth service dependency — we own the data.

Google OAuth is the sole provider to start. All initial users have Google accounts, so it's the simplest path. Additional providers (Discord, GitHub, etc.) can be added later with a single config entry.

**Considered:** Clerk / Auth0 — fully managed but adds an external service dependency on the critical path of every request, plus pricing tiers. Auth.js — tightly coupled to Next.js, experimental Hono adapter isn't mature. Lucia Auth — solid patterns but recently deprecated as a library.

### Logging: Pino + Hono Logger

Hono's built-in logger middleware handles HTTP request/response logging. Pino provides structured JSON logging for application-level events (draft picks, trade actions, auth events, errors). Structured logs from day one make it straightforward to pipe into any observability tool later.

**Considered:** Deno stdlib `std/log` — lightweight but less ecosystem integration and no structured JSON output by default.

### Error Handling: tRPC Error Model

Use tRPC's built-in error codes and error formatting (`NOT_FOUND`, `UNAUTHORIZED`, `BAD_REQUEST`, `FORBIDDEN`, etc.) rather than inventing a custom error model. Errors thrown in procedures surface to the client with typed error codes that the frontend can handle consistently. Application-level errors (e.g., "draft pick already taken") use `TRPCError` with appropriate codes.

### Environment & Config

Deno has built-in `.env` file support for local development. Production uses environment variables directly. No config library needed — `Deno.env.get()` handles both cases. Sensitive values (database URL, OAuth secrets) are never committed.

### CI/CD: GitHub Actions

Pipeline stages: lint → unit tests → integration tests (with Postgres service container) → E2E (Playwright) → deploy. Unit tests run first for fast failure. E2E tests are the final gate before deployment.

### Deployment: DigitalOcean

Single Deno process in a Docker container on DigitalOcean. Supports persistent WebSocket connections (needed for draft rooms) and direct PostgreSQL access — both limitations of serverless platforms like Deno Deploy. DigitalOcean's managed PostgreSQL can serve as the database, keeping infrastructure simple.

**Considered:** Deno Deploy — no persistent WebSocket support and no direct Postgres connections. Fly.io — capable but adds complexity over a straightforward VPS/App Platform setup.

### Authorization: Login-Gated, Public Leagues

The entire app requires authentication — unauthenticated users see only the login page. No granular permission model for MVP. All leagues are public and visible to any logged-in user. League creator controls phase transitions but there are no role-based restrictions beyond that. Fine-grained authorization (private leagues, admin roles, trade approval permissions) can be layered in later without architectural changes.

### Testing: Split Runners, Strict TDD

Two test runners, matched to their runtime:

- **`deno test`** — server and shared packages. Tests run in the same Deno runtime as production, so there's no behavior mismatch. Built-in assertions, snapshot testing, and async support.
- **Vitest** — client (React components, hooks, frontend logic). Shares Vite's config and transform pipeline, so TypeScript and JSX work without extra setup. Fast watch mode for tight feedback loops.

The shared package (Zod schemas, types) is pure TypeScript with no runtime-specific code, so it's testable by either runner.

**The project follows strict test-driven development (TDD):**

1. **Red** — Write a failing test that describes the expected behavior.
2. **Green** — Write the minimum code to make the test pass.
3. **Refactor** — Clean up the implementation while keeping tests green.

Every unit of business logic (rules engine, draft ordering, trade validation, domain models) must be driven by tests written *before* the implementation. No production code without a failing test first. This is not optional — it is the development workflow.

**Integration tests** hit real boundaries — no mocking the database:

- **tRPC procedures** — tested via `createCaller`, covering the full path from input validation through business logic to database and back.
- **Database** — run against a real PostgreSQL instance (Docker in dev/CI). Each test uses a transaction that rolls back, keeping tests isolated without resetting the DB.
- **WebSocket / draft room** — the draft state machine is pure logic (unit tested via TDD). A thin integration test layer verifies WebSocket upgrade and message flow end-to-end.
- **Hono HTTP** — tested via Hono's built-in test client (`app.request()`) for middleware, auth, and route-level concerns.

Unit tests run first in CI (fast, fail early). Integration tests run after.

**Considered:** Vitest everywhere — would require running backend code under Node compatibility mode, creating a runtime mismatch with production. Jest — slower and requires more configuration with TypeScript/ESM.

### E2E Testing: Playwright

Playwright handles end-to-end tests as a final CI gate. It covers critical user journeys — not edge cases (those belong in unit/integration tests). E2E tests are too slow for the TDD loop and should not be run during development.

**Critical paths to cover:**

- Create league → invite players → join
- Real-time draft with multiple players (Playwright can spin up multiple browser contexts in one test to simulate concurrent drafters)
- Propose and accept a trade
- View leaderboard / standings

E2E tests run against their own seeded database, separate from integration tests. Migrations + seed data, reset between test suites.

**Considered:** Cypress — popular but weaker multi-tab/multi-context support, which matters for simulating multiple players in a draft room. Selenium — legacy, no reason for a new project.

---

## Domain Model (Initial)

```
User
├── id, username, email

League
├── id, name, created_by (User)
├── rules_config (JSON — scoring rules, draft format, roster size, etc.)
├── status: setup | drafting | trading | competing | complete

LeaguePlayer
├── league_id, user_id, draft_position

DraftPick
├── league_id, player_id, pokemon_id
├── pick_number, round

Roster
├── league_id, player_id
├── pokemon[] (assembled from draft picks + trades)

Trade
├── league_id, proposer_id, recipient_id
├── offered_pokemon[], requested_pokemon[]
├── status: pending | accepted | rejected | countered

Pokemon (reference data)
├── id, name, types, base_stats, generation, sprite_url
```

---

## Key Features (MVP)

### 1. League Management
- Create a league with a name and rules configuration
- Invite players via link or code
- League creator controls when phases transition

### 2. Real-Time Draft
- All players join a live draft room via WebSocket
- Configurable draft formats:
  - **Snake draft** — pick order reverses each round
  - **Linear draft** — same order every round
  - **Auction draft** — bid on Pokemon with a budget (stretch goal)
- Timer per pick (configurable)
- Live updates as each player picks
- Pokemon pool sourced from PokeAPI or a local dataset

### 3. Trading
- Propose trades to other players in your league
- Accept, reject, or counter-offer
- Trade history visible to the league
- League creator can set trade deadline or disable trading

### 4. Rules Engine
- League creator configures scoring rules at league creation
- Example rule types:
  - Points for gym badges earned
  - Points for Pokemon caught/evolved
  - Bonus for completing the run first
  - Penalty for Pokemon fainting (Nuzlocke mode)
- Rules stored as JSON config, evaluated by the backend

### 5. Challenge Tracking
- Players manually update their progress (MVP)
- Mark milestones: badges, elite four, champion
- Mark Pokemon status: alive, fainted, evolved
- Future: emulator/RetroAchievements integration for automatic tracking

### 6. Leaderboard
- Live standings based on rules engine scoring
- Historical results across multiple leagues/seasons

---

## Architecture

### Single Server, One Port

Everything runs in a single Deno process. Hono serves as the HTTP framework — routing, middleware, static files, and WebSocket upgrades. tRPC is mounted inside Hono via the fetch adapter, handling all typed API procedures. Both coexist on one port with no reverse proxy, no multiple services, no CORS config.

```
┌──────────────────────────────────────────────┐
│           Single Deno Server (Hono)          │
│                                              │
│  /api/trpc/*            → tRPC procedures    │
│                           (typed queries &   │
│                            mutations)        │
│  /ws/draft/:id          → WebSocket upgrade  │
│  /*                     → Static files       │
│                           (React app)        │
├──────────────────────────────────────────────┤
│  tRPC Router  │  Drizzle ORM  │ Rules Engine │
├──────────────────────────────────────────────┤
│               PostgreSQL                     │
└──────────────────────────────────────────────┘
```

### Request Routing

```typescript
import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/router.ts";

const app = new Hono();

// tRPC — typed API for all CRUD operations
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({ db, session: getSession(c) }),
  });
});

// Real-time draft room — raw WebSocket for full control
app.get("/ws/draft/:leagueId", upgradeWebSocket((c) => ({
  onOpen(evt, ws) { /* player joins draft */ },
  onMessage(evt, ws) { /* pick made, trade proposed */ },
  onClose() { /* player left */ },
})));

// Serve built React app
app.use("/*", serveStatic({ root: "./client/dist" }));
app.use("/*", serveStatic({ path: "./client/dist/index.html" })); // SPA fallback
```

### tRPC Router (Example)

```typescript
import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  league: t.router({
    list: t.procedure.query(({ ctx }) =>
      ctx.db.select().from(leagues)
    ),
    create: t.procedure
      .input(createLeagueSchema)  // Zod schema from packages/shared
      .mutation(({ ctx, input }) =>
        ctx.db.insert(leagues).values(input).returning()
      ),
    getById: t.procedure
      .input(z.object({ id: z.string().uuid() }))
      .query(({ ctx, input }) =>
        ctx.db.select().from(leagues).where(eq(leagues.id, input.id))
      ),
  }),
  roster: t.router({ /* ... */ }),
  trade: t.router({ /* ... */ }),
});

export type AppRouter = typeof appRouter;  // Client imports this type only
```

### Development Workflow

```
# Start both client and server in one command from the repo root
deno task dev
```

The root `deno.json` defines a `dev` task that runs the Vite dev server and Hono API server concurrently. Vite's dev server proxies `/api/*` and `/ws/*` to the Hono backend, so the frontend gets hot module reload while still talking to the real API. One command, one terminal.

### Production

Vite builds the React app to `client/dist/`. Hono serves it as static files alongside the API. One `Deno.serve()` call, one port, one deployment.

### Key Architectural Decisions

- **tRPC API** — typed queries and mutations for all CRUD operations (leagues, rosters, trades, progress). Mounted in Hono via the fetch adapter — Hono handles middleware, tRPC handles the API layer
- **WebSocket** — real-time draft room (pick broadcasts, timer sync, trade notifications). Room management via a simple `Map<leagueId, Set<WebSocket>>`. Kept as raw WebSockets for full control over the draft state machine
- **Rules Engine** — server-side module that evaluates scoring based on league config + player progress
- **Shared types** — Zod schemas in a shared workspace package, used as tRPC input validators and shared across all layers
- **No CORS** — frontend and API on same origin, eliminating cross-origin complexity
- **No reverse proxy** — single process simplifies deployment (Docker, VPS, Deno Deploy, etc.)

---

## Project Structure (Proposed)

```
/
├── deno.json                  # workspace config
├── packages/
│   └── shared/                # shared Zod schemas, types, constants
│       ├── schemas/
│       └── types/
├── server/
│   ├── deno.json
│   ├── main.ts                # entry point
│   ├── trpc/
│   │   ├── router.ts          # root tRPC router
│   │   ├── context.ts         # request context (db, session)
│   │   └── procedures/        # domain-specific routers (league, trade, roster)
│   ├── ws/                    # WebSocket handlers (draft room)
│   ├── db/
│   │   ├── schema.ts          # Drizzle schema
│   │   └── migrations/
│   ├── engine/                # rules engine
│   └── services/              # business logic
├── client/
│   ├── deno.json
│   ├── package.json           # npm deps (React, Mantine, Vitest)
│   ├── index.html
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── trpc.ts            # tRPC client + React Query integration
│   │   └── ws/                # WebSocket hooks for draft room
│   └── vite.config.ts
└── e2e/
    ├── playwright.config.ts   # Playwright configuration
    └── tests/                 # full-stack E2E tests (CI-only)
```

---

## Future Vision (Post-MVP)

- **Emulator integration** — hook into RetroAchievements API for automatic progress tracking
- **Additional game modes** — Fantasy Stocks, Fantasy Cities, custom "draft anything" pools
- **Auction draft** — budget-based bidding system
- **Spectator mode** — watch drafts live without participating
- **Draft replay** — rewatch a completed draft pick-by-pick
- **Mobile-responsive** — progressive web app for phone use during draft nights
- **Public league directory** — join open leagues with strangers
