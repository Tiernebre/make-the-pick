# Draft

A draft is a real-time event where league players take turns picking items from
a shared pool. The league creator configures the draft format; **snake draft**
is the default.

## Entities

### DraftPool

The set of items available to pick in a league's draft. A pool is defined before
the draft begins and scoped to a single league.

| Field     | Type        | Constraints               |
| --------- | ----------- | ------------------------- |
| id        | text (UUID) | PK                        |
| league_id | text        | NOT NULL, FK -> league.id |
| name      | text        | NOT NULL                  |

### DraftPoolItem

An individual item within a pool. For the initial Pokemon focus, each item
represents a single Pokemon.

| Field         | Type        | Constraints                   |
| ------------- | ----------- | ----------------------------- |
| id            | text (UUID) | PK                            |
| draft_pool_id | text        | NOT NULL, FK -> draft_pool.id |
| name          | text        | NOT NULL                      |
| thumbnail_url | text        | nullable                      |
| metadata      | jsonb       | nullable                      |

`metadata` holds format-specific data (e.g. Pokemon type, generation, sprite
URL). The schema is intentionally flexible to support future content types
beyond Pokemon.

**Unique constraint:** (draft_pool_id, name) -- no duplicate items in a pool.

### Draft

A single draft session for a league. Created when the league transitions from
`setup` to `drafting`.

| Field        | Type              | Constraints                   |
| ------------ | ----------------- | ----------------------------- |
| id           | text (UUID)       | PK                            |
| league_id    | text              | NOT NULL, FK -> league.id, UQ |
| pool_id      | text              | NOT NULL, FK -> draft_pool.id |
| format       | draft_format enum | NOT NULL, default `snake`     |
| status       | draft_status enum | NOT NULL, default `pending`   |
| pick_order   | jsonb             | NOT NULL                      |
| current_pick | integer           | NOT NULL, default 0           |
| started_at   | timestamptz       | nullable                      |
| completed_at | timestamptz       | nullable                      |
| created_at   | timestamptz       | NOT NULL, default now()       |

`pick_order` is a JSON array of league_player IDs defining the first-round
order. The draft format determines how this order maps across rounds (e.g. snake
reverses every other round).

`current_pick` is the zero-based index into the full pick sequence (across all
rounds). It advances after each successful pick.

**Unique constraint:** league_id -- a league has exactly one draft.

### DraftPick

A single pick made during the draft. Links a league player to a pool item at a
specific position.

| Field            | Type        | Constraints                        |
| ---------------- | ----------- | ---------------------------------- |
| id               | text (UUID) | PK                                 |
| draft_id         | text        | NOT NULL, FK -> draft.id           |
| league_player_id | text        | NOT NULL, FK -> league_player.id   |
| pool_item_id     | text        | NOT NULL, FK -> draft_pool_item.id |
| pick_number      | integer     | NOT NULL                           |
| picked_at        | timestamptz | NOT NULL, default now()            |

**Unique constraints:**

- (draft_id, pick_number) -- each pick position is filled exactly once
- (draft_id, pool_item_id) -- an item can only be picked once per draft

## Relationships

- **League -> Draft**: One-to-one. A league has at most one draft.
- **League -> DraftPool**: One-to-one via draft. The pool is created during
  setup, linked to the draft when it starts.
- **DraftPool -> DraftPoolItem**: One-to-many. A pool contains many items.
- **Draft -> DraftPick**: One-to-many. A draft accumulates picks over time.
- **DraftPick -> LeaguePlayer**: Many-to-one. Each pick belongs to a player.
- **DraftPick -> DraftPoolItem**: Many-to-one. Each pick claims an item.

## Enums

### draft_format

| Value | Meaning                                            |
| ----- | -------------------------------------------------- |
| snake | Pick order reverses each round (1-2-3, 3-2-1, ...) |

Future formats (auction, linear, blind bid) will be added as values here.

### draft_status

| Value       | Meaning                        |
| ----------- | ------------------------------ |
| pending     | Draft created, not yet started |
| in_progress | Draft is live, accepting picks |
| complete    | All rounds finished            |

## Snake Draft Algorithm

Given `N` players and a first-round order of `[P1, P2, ..., PN]`:

- **Odd rounds** (1, 3, 5, ...): pick order is `P1, P2, ..., PN`
- **Even rounds** (2, 4, 6, ...): pick order is `PN, ..., P2, P1`

To find who picks at `current_pick`:

```
round = floor(current_pick / N)
position_in_round = current_pick % N

if round is even:
  player = pick_order[position_in_round]
else:
  player = pick_order[N - 1 - position_in_round]
```

The total number of picks is `N * rounds_configured` (or until the pool is
exhausted, whichever comes first).

## Invariants

1. A draft cannot start until the league has at least 2 players.
2. A draft cannot start until the pool has enough items for at least one full
   round (pool size >= number of players).
3. Once a draft is `in_progress`, the pool is frozen -- no items can be added or
   removed.
4. Only the player whose turn it is (determined by `current_pick` and the draft
   format algorithm) may make a pick.
5. A picked item is removed from the available pool for all subsequent picks.
6. `current_pick` advances by 1 after each successful pick.
7. The draft transitions to `complete` when `current_pick` reaches the total
   number of picks or the pool is exhausted.
8. Only the league creator may start the draft (triggering `setup -> drafting`
   on the league).

## State Transitions

```
pending -> in_progress -> complete
```

- **pending -> in_progress**: League creator starts the draft. League status
  moves from `setup` to `drafting`. `started_at` is set.
- **in_progress -> complete**: Final pick is made or pool is exhausted.
  `completed_at` is set. League status moves from `drafting` to the next phase.

Transitions are forward-only.
