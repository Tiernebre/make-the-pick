# Watchlist

A watchlist is a player's personal, ordered list of draft pool items they intend
to track or prioritize during a draft. Each league player maintains their own
independent watchlist scoped to that league.

## Entities

### WatchlistItem

A single entry in a player's watchlist. Links a league player to a draft pool
item and records the item's position within that player's list.

| Field           | Type        | Constraints                                        |
| --------------- | ----------- | -------------------------------------------------- |
| id              | uuid        | PK, generated                                      |
| leaguePlayerId  | uuid        | NOT NULL, FK → league_player.id (cascade delete)   |
| draftPoolItemId | uuid        | NOT NULL, FK → draft_pool_item.id (cascade delete) |
| position        | integer     | NOT NULL                                           |
| createdAt       | timestamptz | NOT NULL, default now()                            |

**Unique constraint:** (league_player_id, draft_pool_item_id) — a player can
only add a given pool item to their watchlist once.

## Relationships

- **LeaguePlayer → WatchlistItem**: One-to-many. A player has many watchlist
  entries, each scoped to their league membership.
- **DraftPoolItem → WatchlistItem**: One-to-many. A pool item may appear on
  multiple players' watchlists (one per player).

## Invariants

1. Only a league member may manage a watchlist for that league. A user who is
   not a LeaguePlayer in the requested league receives a `FORBIDDEN` error.
2. A pool item can appear at most once per player's watchlist (enforced by the
   unique constraint).
3. Position values are zero-based integers. When an item is appended, its
   position is set to `max(existing positions) + 1`. An empty watchlist starts
   at position 0.
4. Reordering replaces all position values atomically in a single database
   transaction. Only items belonging to the requesting player are updated; the
   operation ignores IDs that do not belong to the player.
5. Deleting a LeaguePlayer or a DraftPoolItem cascades to remove the
   corresponding WatchlistItem rows automatically.

## Operations

| Operation | Description                                                               |
| --------- | ------------------------------------------------------------------------- |
| list      | Returns all watchlist items for the caller's player, ordered by position. |
| add       | Appends a pool item to the end of the watchlist.                          |
| remove    | Removes a pool item from the watchlist.                                   |
| reorder   | Replaces the full position sequence given an ordered list of item IDs.    |
