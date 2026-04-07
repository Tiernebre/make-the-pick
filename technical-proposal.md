# Technical Proposal: Pokemon Draft & Trade

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

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Deno 2.x | First-class TypeScript, built-in tooling (formatter, linter, test runner), web standard APIs |
| **Backend** | Hono | Lightweight, TypeScript-first, runtime-agnostic web framework built on web standards (`Request`/`Response`) |
| **Frontend** | React + Vite | Industry standard, large ecosystem, fast dev server |
| **Real-time** | Deno native WebSocket | Built-in WebSocket support for live draft rooms, no extra dependencies |
| **Database** | PostgreSQL | Relational data (leagues, players, rosters, trades) fits naturally; mature and reliable |
| **ORM** | Drizzle | Type-safe SQL queries, lightweight, good Deno support |
| **Validation** | Zod | Runtime + compile-time type safety, pairs with Hono via `@hono/zod-validator` |
| **Monorepo** | Deno workspaces | Shared types and validation schemas between frontend and backend |

### Why This Stack

- **One language (TypeScript) everywhere** — shared types between client/server, single mental model
- **Deno reduces config overhead** — no separate ESLint, Prettier, Jest, or tsconfig setup
- **Hono is minimal and conventional** — familiar middleware pattern (like Express), but modern and typed
- **Drizzle + Zod** — type safety from database schema all the way to API request validation
- **Web standards** — `fetch`, `Request`, `Response`, `WebSocket` — portable knowledge, not framework-specific

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

Everything runs in a single Deno process. Hono serves the REST API, WebSocket connections, and the built React frontend — all on one port. No reverse proxy, no multiple services, no CORS config.

```
┌──────────────────────────────────────────────┐
│           Single Deno Server (Hono)          │
│                                              │
│  GET  /api/*            → REST API (JSON)    │
│  GET  /ws/draft/:id     → WebSocket upgrade  │
│  GET  /*                → Static files       │
│                           (React app)        │
├──────────────────────────────────────────────┤
│    Drizzle ORM       │     Rules Engine      │
├──────────────────────┼───────────────────────┤
│               PostgreSQL                     │
└──────────────────────────────────────────────┘
```

### Request Routing

```typescript
const app = new Hono();

// REST API
app.route("/api/leagues", leagueRoutes);
app.route("/api/trades", tradeRoutes);
app.route("/api/rosters", rosterRoutes);

// Real-time draft room
app.get("/ws/draft/:leagueId", upgradeWebSocket((c) => ({
  onOpen(evt, ws) { /* player joins draft */ },
  onMessage(evt, ws) { /* pick made, trade proposed */ },
  onClose() { /* player left */ },
})));

// Serve built React app
app.use("/*", serveStatic({ root: "./client/dist" }));
app.use("/*", serveStatic({ path: "./client/dist/index.html" })); // SPA fallback
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

- **REST API** — CRUD for leagues, rosters, trades, progress
- **WebSocket** — real-time draft room (pick broadcasts, timer sync, trade notifications). Room management via a simple `Map<leagueId, Set<WebSocket>>`
- **Rules Engine** — server-side module that evaluates scoring based on league config + player progress
- **Shared types** — Zod schemas in a shared workspace package, used by both frontend and backend
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
│   ├── routes/                # Hono route handlers
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
    │   └── api/               # API client + WebSocket hooks
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
