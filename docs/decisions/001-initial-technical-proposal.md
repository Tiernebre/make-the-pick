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

### Backend: Hono

Lightweight, TypeScript-first web framework built on web standards. Familiar middleware pattern (like Express) but modern, typed, and runtime-agnostic — runs on Deno, Node, Cloudflare Workers, and Bun with no code changes. Small API surface means less framework to learn and fewer opinions to fight.

**Considered:** Express — industry standard but untyped, callback-heavy, and not built for modern runtimes. Fastify — strong performance focus but heavier and more Node-coupled.

### Frontend: React + Vite

React is the industry standard with the largest ecosystem of libraries, patterns, and developer knowledge. Vite provides instant dev server startup and hot module replacement. Together they're a proven, well-understood pairing with excellent tooling.

**Considered:** SolidJS, Svelte — both are excellent but have smaller ecosystems. For a project that benefits from off-the-shelf component libraries (Mantine) and community patterns, React's ecosystem wins.

### Design System: Mantine

Full-featured, off-the-shelf React component library with 100+ components, built-in hooks, form handling, notifications, and dark mode support. Covers the UI needs for league management, draft rooms, and data display without building a design system from scratch. Works with Vite out of the box.

**Considered:** Shadcn/ui + Tailwind — high quality but requires assembling your own design system from primitives. Chakra UI — similar scope but v3 rewrite left the ecosystem fragmented. MUI — most complete but heavyweight and highly opinionated.

### Real-time: Deno Native WebSocket

Deno has built-in WebSocket support with no extra dependencies. For a draft room, we need full control over the connection lifecycle (join, pick, disconnect/reconnect, timer sync) — a raw WebSocket server gives that without the abstraction overhead of Socket.IO or similar libraries.

**Considered:** Socket.IO — adds automatic reconnection and rooms but brings significant bundle size and abstracts away control we need for the draft state machine.

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

### Testing: Vitest (Strict TDD)

Vitest is the test runner for all unit tests across the monorepo. It shares Vite's config and transform pipeline, so TypeScript and JSX work without extra setup. Fast watch mode makes the red-green cycle tight.

**The project follows strict test-driven development (TDD):**

1. **Red** — Write a failing test that describes the expected behavior.
2. **Green** — Write the minimum code to make the test pass.
3. **Refactor** — Clean up the implementation while keeping tests green.

Every unit of business logic (rules engine, draft ordering, trade validation, domain models) must be driven by tests written *before* the implementation. No production code without a failing test first. This is not optional — it is the development workflow.

**Considered:** Deno's built-in test runner — capable but lacks Vite integration for frontend component tests and has a smaller ecosystem of matchers and utilities. Jest — industry standard but slower and requires more configuration with TypeScript/ESM.

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
# Terminal 1: Vite dev server (hot reload, proxies /api and /ws to backend)
cd client && deno task dev

# Terminal 2: Hono API server (watches for changes)
cd server && deno task dev
```

Vite's dev server proxies `/api/*` and `/ws/*` to the Hono backend during development, so the frontend gets hot module reload while still talking to the real API.

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
└── client/
    ├── deno.json
    ├── index.html
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── hooks/
    │   ├── trpc.ts            # tRPC client + React Query integration
    │   └── ws/                # WebSocket hooks for draft room
    └── vite.config.ts
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
