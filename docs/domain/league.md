# League

A league is the top-level organizing entity. A user creates a league, invites
others via an invite code, and the commissioner controls its lifecycle through
status transitions. The commissioner is initially the user who created the
league, but this role can be transferred to another player.

## Fields

### League

| Field        | Type               | Constraints               |
| ------------ | ------------------ | ------------------------- |
| id           | text (UUID)        | PK                        |
| name         | text               | NOT NULL                  |
| status       | league_status enum | NOT NULL, default `setup` |
| sport_type   | sport_type enum    | nullable                  |
| rules_config | jsonb              | nullable                  |
| max_players  | integer            | nullable                  |
| invite_code  | text               | NOT NULL, UNIQUE          |
| created_by   | text               | NOT NULL, FK → user.id    |
| created_at   | timestamptz        | NOT NULL, default now()   |
| updated_at   | timestamptz        | NOT NULL, default now()   |

### LeaguePlayer

| Field     | Type                    | Constraints                        |
| --------- | ----------------------- | ---------------------------------- |
| id        | text (UUID)             | PK                                 |
| league_id | text                    | NOT NULL, FK → league.id (cascade) |
| user_id   | text                    | NOT NULL, FK → user.id (cascade)   |
| role      | league_player_role enum | NOT NULL, default `member`         |
| joined_at | timestamptz             | NOT NULL, default now()            |

**Unique constraint:** (league_id, user_id) — a user can only be in a league
once.

## Relationships

- **League → User** (created_by): The user who originally created the league.
- **League → LeaguePlayer**: One-to-many. A league has many players.
- **LeaguePlayer → User**: Many-to-one. Each membership links to a user.

## Invariants

1. Every league has exactly one player with role `commissioner` — the league
   admin who controls its lifecycle.
2. A user cannot join a league they are already a member of (enforced by the
   unique constraint on league_id + user_id).
3. The `invite_code` is globally unique and generated server-side (8
   alphanumeric characters, excluding ambiguous characters like 0/O, 1/I/L).
4. Deleting a league cascades to all its LeaguePlayer rows.
5. Deleting a user cascades to their LeaguePlayer rows.

## State Transitions

```
setup → drafting → trading → competing → complete
```

Only the league commissioner may trigger status transitions. Transitions are
forward-only — a league cannot move backward in status.

**Prerequisites for setup → drafting:** The league must have `sportType` and
`rulesConfig` configured before it can advance from setup.

## Enums

### league_status

| Value     | Meaning                           |
| --------- | --------------------------------- |
| setup     | League created, accepting players |
| drafting  | Draft is in progress              |
| trading   | Trading period after draft        |
| competing | Active competition period         |
| complete  | League has concluded              |

### sport_type

| Value   | Meaning              |
| ------- | -------------------- |
| pokemon | Pokémon draft league |

### league_player_role

| Value        | Meaning                                         |
| ------------ | ----------------------------------------------- |
| commissioner | League admin, controls transitions and settings |
| member       | Regular participant                             |

## Rules Config (JSONB)

The `rules_config` field stores draft-related settings as a JSON object:

| Field                | Type                    | Description                       |
| -------------------- | ----------------------- | --------------------------------- |
| draftFormat          | `"snake"` \| `"linear"` | Draft pick order format           |
| numberOfRounds       | integer (≥ 1)           | Number of draft rounds            |
| pickTimeLimitSeconds | integer (≥ 1) \| null   | Seconds per pick, null = no limit |

## Max Players Enforcement

When `max_players` is set, the server rejects join attempts (via invite code)
when the league is at capacity. Leagues with `max_players = null` accept
unlimited members.
