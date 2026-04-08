# League

A league is the top-level organizing entity. A user creates a league, invites
others via an invite code, and controls its lifecycle through status
transitions.

## Fields

### League

| Field        | Type               | Constraints               |
| ------------ | ------------------ | ------------------------- |
| id           | text (UUID)        | PK                        |
| name         | text               | NOT NULL                  |
| status       | league_status enum | NOT NULL, default `setup` |
| rules_config | jsonb              | nullable                  |
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

- **League → User** (created_by): The user who created the league.
- **League → LeaguePlayer**: One-to-many. A league has many players.
- **LeaguePlayer → User**: Many-to-one. Each membership links to a user.

## Invariants

1. Every league has exactly one player with role `creator` — the user referenced
   by `created_by`.
2. A user cannot join a league they are already a member of (enforced by the
   unique constraint on league_id + user_id).
3. The `invite_code` is globally unique and generated server-side (8
   alphanumeric characters, excluding ambiguous characters like 0/O, 1/I/L).
4. Deleting a league cascades to all its LeaguePlayer rows.
5. Deleting a user cascades to their LeaguePlayer rows.

## State Transitions

The `league_status` enum currently contains only `setup`. Future statuses will
be added as features are built:

```
setup → drafting → trading → competing → complete
```

Only the league creator may trigger status transitions. Transitions are
forward-only — a league cannot move backward in status.

## Enums

### league_status

| Value | Meaning                           |
| ----- | --------------------------------- |
| setup | League created, accepting players |

### league_player_role

| Value   | Meaning                                  |
| ------- | ---------------------------------------- |
| creator | Created the league, controls transitions |
| member  | Regular participant                      |
