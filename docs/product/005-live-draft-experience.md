# Live Draft Experience — Product Vision

## Overview

The draft is the main event. Everything else — pool generation, research,
watchlists, tier lists — builds anticipation for this moment. When the
commissioner hits "Start Draft," every player is in the same room, picks are
flying, strategies are colliding, and the clock is ticking.

This document defines the live draft experience: what players see, how turns
work, what the commissioner controls, and how the draft room brings the event to
life.

---

## Design Goals

The live draft should feel like a **real-time event**, not a form submission.
Three qualities to optimize for:

1. **Presence** — every player feels connected to the same moment. When someone
   picks, everyone sees it instantly.
2. **Pressure** — your turn arrives and the clock is running. You've done your
   homework. Now execute.
3. **Drama** — the pick that steals your target, the sleeper nobody saw coming,
   the last-second decision. The draft should generate stories.

---

## The Draft Room

### What It Is

A shared, real-time page that all league players see during the draft. The draft
room is the single screen for the entire event — no navigating away.

### Layout

The draft room has four zones:

```
+---------------------------------------------+
|              DRAFT HEADER                    |
|  Round 3 of 6  |  Pick 14 of 36  |  Snake   |
+---------------------------------------------+
|                    |                         |
|   DRAFT BOARD      |   PICK PANEL            |
|   (pick history    |   (available pool,      |
|    grid)           |    your watchlist,      |
|                    |    search + filter)     |
|                    |                         |
|                    |                         |
+---------------------------------------------+
|              ROSTER STRIP                    |
|  Your picks: Garchomp | Gengar | ...         |
+---------------------------------------------+
```

#### Draft Header

Top bar showing draft state at a glance:

- Current round and total rounds
- Current pick number and total picks
- Draft format (Snake)
- **Whose turn it is** — player name, prominently displayed
- **Pick timer** — countdown if pick time limit is configured. Visual urgency as
  time runs low (color shift, pulse animation).
- Draft status indicator (pending / in progress / complete)

#### Draft Board

The central artifact of the draft — a grid showing every pick that's been made.

- **Rows = rounds**, **columns = players** (ordered by first-round pick order)
- Each cell shows: Pokemon sprite, name, and the round/pick it was taken
- Snake order is visually indicated — arrow direction alternates each row
- **Current pick cell is highlighted** — pulses or glows to show where the next
  pick lands
- Empty cells show the player who will pick there (helps players count ahead)
- Clicking any filled cell shows the Pokemon's stats and metadata

The board is the **shared truth** — everyone sees the same board, updated in
real-time.

#### Pick Panel

The right side of the screen, contextual to whose turn it is:

**When it's your turn:**

- **Available pool** — all unpicked Pokemon, searchable and filterable
- **Your watchlist** — prioritized list with the top available item highlighted
- **Quick pick** — click any Pokemon, confirm in a modal: "Draft [Pokemon]? This
  cannot be undone."
- Filters: type, name search, sort by stat
- Pokemon that have been picked are removed from the available list

**When it's not your turn:**

- Same available pool view (read-only — no pick button)
- Your watchlist, so you can plan ahead
- "On deck" indicator if you're picking next

#### Roster Strip

A horizontal bar at the bottom showing **your** drafted Pokemon:

- Ordered by pick round
- Shows sprite, name, and type badges
- Expandable to see full stats
- Always visible — you can see your team taking shape

---

## Pick Flow

### Making a Pick

1. It becomes your turn. The draft header updates, your pick panel activates,
   and a notification fires ("It's your turn!").
2. Browse the available pool or reference your watchlist.
3. Click a Pokemon. A confirmation dialog appears:
   - Pokemon name, sprite, stats summary
   - "Draft [Pokemon]?" with Confirm and Cancel buttons
   - This confirmation prevents misclicks — picks are irreversible
4. Confirm. The pick is recorded:
   - Draft board updates for all players instantly
   - Pokemon is removed from the available pool for everyone
   - Your roster strip updates
   - `current_pick` advances
   - If the Pokemon was on anyone's watchlist, it silently disappears from their
     list
5. The next player's turn begins.

### Pick Timer (Optional)

If the commissioner configured `pickTimeLimitSeconds`:

- A countdown timer appears in the draft header when a player's turn starts
- Timer is visible to all players (adds social pressure)
- **Warning threshold** — visual/audio cue at 30 seconds remaining, another at
  10 seconds
- **Time expires** — the system auto-picks the highest-BST available Pokemon.
  This keeps the draft moving and penalizes indecision.
- Auto-picks are marked distinctly on the draft board ("auto-picked" badge) so
  everyone knows

If no time limit is set, turns have no expiration. The draft proceeds at the
group's natural pace.

### Snake Order

Players should always know when their next pick is coming:

- The draft board shows empty cells with player names, making it easy to count
  ahead
- An "on deck" indicator appears when you're picking next
- The header shows "Your next pick: Round 4, Pick 21" somewhere accessible

Snake reversal should be visually clear on the board — arrows or alternating row
direction so nobody is confused about the order.

---

## Commissioner Controls

The commissioner has additional controls during the draft:

### Start Draft

- Button on the draft room page (or the league page) when draft status is
  `pending`
- Confirms: "Start the draft? All players will be notified."
- Sets draft status to `in_progress`, sets `started_at`
- Randomizes `pick_order` if not already set (or commissioner can manually set
  order before starting — see below)

### Pick Order Configuration

Before starting the draft, the commissioner can:

- **Randomize** — shuffle the pick order (default)
- **Manual order** — drag players into the desired first-round order
- **Lottery** — randomized with a reveal animation (fun, but a v2 feature)

The pick order is locked once the draft starts.

### Pause / Resume

- Commissioner can pause the draft mid-pick (e.g., someone disconnected, need a
  break)
- Pausing stops the pick timer and shows a "Draft Paused" overlay to all players
- Only the commissioner can resume
- Minimal — this is an emergency tool, not a standard flow

### Undo Last Pick

- Commissioner can undo the most recent pick (e.g., someone picked the wrong
  Pokemon by mistake)
- Returns the Pokemon to the pool, decrements `current_pick`
- Shows a "Pick undone" notification to all players
- Only works for the **last** pick — can't undo multiple picks or skip back
- Requires confirmation: "Undo [Player]'s pick of [Pokemon]?"

---

## Real-Time Architecture

The draft is a **real-time, multi-player experience**. Every player sees the
same state at the same time.

### Events

The server broadcasts events to all connected players:

| Event               | Payload                                        | Trigger                            |
| ------------------- | ---------------------------------------------- | ---------------------------------- |
| `draft:started`     | draft state, pick order                        | Commissioner starts draft          |
| `draft:pick_made`   | pick details (player, Pokemon, pick #, round)  | A pick is confirmed                |
| `draft:turn_change` | current player ID, pick number, timer deadline | After each pick                    |
| `draft:paused`      | —                                              | Commissioner pauses                |
| `draft:resumed`     | timer deadline (reset)                         | Commissioner resumes               |
| `draft:pick_undone` | pick that was removed                          | Commissioner undoes a pick         |
| `draft:completed`   | final standings, all picks                     | Last pick is made / pool exhausted |
| `draft:auto_pick`   | pick details + auto-pick flag                  | Timer expired                      |

### Connection Handling

- Players connect when they open the draft room
- **Reconnection** — if a player disconnects and reconnects, they receive the
  full current draft state (not a replay of events). The draft board rebuilds
  from the current snapshot.
- **Offline players** — the draft continues without them. If it's their turn and
  they're offline, the pick timer runs. If it expires, auto-pick fires.
- **Connection indicator** — show which players are currently connected. Helps
  the commissioner decide whether to pause if someone drops.

### Optimistic Updates

When a player confirms a pick:

1. **Client immediately updates** the local draft board (optimistic)
2. Server validates and broadcasts to all other players
3. If validation fails (race condition — someone else picked that Pokemon), roll
   back the optimistic update and show an error: "That Pokemon was just picked.
   Choose another."

This keeps the experience snappy. Validation failures should be rare but handled
gracefully.

---

## Draft Completion

When the final pick is made (or the pool is exhausted):

1. Draft status transitions to `complete`, `completed_at` is set
2. All players see a **"Draft Complete"** screen
3. The draft board is fully filled — a complete record of the event
4. Each player sees their final roster with full stats
5. Transition to post-draft: awards, prediction reveals (if those features
   exist), tier list sharing

The completed draft board remains viewable after the draft — it's the permanent
record. Players should be able to revisit it from the league page.

---

## Notifications

Players need to know when things happen, especially if they're not staring at
the screen:

- **"It's your turn!"** — browser notification + in-app alert when your pick
  comes up. This is the most critical notification.
- **"Draft starting in 5 minutes"** — if the commissioner schedules a start time
  (future feature)
- **"[Player] picked [Pokemon]"** — optional in-app toast for each pick
- **Sound effects** — pick sound on each selection, distinct sound for "your
  turn." Optional, toggleable per player.

### Browser Notifications

Request notification permission when the player enters the draft room. Crucial
for the common case where someone tabs away between picks.

---

## Spectator Mode

Non-league-members (or league members who aren't participating) can watch the
draft:

- See the draft board in real-time
- Cannot make picks
- No access to anyone's watchlist or research
- Useful for friends who want to follow along

Spectator access is controlled by a league setting: public (anyone with the
link) or private (league members only). Default: private.

---

## Mobile Considerations

The draft room must work on mobile — players will be on their phones:

- **Draft board** — horizontal scroll for columns, sticky current-round row
- **Pick panel** — full-screen overlay when it's your turn, dismiss when done
- **Watchlist** — collapsible drawer from the bottom
- **Roster strip** — horizontal scroll, always visible at bottom
- **Touch targets** — pick confirmation buttons must be large and deliberate (no
  accidental picks)
- **Reduced animations** — keep it fast on lower-end devices

---

## Edge Cases

### Pool Exhaustion

If the pool runs out before all rounds are complete, the draft ends early.
`completed_at` is set, status moves to `complete`. Players may have unequal
roster sizes if the pool runs out mid-round — document this as a known
possibility driven by `poolSizeMultiplier` configuration.

### Single Pick Remaining

When only one Pokemon is left in the pool and it's someone's turn, auto-pick it
immediately (no point making them choose). Or show a streamlined "Last pick!"
message.

### All Players Disconnect

If every player disconnects, the draft state is preserved on the server. When
anyone reconnects, they see the current state. No data is lost.

### Commissioner Leaves

If the commissioner disconnects, the draft continues (they're just another
player for picking purposes). Commissioner controls are unavailable until they
reconnect. The pick timer still runs.

---

## What This Doc Does NOT Cover

These are related but separate product concerns:

- **Draft pool generation** — covered in the domain doc and existing
  implementation
- **Research tools (watchlist, tier list, notes)** — covered in
  [003-personal-research-tools.md](./003-personal-research-tools.md)
- **Post-draft awards and predictions** — covered in
  [004-social-competition.md](./004-social-competition.md)
- **Trade phase** — not yet designed, comes after draft completion
- **NPC/bot players for testing** — covered in
  [decisions/005-npc-ai-draft-testing.md](../decisions/005-npc-ai-draft-testing.md)

---

## Phasing

### Phase 1: Core Pick Loop

The minimum viable live draft:

- Draft board grid with real-time updates
- Pick panel with available pool + search/filter
- Pick confirmation flow
- Snake draft order calculation
- Turn indicator (whose turn, on deck)
- Draft completion screen
- Watchlist visible during draft

**Server work:**

- `DraftPick` table in schema
- Draft service: `makePick`, `getCurrentTurn`, `validatePick`
- Draft router with pick mutation
- Real-time event broadcast (SSE or WebSocket)

**Client work:**

- Draft room page with board + pick panel + roster strip
- Real-time event subscription
- Pick confirmation modal
- Available pool with search/filter (reuse draft pool table components)

### Phase 2: Timer and Auto-Pick

- Pick timer countdown with visual urgency
- Server-side timer enforcement
- Auto-pick on expiration (highest BST available)
- Timer visible to all players

### Phase 3: Commissioner Controls

- Pause/resume
- Undo last pick
- Manual pick order configuration before start

### Phase 4: Polish

- Browser notifications
- Sound effects (toggleable)
- Connection status indicators
- Spectator mode
- Mobile optimization
- Reconnection handling with state sync

---

## Open Questions

1. **Real-time transport** — SSE (server-sent events) or WebSockets? SSE is
   simpler and sufficient for a broadcast model (server to all clients).
   WebSocket is needed only if we want client-to-client features. Recommend
   **SSE for v1**.
2. **Pick order randomization timing** — randomize when the commissioner clicks
   "Start Draft", or allow setting it during setup? Randomize-on-start is
   simpler. Pre-set order is more flexible (lets commissioner announce order
   before draft day).
3. **Auto-pick strategy** — highest BST is the simplest default. Should players
   be able to configure their own auto-pick priority (e.g., "auto-pick from my
   watchlist")? That's a great v2 feature.
4. **Draft scheduling** — should the commissioner be able to schedule a start
   time? "Draft starts at 8pm Saturday." Players get a countdown and reminders.
   Adds complexity but solves coordination.
5. **Chat** — should the draft room have a built-in chat? It adds to the social
   experience but the initial brainstorm decided to lean on Discord for social.
   A lightweight chat (text only, no threads) could be a Phase 4 addition.
6. **Pick history feed** — besides the board grid, should there be a
   chronological pick-by-pick feed (like a log)? Useful for catching up after
   reconnecting. The board already shows this information spatially, so it may
   be redundant.
7. **Draft room entry** — should players be able to enter the draft room before
   it starts (lobby)? A pre-draft lobby where everyone gathers and the
   commissioner hits start would build anticipation. But it also means building
   a "waiting room" state.

---

## Success Metrics

- **Draft completion rate** — what percentage of started drafts reach
  completion? Drops indicate UX friction or disconnection issues.
- **Average pick time** — how long do players take per pick? Faster isn't always
  better, but extremely long picks suggest UI confusion.
- **Auto-pick rate** — high auto-pick rates suggest timers are too short or
  players are disengaged.
- **Return to draft board** — do players revisit the completed draft board? If
  so, it's serving as a meaningful record.
- **Time to first pick** — how long between "Start Draft" and the first pick?
  Should be near-instant if the UX is clear.
