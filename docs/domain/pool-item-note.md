# Pool Item Note

A pool item note is a player's private, freeform text annotation on a single
draft pool item within a league. Notes are scoped per player — one note per
(player, pool item) pair — and are intended for personal scouting commentary
during the pre-draft period.

## Entities

### PoolItemNote

| Field           | Type        | Constraints                                        |
| --------------- | ----------- | -------------------------------------------------- |
| id              | uuid        | PK, generated                                      |
| leaguePlayerId  | uuid        | NOT NULL, FK → league_player.id (cascade delete)   |
| draftPoolItemId | uuid        | NOT NULL, FK → draft_pool_item.id (cascade delete) |
| content         | text        | NOT NULL                                           |
| createdAt       | timestamptz | NOT NULL, default now()                            |
| updatedAt       | timestamptz | NOT NULL, default now()                            |

**Unique constraint:** (league_player_id, draft_pool_item_id) — a player has at
most one note per pool item.

## Relationships

- **LeaguePlayer → PoolItemNote**: One-to-many. A player may annotate many pool
  items within their league.
- **DraftPoolItem → PoolItemNote**: One-to-many. A pool item may have notes from
  multiple players (one per player).

## Invariants

1. Only a league member may manage notes for that league. A user who is not a
   LeaguePlayer in the requested league receives a `FORBIDDEN` error.
2. A player has at most one note per pool item (enforced by the unique
   constraint). Creating a note for a pool item that already has one overwrites
   the existing note (`upsert` semantics — `updatedAt` is refreshed on
   conflict).
3. `content` must be non-empty; the constraint is enforced at the database level
   via `NOT NULL`.
4. Deleting a LeaguePlayer or a DraftPoolItem cascades to remove the
   corresponding PoolItemNote rows automatically.
5. Notes are private to each player; the list operation returns only notes
   belonging to the requesting player's league membership.

## Operations

| Operation | Description                                                                      |
| --------- | -------------------------------------------------------------------------------- |
| list      | Returns all pool item notes for the caller's player within the specified league. |
| upsert    | Creates or updates the note for a given pool item (last write wins).             |
| delete    | Removes the note for a given pool item.                                          |
