# User

A user is an authenticated human (or NPC) account. Users are created by the
authentication provider (Better Auth) and are the root identity that all other
domain entities — leagues, picks, watchlists, notes — hang from.

## Fields

### User

| Field         | Type        | Constraints               |
| ------------- | ----------- | ------------------------- |
| id            | text        | PK (set by auth provider) |
| name          | text        | NOT NULL                  |
| email         | text        | NOT NULL, UNIQUE          |
| emailVerified | boolean     | NOT NULL                  |
| image         | text        | nullable                  |
| isNpc         | boolean     | NOT NULL, default `false` |
| npcStrategy   | text        | nullable                  |
| createdAt     | timestamptz | NOT NULL                  |
| updatedAt     | timestamptz | NOT NULL                  |

### Session

Managed by the auth layer. Each session token is unique and expires at a
configured time. Sessions cascade-delete when the owning user is deleted.

### Account

Links a user to an external OAuth provider (e.g. Google). A user may have
multiple accounts (one per provider). Accounts cascade-delete when the owning
user is deleted.

## Relationships

- **User → Session**: One-to-many. A user may have multiple active sessions.
- **User → Account**: One-to-many. A user may authenticate via multiple
  providers.
- **User → LeaguePlayer**: One-to-many. A user may be a member of many leagues.
- **User → League** (created_by): One-to-many. A user may have created many
  leagues.

## Invariants

1. The user's `id` is assigned by the authentication provider, not generated
   server-side.
2. `email` must be globally unique — the auth layer enforces this.
3. Deleting a user cascades to their sessions, accounts, and league memberships
   (LeaguePlayer rows).
4. Application code exposes only one user-facing mutation: `deleteAccount`,
   which removes the user by ID and relies on database cascades to clean up all
   related data.

## NPC Users

When `isNpc` is `true`, the user is a non-player character injected into a
league for development and testing purposes. NPCs are never real OAuth accounts.
The optional `npcStrategy` field is reserved for future configuration of how an
NPC selects picks during a draft (e.g. random selection). See the league domain
doc for how NPCs are added to leagues and how auto-pick is triggered.
