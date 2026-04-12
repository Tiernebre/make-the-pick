# ADR-007: Logging Strategy

## Status

Accepted (2026-04-12)

## Context

Production logs were dominated by HTTP request/response entries (every `GET`,
`POST`, etc.) logged at `info` level by the request middleware. Meanwhile, every
business event — draft picks, league creation, user joins — was logged at
`debug` and invisible in production because the logger is configured to `info`
in production.

The result: tailing production logs showed a wall of routing noise with zero
insight into what the application was actually _doing_. Investigating an
incident required either changing the log level to debug (noisy, expensive) or
grepping through raw database state.

### Logger setup

The application uses [Pino](https://getpino.io/) with a single configuration in
`server/logger.ts`:

- **Production** (`DENO_ENV=production`): `info` level
- **Development**: `debug` level

Each module creates a child logger with a `module` field for filtering (e.g.,
`logger.child({ module: "draft.service" })`). The request-context middleware
adds `requestId` and `userId` fields to per-request child loggers.

## Decision

Adopt a log-level strategy based on **what the log tells you**, not where the
code lives:

### Info — business state changes

Log at `info` when the application **changes state** in a way that matters to
operators. These are the events you want to see when tailing production logs
during normal operation or reconstructing what happened during an incident.

Examples:

| Domain | Events                                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft  | starting, making pick, auto-pick, NPC auto-pick, commissioner override, commissioner force auto-pick, pausing, resuming, undoing pick, setting fast mode |
| League | creating, deleting, settings updated, status advanced, user joined, NPC added, player removed, player left                                               |
| User   | account deleted                                                                                                                                          |

Every info log should include structured context fields (`userId`, `leagueId`,
`poolItemId`, etc.) so logs are searchable and correlatable.

### Debug — everything else in application code

Log at `debug` for operational detail that is useful when actively investigating
but would drown out business events in production:

- **Read-only lookups**: fetching a league by ID, listing players, getting draft
  state
- **Validation and auth checks**: "user is not commissioner", "league is full"
  (these lead to 4xx errors which are already logged at `warn`)
- **Repository-level queries**: individual database operations
  (`findByLeagueId`, `insertDraft`, etc.)
- **Request context**: tRPC context creation, authenticated procedure calls
- **Successful HTTP responses**: `GET /api/...` 2xx/3xx logs from the request
  middleware

### Warn — expected failure paths and client errors

Log at `warn` for situations that aren't crashes but indicate something
noteworthy:

- HTTP 4xx responses (client errors, handled by request middleware)
- Fallback paths that recovered gracefully (e.g., queue lookup failed, fell back
  to BST)
- Initialization issues (e.g., timer fired with no handler wired)

### Error — unexpected failures

Log at `error` when something broke that shouldn't have:

- HTTP 5xx responses
- Uncaught exceptions in event listeners, SSE connections, timer handlers
- tRPC internal errors

### Where each layer logs

| Layer              | Typical level                                        | Rationale                                                                           |
| ------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Service            | `info` for state changes, `debug` for lookups        | Services contain business logic — their state-change logs are the narrative         |
| Repository         | `debug`                                              | Data-access detail, useful for query debugging only                                 |
| Middleware         | `debug` for 2xx/3xx, `warn` for 4xx, `error` for 5xx | Request logs are routing noise at info; errors and client issues deserve visibility |
| tRPC error handler | `error`                                              | Unexpected server errors need attention                                             |

## Consequences

### What becomes easier

- **Incident investigation** — production info logs tell the story of what
  happened ("user X joined league Y, draft started, pick made") without changing
  log levels
- **Monitoring** — info-level log volume becomes proportional to business
  activity, not HTTP traffic, making anomaly detection meaningful
- **Onboarding** — new contributors can look at the level guidelines to decide
  where a new log statement belongs

### What becomes harder

- **Request-level debugging in production** — successful HTTP request logs are
  now at debug, so you won't see them in production without raising the log
  level. This is an intentional trade-off: request tracing is available via
  `requestId` correlation when needed
- **Discipline** — every new log statement requires a judgment call about level.
  The rule of thumb: "Would I want to see this line when tailing production logs
  to understand what users are doing?" If yes, `info`. If no, `debug`.
