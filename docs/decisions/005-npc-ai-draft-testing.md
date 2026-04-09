# ADR-005: NPC/AI Players for Local Draft Testing

## Status

Proposed (2026-04-09)

## Context

The draft system is the core real-time feature of Make the Pick. Testing it
end-to-end currently requires multiple real users connected simultaneously,
making local development painful:

- A developer must open multiple browser tabs and manually switch between
  accounts to simulate a multi-player draft.
- There is no way to test the full draft lifecycle (pending -> in_progress ->
  complete) without tediously making every pick by hand across all players.
- Edge cases like pick timeouts, late-round pool exhaustion, and snake order
  reversal are hard to exercise manually.
- The real-time WebSocket flow (broadcast picks, turn advancement) needs
  multiple concurrent participants to validate.

We need a way to populate a draft with automated "NPC" players that make picks
on their own, so a single developer can experience the draft from one real
player's perspective while the remaining seats are filled by bots.

## Decision

Introduce an **NPC draft agent** system that can act as one or more players in a
draft. The system will be **server-side only**, triggered locally, and **never
deployed to production**.

### High-Level Design

#### 1. NPC Pick Strategy Interface

Define a strategy interface that decides which pool item an NPC picks when it is
their turn:

```ts
type NpcPickStrategy = (context: {
  availableItems: DraftPoolItem[];
  round: number;
  pickNumber: number;
  myRoster: DraftPoolItem[];
}) => DraftPoolItem;
```

Ship with a few built-in strategies:

- **Random** -- picks a random available item. Simplest, good for smoke testing.
- **Best Available** -- picks the item with the highest "rank" from metadata
  (e.g. base stat total for Pokemon). Simulates a competent drafter.
- **Type-Balanced** -- tries to diversify across Pokemon types. Produces more
  realistic rosters.

Strategies are pure functions, easy to unit test and compose.

#### 2. NPC Player Runner

A server-side process that:

1. Subscribes to draft state changes (picks, turn advancement).
2. When `current_pick` points to an NPC-controlled player, waits a configurable
   delay (e.g. 1-5 seconds to simulate "thinking"), then submits a pick using
   the assigned strategy.
3. Repeats until the draft completes.

The runner calls the same **draft service** that real players use -- no special
code paths. This ensures NPCs exercise the real pick validation, state
transitions, and broadcast logic.

#### 3. Activation Mechanism

Two options considered:

**Option A: Dev-only CLI command**

A Deno script (e.g. `server/dev/npc-draft.ts`) that:

- Takes a league ID and number of NPC players as arguments.
- Creates fake user accounts and joins them to the league.
- Starts the NPC runner for each bot player once the draft begins.
- Example: `deno task npc-draft --league <id> --npcs 3 --strategy random`

**Option B: Dev-only tRPC procedure**

A tRPC mutation guarded by `NODE_ENV === "development"` that:

- Accepts league ID, NPC count, and strategy name.
- Creates NPC players server-side and attaches the runner.
- Can be triggered from a dev UI button ("Fill with bots").

**Recommendation: Option A (CLI) first, Option B (tRPC) later.**

The CLI approach is simpler, has zero risk of leaking into production, and
doesn't require any client changes. Once the core NPC logic works, a tRPC
endpoint can wrap it for convenience.

#### 4. NPC User Identity

NPC players need real user + league_player records to go through the normal pick
flow. Options:

- **Seeded dev accounts**: Create users like `npc-1@local.dev`,
  `npc-2@local.dev`, etc. during `deno task seed` or on-the-fly in the CLI
  script.
- **Display names**: Use recognizable names (e.g. `Bot: Oak`, `Bot: Elm`,
  `Bot: Birch`) so the developer can distinguish them in the UI.
- **Auth**: NPCs don't need real auth sessions -- the CLI script calls the
  service layer directly with the NPC user's ID, bypassing the router/auth
  layer.

#### 5. Draft Event Subscription

The NPC runner needs to know when it's an NPC's turn. Two approaches:

- **Polling**: Query draft state on a short interval (e.g. 500ms). Simple but
  adds unnecessary load.
- **Event-driven**: Subscribe to the same WebSocket/SSE channel that real
  clients use, or listen to an internal event emitter.

**Recommendation: Internal event emitter.**

Add a lightweight pub/sub mechanism (e.g. `EventEmitter` or `BroadcastChannel`)
to the draft service that fires on each pick. The NPC runner listens to this
directly -- no network hop, no WebSocket dependency. The real-time WebSocket
layer can also consume this same emitter, keeping the architecture DRY.

### Architecture Sketch

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Real User   │────>│  Draft       │────>│  Draft           │
│  (browser)   │     │  Router/WS   │     │  Service         │
└─────────────┘     └──────────────┘     │                  │
                                          │  makePick()      │
┌─────────────┐                           │  getCurrentTurn()│
│  NPC Runner  │─── calls directly ──────>│  onPick event    │
│  (CLI/dev)   │<── listens to events ────│                  │
└─────────────┘                           └──────────────────┘
```

### File Organization

```
server/
  dev/
    npc/
      mod.ts                  -- CLI entry point
      npc-runner.ts           -- orchestrates NPC players in a draft
      strategies/
        mod.ts                -- re-exports all strategies
        random.ts             -- random pick strategy
        best-available.ts     -- highest-stat pick strategy
        type-balanced.ts      -- type-diversity strategy
```

All NPC code lives under `server/dev/` which is excluded from production builds
and deployment.

## Consequences

### What becomes easier

- **Solo testing**: A developer can run a full draft with one real browser tab
  and N bots, experiencing the real-time flow as an actual user would.
- **Edge case coverage**: Strategies can be tuned to exercise specific scenarios
  (e.g. always pick the last item of a type to trigger pool exhaustion).
- **Demo readiness**: Running a draft demo for stakeholders no longer requires
  recruiting N people.
- **Integration testing**: The NPC runner could be used in automated integration
  tests to exercise the full draft lifecycle without browser automation.

### What becomes harder

- **NPC user cleanup**: Bot accounts and their draft data accumulate in the dev
  database. Mitigated by the existing seed/reset workflow.
- **Strategy maintenance**: If the draft domain changes (new item metadata,
  format changes), strategies need updating. Mitigated by keeping strategies
  simple and few.
- **False confidence**: NPCs exercise the happy path well but can't catch UI
  bugs. Real multi-user testing is still needed before shipping.

### What this explicitly does NOT cover

- **Production AI opponents** -- this is a dev/test tool only. If we ever want
  AI drafters in production (e.g. filling abandoned seats), that's a separate
  decision with different requirements around fairness and UX.
- **Client-side simulation** -- NPCs run server-side to exercise real
  infrastructure. Client-side mocks are a separate concern.
- **Pick timer enforcement** -- NPCs always pick within the time limit. Testing
  timeout behavior requires a separate mechanism (e.g. a strategy that
  intentionally delays past the limit).
