# Personal Research Tools — Product Vision

## Overview

Before a draft, every serious player does homework. In fantasy football, people
spend hours ranking players, building tier lists, and marking sleepers. The
draft pool research phase should feel the same way — a private workspace where
you prepare your strategy, knowing that your opponents are doing the same thing.

These tools are **private by default**. No other player can see your research.
This privacy is what makes the tools valuable — your preparation is your
competitive edge.

---

## Feature: Watchlist

### What It Is

A personal list of Pokemon you're interested in drafting, ordered by priority.
Think of it as your "big board" — the ranked list you'll reference during the
live draft.

### How It Works

- **Add to watchlist**: Click a star/bookmark icon on any Pokemon in the pool
  table. The Pokemon is added to the bottom of your watchlist.
- **Reorder**: Drag-and-drop to rank your watchlist by pick priority. Your #1 is
  the Pokemon you most want to draft.
- **Remove**: Un-star to remove from watchlist.
- **Watchlist view**: Toggle to show only watchlisted Pokemon, filtered out of
  the main table. Or view as a separate sidebar/panel.
- **Persistence**: Watchlist saves automatically and persists across sessions.
  Come back tomorrow and your list is still there.

### Draft Day Integration

This is where the watchlist becomes truly valuable:

- **Visible during live draft** — your watchlist appears alongside the draft
  board so you always know your next target.
- **Auto-removes picked Pokemon** — when any player (including you) drafts a
  Pokemon, it disappears from your watchlist. Your list stays clean and
  actionable.
- **"Next best available"** — at a glance, you can see the highest-ranked
  Pokemon on your watchlist that's still available. No scrambling during your
  pick timer.

### Data Model

```
watchlist_item
  id: UUID (PK)
  league_player_id: UUID (FK -> league_player.id)
  draft_pool_item_id: UUID (FK -> draft_pool_item.id)
  position: integer (ordering within the watchlist)
  created_at: timestamptz

  UNIQUE(league_player_id, draft_pool_item_id)
```

Scoped to `league_player` (not user) so a player can have different watchlists
in different leagues. Position is an integer for ordering — gaps are fine (1, 5,
10) to make reordering cheap.

### UX Considerations

- The star icon should be prominent but not distracting. It's the primary
  interaction on the pool table.
- Drag-and-drop reordering should feel snappy. Consider optimistic updates.
- The watchlist panel during draft day should be collapsible — some players may
  prefer to draft by gut feel.
- Mobile: drag-and-drop is harder on touch. Consider up/down arrow buttons as an
  alternative.

---

## Feature: Personal Tier List

### What It Is

A visual tier list builder where you categorize every Pokemon in the pool into
ranked tiers. Unlike the watchlist (which is a flat priority list), the tier
list groups Pokemon into buckets — "S-tier Pokemon I'll fight for", "B-tier
solid picks", "D-tier only if nothing else is left."

### How It Works

- **Default tiers**: S, A, B, C, D, and an "Unranked" bucket that starts with
  all Pokemon.
- **Drag Pokemon between tiers**: Move a Pokemon from Unranked to S-tier, or
  from B to A.
- **Reorder within a tier**: Rank Pokemon within the same tier.
- **Custom tier labels**: Rename tiers to whatever makes sense — "Must Draft",
  "Trade Bait", "Avoid", etc.
- **Add/remove tiers**: Some players want 3 tiers, some want 8. Let them
  customize.
- **Visual layout**: Horizontal rows, each tier labeled on the left, Pokemon
  sprites filling the row. The classic tier list format everyone recognizes.

### Why Tier Lists and Watchlists Are Both Needed

They serve different purposes:

|                       | Watchlist                  | Tier List                         |
| --------------------- | -------------------------- | --------------------------------- |
| **Purpose**           | Pick priority during draft | Strategic evaluation before draft |
| **Structure**         | Flat ranked list           | Grouped buckets                   |
| **Scope**             | Only Pokemon you want      | All Pokemon in the pool           |
| **When used**         | During the live draft      | During research phase             |
| **Question answered** | "What do I pick next?"     | "How good is this Pokemon?"       |

A player might tier-list every Pokemon to understand the pool, then build a
focused watchlist of their top 15-20 targets for draft day.

### Post-Draft Sharing

After the draft completes, players can optionally share their tier list:

- **"Reveal tier lists"** — a post-draft ceremony where everyone shows their
  research
- **Compare tier lists** — see where you and your opponent disagreed. "You had
  Gengar in S-tier and I had it in C?!"
- **Fun for bragging rights** — "I was right about Garchomp, it carried my team"

This feeds the **reveal** design pillar — the moment of showing your hand is
inherently exciting.

### Data Model

```
tier_list
  id: UUID (PK)
  league_player_id: UUID (FK -> league_player.id)
  draft_pool_id: UUID (FK -> draft_pool.id)
  created_at: timestamptz
  updated_at: timestamptz

  UNIQUE(league_player_id, draft_pool_id)

tier
  id: UUID (PK)
  tier_list_id: UUID (FK -> tier_list.id, CASCADE)
  label: text (e.g. "S", "A", "Must Draft")
  position: integer (ordering of tiers, 0 = top)
  color: text (hex color for the tier label)

  UNIQUE(tier_list_id, position)

tier_item
  id: UUID (PK)
  tier_id: UUID (FK -> tier.id, CASCADE)
  draft_pool_item_id: UUID (FK -> draft_pool_item.id)
  position: integer (ordering within the tier)

  UNIQUE(tier_id, draft_pool_item_id)
```

Three tables give flexibility: players can customize tier count, labels, and
colors. Items not assigned to any tier are implicitly "Unranked."

### UX Considerations

- The tier list builder should feel like a standalone tool — full-width layout,
  not crammed into a sidebar.
- Pokemon in the Unranked bucket should show their sprite and name at minimum.
  Stats on hover or in a detail panel.
- Drag-and-drop is essential here. The entire interaction model is "grab and
  place."
- Consider keyboard shortcuts for power users: press S/A/B/C/D to send the
  selected Pokemon to that tier.
- Loading a pool of 48+ Pokemon into the Unranked bucket needs good scrolling /
  pagination within the bucket.
- Default tier colors should match the classic meme tier list format (red S,
  orange A, yellow B, green C, teal D).

---

## Feature: Personal Notes

### What It Is

Free-text notes attached to individual Pokemon. A scratchpad for strategy
thinking that doesn't fit into tiers or rankings.

### How It Works

- **Add a note**: Click a note icon on any Pokemon row, type your note, save.
- **Inline display**: Notes appear as a subtle indicator (icon or tooltip) on
  the pool table. Click to expand.
- **Rich text not needed**: Plain text is fine. Keep it simple.
- **Character limit**: Cap at 280 characters (tweet-length). Notes should be
  quick observations, not essays.
- **Visible during draft**: Notes show up on hover/click during the live draft,
  just like the watchlist.

### Example Notes

- "Alex always picks this round 2 — don't bother targeting unless I'm before
  him"
- "Pairs with Pelipper for rain. Only worth it if I get Pelipper first."
- "Sleeper — everyone underestimates this bulk"
- "Trade bait for Jordan, he loves ghost types"
- "Bad in this pool — no teammates to cover its weaknesses"

### Data Model

```
pool_item_note
  id: UUID (PK)
  league_player_id: UUID (FK -> league_player.id)
  draft_pool_item_id: UUID (FK -> draft_pool_item.id)
  content: text (max 280 chars)
  created_at: timestamptz
  updated_at: timestamptz

  UNIQUE(league_player_id, draft_pool_item_id)
```

One note per player per pool item. Simple.

### UX Considerations

- The note icon should be unobtrusive when empty, more visible when a note
  exists.
- Editing should feel instant — click, type, auto-save on blur. No modal
  dialogs.
- During the draft, notes should surface contextually. When it's your turn and
  you're looking at available Pokemon, your notes are right there.

---

## Feature Interactions

These three tools work together as a research workflow:

```
1. Browse pool table (sort, filter, scan)
        |
        v
2. Build tier list (categorize everything)
        |
        v
3. Add notes (capture strategy thoughts)
        |
        v
4. Build watchlist (distill tiers into pick-day priorities)
        |
        v
5. Draft day (watchlist + notes visible alongside draft board)
```

Not every player will use all three. Some will just star favorites. Others will
meticulously tier-list and annotate everything. The tools should be
independently useful — you don't need a tier list to use the watchlist.

---

## Privacy & Visibility Rules

| Tool      | During research | During draft                    | After draft     |
| --------- | --------------- | ------------------------------- | --------------- |
| Watchlist | Private         | Private (visible to owner only) | Optional reveal |
| Tier list | Private         | Not shown during draft          | Optional reveal |
| Notes     | Private         | Private (visible to owner only) | Never shared    |

Notes are **always private** — they may contain opponent-specific strategy that
would be rude to reveal. Watchlists and tier lists can be optionally shared
post-draft for the fun of comparing strategies.

---

## Impact on Re-Rolls

Currently, re-rolling the draft pool deletes all pool items and generates new
ones. This would destroy all watchlists, tier lists, and notes since they
reference pool item IDs.

Options:

1. **Warn before re-roll** — "Re-rolling will erase all players' research. Are
   you sure?" This is the simplest approach and probably the right v1 answer.
2. **Carry over matching Pokemon** — if a Pokemon appears in both the old and
   new pool, preserve research data for that item. Complex but preserves work.
3. **Archive old research** — save a snapshot of the old tier list/watchlist
   before re-rolling. Players can reference it but can't edit it.

Recommendation: **Option 1 for v1.** The commissioner should think carefully
before re-rolling once players have started researching.

---

## Phasing

### v1: Watchlist Only

- Star/un-star Pokemon
- Ordered list with drag-and-drop
- Persists across sessions
- Shows during live draft (stretch)

This is the highest-impact, lowest-effort tool. It immediately makes the pool
page feel interactive and personal.

### v2: Notes

- Per-Pokemon private notes
- Auto-save
- Visible during draft

Small addition that layers on top of the watchlist naturally.

### v3: Tier List Builder

- Full drag-and-drop tier list UI
- Custom tiers
- Post-draft reveal

The most complex feature, but also the most visually impressive and
engagement-driving.

---

## Open Questions

1. **Should the watchlist have a max size?** Unlimited is fine for flexibility,
   but a cap (e.g. "pick your top 20") could force harder strategic choices.
2. **Tier list templates?** Pre-built templates like "Offensive / Defensive /
   Utility" or "Must Draft / Nice to Have / Avoid" could help players who don't
   know where to start.
3. **Notifications?** "The draft starts in 1 hour — you have 12 Pokemon
   unranked." Could drive engagement but might feel pushy.
4. **Analytics on your own research?** "Your watchlist is 60% Water type — you
   might want more coverage." Helpful but potentially too hand-hold-y.
