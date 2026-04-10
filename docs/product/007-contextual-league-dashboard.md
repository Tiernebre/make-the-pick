# Contextual League Dashboard

## Overview

Today the sidebar is global. It lists Home, a Leagues dropdown, and a couple of
"Soon" placeholders. When you open a specific league, the sidebar does not
change — every league-specific destination (detail, draft room, draft pool,
settings) is reached by clicking into the page body or through a breadcrumb.

That works while a league has three or four pages. It does not scale. As the
league surface grows — standings, picks, matchups, chat, history, commissioner
tools — there is nowhere for those destinations to live in the global nav
without either drowning the sidebar or burying them inside the page content.

This document describes the next step: **when a user opens a league, the sidebar
becomes that league's dashboard.** Home stays the global landing page. Leagues
stay listed in the global nav. But the moment you are inside `/leagues/:id/*`,
the sidebar expands to surface that league's own sections, and contracts back to
global nav the moment you leave.

This is the piece
[006-ui-ux-dashboard-vision.md](./006-ui-ux-dashboard-vision.md) left open. That
doc described the global shell and the home dashboard. It did not define what
the shell does when you step _into_ a league. This one does.

---

## Design Goals

1. **A league is a place you enter, not a page you open.** The sidebar visibly
   changing is the strongest possible signal that you are now "in" something. It
   mirrors how Discord swaps the channel list when you pick a server, or how
   GitHub swaps the sidebar when you enter a repo.
2. **Keep the global nav reachable.** Entering a league must never trap the
   user. Home, the full Leagues list, and account controls stay one click away.
3. **Let the league surface grow.** The contextual sidebar is the pressure
   valve. New league features (standings, picks, chat, history, commissioner
   tools) get a home immediately, without fighting for space in the global nav.
4. **No new routing concepts.** The league routes already nest under
   `/leagues/:id/*`. The sidebar should follow the URL, not the other way around
   — no route rewrites, no layout route refactor required to ship v1.

---

## The Two Sidebar Modes

### Global mode (default)

What exists today. Shown on Home, the Leagues list, Research, Profile, and any
route that is not nested under a specific league.

- Home
- Leagues (expandable, lists user's active leagues)
- Research _(Soon)_
- Profile _(Soon)_
- Footer: avatar, account menu, collapse toggle

No change from the current layout in
[`client/src/components/AppLayout.tsx`](../../client/src/components/AppLayout.tsx).

### League mode (new)

Triggered whenever the current route matches `/leagues/:id/*`. The sidebar
reorganizes around that league.

**Top of sidebar — league identity strip:**

- League name (truncates at ~22 chars).
- Status pill (`Setup`, `Drafting`, `Competing`, `Complete`) using the same
  colors as the league status system.
- A small "← All leagues" affordance that returns to global mode and the leagues
  list. This is the escape hatch.

**Contextual nav (league-specific sections):**

The exact items depend on league status, but the full set looks like:

- **Overview** — `/leagues/:id` — the existing LeagueDetailPage, reframed as the
  league's home.
- **Draft Room** — `/leagues/:id/draft` — only visible once status ≥ `Drafting`.
  Disabled with a "Draft hasn't started" tooltip during setup.
- **Draft Pool** — `/leagues/:id/draft/pool` — research/notes/watchlists scoped
  to this league's pool.
- **Standings** — _not built yet_ — live leaderboard once competing.
- **Picks** — _not built yet_ — your weekly picks for this league.
- **Members** — roster of league players, trades, invite code.
- **Settings** — `/leagues/:id/settings` — commissioner-only. Hidden for
  non-commissioners.

Items that do not yet exist can ship as disabled stubs with "Soon" badges, the
same pattern 006 already uses for Research and Profile. This is how the sidebar
absorbs the roadmap without waiting for every page to be built.

**Below the contextual nav — a thin divider, then the minimized global nav:**

- Home (icon + label)
- Leagues (icon + label, not expanded)
- Account footer (unchanged)

The global items collapse to a quieter treatment (smaller, muted) so the
league's own nav is visually dominant. You are _inside_ this league; the rest of
the app is still reachable but recedes.

### Transitions

- Entering a league (clicking a league card on Home, a league in the Leagues
  dropdown, or an invite link) swaps the sidebar into league mode.
- Leaving a league (clicking Home, Leagues, "All leagues", or any non-league
  route) swaps it back.
- The swap should be a fade/slide, not an instant repaint — the animation is
  what sells "I entered a place."

---

## What Lives Where

A running question as the league surface grows: does this new thing belong on
Home, on the league dashboard, or in the global nav? The contextual sidebar
gives us a clean rule.

| Belongs on Home                         | Belongs in the league sidebar            |
| --------------------------------------- | ---------------------------------------- |
| "What should I do next?" across leagues | "What can I do inside _this_ league?"    |
| Quick-create / quick-join actions       | Draft, picks, standings, settings        |
| Activity feed across leagues            | Activity feed for this league            |
| Trainer card, cross-league stats        | This league's roster, rules, invite code |

If a thing only makes sense in the context of one league, it belongs in the
league sidebar. If it aggregates across leagues, it belongs on Home or in the
global nav.

---

## Why Not Just Add More Global Nav Items?

The obvious alternative is to keep the sidebar global and cram more items into
it — Standings, Draft, Picks as top-level entries that read the "current league"
from context. Rejected because:

- **Context is invisible.** A top-level "Draft" link only makes sense if the
  user remembers which league is "current." That is fine for the user with one
  league, terrible for the user with five.
- **The sidebar runs out of room.** Every new league feature fights Research,
  Profile, and the leagues list for vertical space.
- **It flattens a hierarchy that is naturally nested.** A league _contains_ a
  draft, picks, standings. The sidebar should reflect that containment.

The contextual approach uses the URL itself as the source of truth for which
league is current, and gives that league a sidebar of its own while you are
inside it.

---

## Scope of v1

The smallest version that delivers the vision:

1. Detect league routes via the existing Wouter location and derive
   `currentLeagueId`.
2. Render a new `<LeagueSidebar leagueId=... />` component when that id is
   present; render the existing global sidebar otherwise.
3. Populate the league sidebar with the pages that already exist: Overview,
   Draft Room, Draft Pool, Members (derived from LeagueDetailPage sections),
   Settings (commissioner-gated).
4. Keep Home, Leagues, and the account footer accessible in the muted secondary
   region at the bottom.
5. Add the status pill + league name strip at the top.

Out of scope for v1: Standings, Picks, per-league activity feed, chat, the slide
animation. Those are all additive — the sidebar is the hook they plug into, not
a precondition.

---

## Open Questions

- **Mobile.** The sidebar collapses to an icon rail on narrow viewports today.
  In league mode, does the rail show league-specific glyphs, or does it fall
  back to global? Leaning toward league-specific with a small league avatar at
  the top so the user still knows where they are.
- **Multi-league context switcher.** Should the league name strip at the top be
  a dropdown, letting the user jump sideways between their leagues without going
  back to Home? Nice-to-have, not required for v1.
- **Commissioner tools.** As commissioner tooling grows (scheduling,
  tiebreakers, manual overrides), does it get its own sidebar section or stay
  nested under Settings? Revisit when there are more than ~3 commissioner
  destinations.
