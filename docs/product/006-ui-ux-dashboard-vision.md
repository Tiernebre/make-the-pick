# Dashboard UI/UX Vision

## Overview

The current UI is a minimal header plus a stack of Mantine cards. It works, but
it feels like a form wizard, not a product. Every page reads the same: a title,
a card, another card, a button. There is no sense of place, no sense that a
league is a _world_ you enter.

This document describes the next iteration: a **dashboard-style shell** with a
persistent, expandable left sidebar, and a **league dashboard** that treats each
league like a hub in a video game — not a settings page.

---

## Design Goals

1. **Place over pages.** The app should feel like somewhere you _are_, not a
   sequence of screens you click through. A sidebar anchors you. A league
   dashboard makes the league feel inhabited.
2. **Scannability over decoration.** Cards are great for two or three items and
   terrible for twenty. Dense, structured surfaces (tables, stat rows, grids)
   beat stacked cards for anything list-shaped.
3. **Game-like energy.** Pokémon drafting is playful. The UI should lean into
   that — status as a quest tracker, rosters as team cards, standings as a
   leaderboard, your profile as a trainer card. Not cartoonish, but unmistakably
   _themed_.
4. **Progressive disclosure.** The sidebar expands and collapses. The league
   dashboard surfaces what matters _right now_ (your next action) and hides the
   rest behind clearly labeled sections.

---

## The App Shell

### Left Sidebar (persistent, expandable)

Replaces the current top-only header. Mantine's `AppShell` already supports a
`navbar` slot — the change is structural, not a rewrite.

**Collapsed state:** icon rail (~60px). Just glyphs and tooltips. Good for power
users and smaller screens.

**Expanded state:** ~240px. Icons + labels + section grouping.

**Sections (top to bottom):**

- **Home** — a landing dashboard (see below). Replaces the current "My Leagues"
  list as the default route.
- **Leagues** — expandable group. Lists the user's active leagues as children,
  each linking to that league's dashboard. A "Browse all" item at the bottom
  opens the full leagues table.
- **Research** — first-class home for draft pool exploration, tier lists, notes,
  and watchlists. Currently these tools are buried inside the draft feature,
  which means they only exist while a draft is live. Pulling them into the
  sidebar turns research into a thing players do _between_ drafts — scouting the
  pool, building tier lists, taking notes on Pokémon, shaping watchlists. See
  "Research Section" below for detail.
- **Profile** — trainer card, history, stats across leagues.

**Footer of the sidebar:**

- User avatar + name (replaces the top-right menu). Click to open account menu
  (sign out, delete account, settings).
- Collapse/expand toggle.

**Header strip (thin, above main content):**

- Breadcrumbs (`Leagues / Johto Classic / Draft Room`).
- Context-specific actions on the right (e.g. "Go to Draft" when viewing a
  league that is drafting).
- No logo — the logo lives in the sidebar.

---

## Home Dashboard (new)

The default route after sign-in. A single glanceable screen that answers: _what
should I be doing right now?_

Zones:

- **Next action banner** — the single highest-priority call-to-action across all
  leagues. Examples: "You're on the clock in Johto Classic," "Draft starts in
  2h," "3 leagues waiting for you to join the draft."
- **Active leagues strip** — horizontally scrollable mini-cards, one per active
  league, showing status + your next thing to do in that league.
- **Recent activity feed** — picks made by friends, league status changes,
  invites received. Read-only, lightweight.
- **Quick actions** — "Create League," "Join by invite code."

This is the one place cards still make sense, because the content really is a
small set of heterogeneous things.

---

## Leagues: Table, not Cards

The current `LeagueListPage` stacks each league as a white card. At 3+ leagues
this already feels wasteful — lots of whitespace, little information.

### Replacement: Leagues Table

Columns:

| Column       | Notes                                                       |
| ------------ | ----------------------------------------------------------- |
| Name         | Click to enter the league dashboard.                        |
| Sport / Game | e.g. "Pokémon — Scarlet/Violet". Icon + text.               |
| Status       | Badge: `setup`, `drafting`, `active`, `complete`.           |
| Players      | `4 / 8` with a tiny avatar stack.                           |
| Your role    | `Commissioner` / `Player`.                                  |
| Next action  | "Draft starts 3/15", "You're on the clock", "Season active" |
| Created      | Relative date.                                              |

**Behavior:**

- Sortable columns (Mantine React Table is already a dependency — we use it on
  the draft pool page).
- Row hover highlights the entire row; whole row is clickable.
- Filter bar at the top: status chips (`All`, `Drafting`, `Active`, ...) and a
  name search.
- Top-right actions: `Create League`, `Join by invite code`.
- Empty state stays a warm, illustrated callout — not a table with no rows.

### Why a table

Leagues are a homogeneous list with structured attributes. A table compares them
at a glance. Cards hide that comparison behind visual noise.

---

## The League Dashboard (replaces League Detail Page)

This is the biggest shift. Today, `LeagueDetailPage` is a 600-line stack of
cards: info, settings, players, action buttons, modals. It reads like a form.

The new **League Dashboard** is the _hub_ for a league. When you enter a league
from the sidebar, you should feel like you've walked into its lobby.

### Mental Model

Think of the league as a world, and the dashboard as its main menu. Each
sub-area (settings, roster, draft room, standings, history) is a door. The
dashboard tells you:

- Where am I in the league's lifecycle? (the "quest tracker")
- Who else is here? (the party)
- What's the next thing I should do? (the call-to-action)
- What do I own? (my roster / trainer card)

### Layout

A responsive grid, not a stack. Rough zones:

**Hero strip (top, full-width)**

- League name, large.
- Game version + sport as chips (with game art as background accent).
- **Lifecycle tracker** — a horizontal stepper:
  `Setup → Drafting → Active → Complete`. The current phase is highlighted,
  previous phases are checked off, future phases are dimmed. This replaces the
  "Status badge" and makes the journey visible.
- Primary CTA on the right: whatever the player should do next (`Go to Draft`,
  `Make your pick`, `View standings`).

**Left column (main content, ~2/3 width)**

- **Your team panel** — trainer-card styled. Your player name, avatar, and a
  strip of your drafted Pokémon (or "no picks yet" placeholder before the
  draft). This is the emotional hook — your roster front-and-center every time
  you enter the league.
- **Standings / draft board preview** — depending on phase:
  - Setup: a "Who's in" list with avatars and a "Waiting for..." indicator.
  - Drafting: live draft board preview + "Jump into draft room" link.
  - Active/Complete: a standings leaderboard.

**Right column (sidebar within dashboard, ~1/3 width)**

- **League info** — invite code (with copy), created date, commissioner name.
- **Rules summary** — compact, read-only view of the settings (rounds, format,
  exclusions). A "Configure" button opens settings in a drawer or sub-route, not
  inline. Commissioner-only.
- **Recent activity** — latest picks, player joins, status changes.

**Footer row**

- Danger zone (advance status, delete league) — commissioner only, collapsed by
  default. Today these buttons sit flush next to normal actions, which is risky.

### Settings as a sub-route, not the whole page

Today, settings _are_ the league detail page. In the new model, settings live at
`/leagues/:id/settings`, opened via a sidebar entry under the league or a button
on the dashboard. That frees the dashboard to be a hub instead of a form.

---

## Research Section

Research is the scouting layer of the product. It is where players do the work
that makes the draft feel earned — reading the pool, forming opinions, and
committing those opinions to a structure they can act on when the clock is
ticking.

Today these tools only exist inside a live draft room: the draft pool page,
watchlists, and pool item notes are all locked behind a league that is actively
drafting. That is backwards. The most valuable prep happens _before_ the draft
starts, and the most valuable learning happens _between_ drafts.

### The Research Hub

A dedicated top-level destination in the sidebar, independent of any single
league. When a player enters Research, they see:

- **Pool explorer** — browse the full Pokémon pool for a chosen game version.
  Filter by type, generation, stats, BST, legendary/starter flags. This is
  essentially today's `DraftPoolPage`, lifted out of the draft room and given a
  permanent home.
- **Tier lists** — build and save personal tier lists (S/A/B/C/D or custom
  tiers). Drag-and-drop Pokémon between tiers. Tier lists are per-user and
  optionally per-game-version.
- **Notes** — free-form notes attached to a Pokémon. Already exists as
  `PoolItemNote`, but scoped to a draft. In the new model, notes belong to the
  _user_ and surface anywhere that Pokémon appears (research hub, draft pool,
  draft room).
- **Watchlists** — ordered lists of Pokémon the player is targeting. Today
  watchlists are per-draft. They should become reusable templates a player can
  apply to a league when it starts drafting.

### Research in Context

Research tools should also _follow the player into the draft room_. When
drafting, the same notes, watchlists, and tier lists are visible in the pick
panel — no duplication of data, no "research mode" vs "draft mode" divide. The
draft room becomes the place where research _pays off_, not where it starts.

### Why This Matters

The live draft is the climax. Research is the whole season leading up to it.
Making research a first-class section raises the ceiling of the product: it
gives committed players something to do when no draft is live, it creates a
reason to log in between leagues, and it rewards the kind of obsessive prep that
makes drafting feel meaningful.

A dedicated product vision doc may follow to flesh out tier lists and watchlist
templates in more depth. This section establishes that Research is a permanent
fixture of the app shell, not an accessory to the draft room.

---

## Mobile Vision (Future)

Desktop is the explicit first-class target. Drafts happen at a computer, the
draft board is wide, and the research hub needs real estate. But "desktop first"
should not mean "desktop only" — a meaningful share of presence moments (getting
notified it's your turn, checking standings, glancing at a roster, reading notes
on the couch) are phone moments. This section sketches how the dashboard vision
extends to mobile _later_, without locking us in now.

### Shell on Mobile

- The left sidebar becomes a **drawer** hidden behind a hamburger icon in a
  compact top bar. Tapping the hamburger slides it in from the left.
- The breadcrumb strip collapses to just the current page title.
- The sidebar footer (account menu) moves to a settings entry inside the drawer.
- Primary CTAs surface as a sticky action bar at the bottom of the screen so the
  most important action (`Make your pick`, `Go to Draft`) is always
  thumb-reachable.

### Home Dashboard on Mobile

- The "next action banner" becomes the entire first screen — large, obvious,
  tap-to-act.
- The active leagues strip stays horizontal (it already is) and scrolls with
  snap points.
- The activity feed stacks below.

### Leagues Table on Mobile

Tables are painful on phones. The table collapses to a **card list** — but
different from today's cards. Each row becomes a dense info tile: league name,
status chip, next-action line, tiny avatar stack. No wasted whitespace, still
scannable. The filter chips stay at the top; the column sort becomes a single
"Sort" dropdown.

This is the one place cards come back on mobile, and that's fine — the _reason_
we moved to a table on desktop was comparison across columns, and that
comparison is impossible on a phone regardless of layout.

### League Dashboard on Mobile

The two-column grid collapses into a single vertical flow, ordered by priority:

1. Hero strip with league name + lifecycle stepper (the stepper shrinks to
   just-the-current-phase with tap-to-expand).
2. Primary CTA (pinned to the bottom as a sticky action bar).
3. Your team panel (trainer card).
4. Standings / draft board preview.
5. League info and rules summary in collapsible accordions.
6. Danger zone at the very bottom, collapsed.

### Draft Room on Mobile (the hardest case)

The draft room on mobile is a real design problem and probably the reason mobile
gets punted. The draft board is inherently wide. Options worth exploring when we
get there:

- **Tabs** — Board / Pick / Roster as three full-screen tabs with a bottom tab
  bar, so each surface gets the full viewport.
- **Pick-first mode** — on mobile, the pick panel is the default view; the board
  is a swipe-away secondary surface. This matches the mobile use case: _I'm on
  the clock, let me pick_, not _I want to study the board_.
- **Spectator mode** — a read-only compact view for players who aren't on the
  clock and just want to follow along from their phone.

None of this needs to ship with the dashboard redesign. It just needs to be
_possible_ — which the sidebar-drawer pattern already guarantees.

### What We Commit to Now

We won't implement the mobile experience in the first pass of this vision, but
we will:

1. Use a responsive foundation (Mantine's breakpoint system, `AppShell`'s
   built-in `navbar.breakpoint` collapse behavior).
2. Avoid any desktop pattern that _forbids_ a mobile adaptation (no hover-only
   interactions, no components that require a pointer device).
3. Keep component layouts flex/grid-based so the collapse-to-single-column
   rewrite is a CSS job, not a component rewrite.

---

## Game-Feel Details

Small touches that push the dashboard from "web app" toward "game lobby":

- **Lifecycle stepper with subtle animation** when a phase advances.
- **Trainer card** styling for the "your team" panel — avatar, name, league
  record, favorite type, in a card with a subtle border treatment evoking a
  Pokémon trainer ID.
- **Roster reveals** — drafted Pokémon slide in rather than popping.
- **Soundless but readable motion** — hover states, phase transitions, pick
  notifications. Never gratuitous.
- **Empty states with personality** — "No leagues yet. Your adventure starts
  here." Not "You have no leagues."

We are _not_ building pixel art, sound effects, per-league theming, or
gamification loops (XP/badges) in this pass. The mint-green brand color remains
the single accent across the entire app — every league lives in the same visual
world. The goal is _themed polish_, not a re-skin.

---

## What Stays the Same

- Mantine is the component library. No framework swap.
- `mantine-react-table` handles the leagues table (already a dep).
- `@tabler/icons-react` for the sidebar.
- Wouter routing. The new routes slot in alongside existing ones.
- The mint-green theme color stays as the single brand accent across the entire
  app. No per-league tinting.
- The draft room itself — it was redesigned recently and is working. This vision
  does not touch it beyond adding it as a linked destination from the league
  dashboard.

---

## Phased Rollout (suggested, non-binding)

1. **Shell** — convert `AppShell` to include a left navbar. Move account menu
   into it. Add collapse/expand. No route changes yet.
2. **Leagues table** — replace cards on `LeagueListPage` with a
   `mantine-react-table`-powered table.
3. **Home dashboard** — new default route with the "next action" banner and
   active leagues strip.
4. **League dashboard** — redesign `LeagueDetailPage` into the hub layout.
   Extract settings into a sub-route.
5. **Game-feel polish** — lifecycle stepper, trainer card, per-league accent.

Each phase is independently shippable and testable. Earlier phases do not block
later ones from being re-scoped.

---

## Open Questions

- Do we want the sidebar to remember its collapsed/expanded state per device
  (localStorage) or per user (server-persisted)?
- Tier lists and watchlist templates are mentioned in the Research section but
  not fully specified. Do they warrant a follow-up product vision doc, or can
  they be scoped inside implementation plans?
- When research tools follow the player into the draft room, how do we handle
  conflicts between a reusable watchlist template and a draft-specific one — is
  the draft a copy-on-entry, or does it stay linked to the source?
