# Draft Pool Research — Product Vision

## The Opportunity

The draft pool is where strategy begins. Before a single pick is made, players
study the pool, form opinions, identify sleepers, and try to read their
opponents. Today, the pool is a flat stats table — functional, but it doesn't
create the **tension, discovery, and preparation ritual** that makes drafts fun.

This document explores how to make the pre-draft research phase a compelling
experience in its own right.

---

## Design Pillars (from Initial Brainstorm)

These pillars should guide every feature in this space:

- **Scarcity** — choices matter because you can't have everything
- **Sleeper picks** — finding undervalued gems is rewarding
- **Reading opponents** — anticipating what others will pick
- **The reveal** — building anticipation for draft day

---

## Current State

The Draft Pool page shows:

- Pokemon sprite, name, types (color-coded badges)
- Full base stats table (HP, ATK, DEF, SPA, SPD, SPE, Total)
- Item count
- No interactivity beyond scrolling

All players see the same data. No personalization, no tools, no hidden
information.

---

## Ideas to Explore

### Tier 1: Table Enhancements (Low Effort, High Impact)

These make the existing table more useful for research without changing the data
model.

#### Sorting & Filtering

- **Sort by any column** — click column headers to sort by HP, ATK, Total, etc.
- **Filter by type** — show only Water types, only Dragon types, etc.
- **Filter by generation** — narrow to Gen I, Gen III, etc.
- **Search by name** — quick text search to find specific Pokemon
- **Multi-filter combos** — e.g. "Water type AND Total > 400"

_Why it matters:_ Players naturally want to answer questions like "what's the
fastest Pokemon in the pool?" or "which Fire types are available?" The current
table requires manual scanning.

#### Stat Highlighting

- **Color-code stats** — gradient from red (low) to green (high) within the pool
- **Stat percentile indicators** — show how a Pokemon's ATK compares to the pool
  average
- **Bold/highlight outliers** — make it visually obvious when a stat is
  exceptional or terrible

_Why it matters:_ Raw numbers are hard to evaluate without context. Is 80 ATK
good? In a pool of 48 Pokemon, visual context answers that instantly.

---

### Tier 2: Personal Research Tools (Medium Effort, High Impact)

These give each player private tools to prepare for the draft. Other players
can't see your research.

#### Watchlist / Favorites

- **Star/bookmark Pokemon** you're interested in
- **Private to each player** — your watchlist is hidden from opponents
- **Quick-access view** — toggle to show only your watchlist
- **Drag to reorder** — rank your favorites in pick priority order

_Why it matters:_ This is the core "preparation" mechanic. Every fantasy sports
player makes a personal list before draft day. It's table stakes.

#### Personal Tier List Builder

- **Drag Pokemon into tiers** (S/A/B/C/D or custom labels)
- **Private to each player**
- **Persists across sessions** — come back and refine your rankings
- **Optional: export/share after draft** for bragging rights

_Why it matters:_ Tier lists are a natural way people evaluate options. Building
one forces strategic thinking: "Is Gengar S-tier or A-tier in this pool?" It
also creates investment — you've put work into your strategy before the draft
even starts.

#### Personal Notes

- **Add private notes to any Pokemon** — "Good trade bait", "Alex always picks
  this", "Pairs well with Pelipper for rain"
- **Visible only to you**

_Why it matters:_ Players think in terms of synergies, opponents' tendencies,
and metagame. Notes let them capture that thinking.

---

### Tier 3: Pool Analytics & Insights (Medium Effort, Medium Impact)

Surfacing pool-level information that helps players think strategically.

#### Type Distribution Chart

- **Bar chart or pie chart** showing how many Pokemon of each type are in the
  pool
- Helps answer: "Are there only 3 Dragon types? Those will go fast."

#### Stat Distribution

- **Histogram or box plot** of each stat across the pool
- Helps answer: "Is this a speed-heavy pool or a bulk-heavy pool?"

#### Scarcity Indicators

- **Badge or label on rare types** — "Only 2 Ice types in pool"
- **Highlight Pokemon that are the sole representative** of a type combo
- Feeds directly into the **scarcity** pillar — make players feel the pressure
  of limited supply

#### Generation Breakdown

- **Show which generations are represented** and in what proportion
- Interesting for pools filtered to a regional dex

---

### Tier 4: Social & Competitive Research (High Effort, High Impact)

These create interaction between players during the research phase.

#### Mock Draft / Draft Simulator

- **Practice drafts against AI/random opponents** using the real pool
- **Explore different strategies** — "What if I go speed-first? Bulk-first?"
- **No consequences** — pure experimentation before the real draft

_Why it matters:_ This is the ultimate preparation tool. Fantasy football apps
have mock drafts for a reason — they're incredibly engaging and drive repeat
visits before draft day.

#### Opponent Research

- **View other players' past draft history** (from previous leagues)
- **Tendencies** — "This player always drafts Dragon types early"
- Feeds the **reading opponents** pillar

_Why it matters:_ The metagame of reading your opponents is one of the most fun
parts of drafting. Giving players data to work with makes this strategic rather
than random guessing.

#### Pre-Draft Predictions / Confidence Picks

- **Each player predicts: "I think [Pokemon] will be picked in round [N]"**
- **Scored after the draft** — who read the room best?
- **Mini-game within the game** — adds stakes to the research phase itself

_Why it matters:_ This turns passive research into an active game. Even before
the draft starts, players are competing.

---

### Tier 5: Information Asymmetry (High Effort, Experimental)

These are more radical ideas that change the fundamental dynamic of the pool.

#### Fog of War / Scouting

- **Not all Pokemon stats are visible by default**
- **Players get a limited number of "scout" actions** to reveal hidden info
- Example: types are visible but base stats are hidden until scouted
- **Creates genuine information advantage** — if you scouted Garchomp and know
  it has 130 ATK, but your opponents didn't, you have an edge

_Why it matters:_ This is the most direct way to make research _matter_. If
everyone has perfect information, research is just about preference. With hidden
info, research creates real competitive advantage.

_Risks:_ Could feel frustrating if too much is hidden. Needs careful
calibration. Maybe best as an optional league setting ("Fog of War mode").

#### Asymmetric Pools / Private Previews

- **Each player gets a private preview of a subset** of the pool before it's
  fully revealed
- **Information trading** — "I'll tell you what I saw if you tell me what you
  saw"
- Creates a pre-draft social negotiation layer

_Why it matters:_ Forces collaboration and deal-making before the draft. Very
aligned with the "social/persuasion" element from the brainstorm.

---

## Recommendation: Where to Start

A phased approach, building value at each step:

### Phase 1: Make the Table Great

- Column sorting
- Type and generation filters
- Name search
- Stat color-coding / percentile context

This is low-hanging fruit that immediately improves the research experience with
no new data model changes.

### Phase 2: Personal Preparation

- Watchlist (star/favorite)
- Personal tier list builder
- Personal notes

This requires new data (per-user, per-pool-item state) but is the core of what
makes research feel like _your_ strategy.

### Phase 3: Pool Intelligence

- Type distribution chart
- Scarcity indicators
- Stat distributions

Derived from existing data, no new storage needed. Makes the pool feel like a
living thing with patterns to discover.

### Phase 4: Social Competition

- Mock draft simulator
- Pre-draft predictions
- Past draft tendencies

The most ambitious tier, but also the most aligned with the long-term vision of
making the draft itself the game.

---

## Open Questions

1. **How long is the research phase?** Is there a configurable window between
   pool generation and draft start? Or can the commissioner start the draft
   whenever?
2. **Should any research data carry into the draft UI?** e.g. seeing your
   watchlist during the live draft would be very useful.
3. **Is the pool always fully visible?** Or do we want fog-of-war as a first-
   class league setting?
4. **Do we want pool re-rolls to preserve research?** Currently re-rolling
   deletes everything. If a player spent 30 minutes building a tier list and the
   commissioner re-rolls, that's painful.
5. **How does this scale beyond Pokemon?** The vision is "draft anything" — are
   these research tools generic enough, or are some Pokemon-specific?

---

## Success Metrics

- **Time spent on pool page before draft** — are players actually researching?
- **Return visits** — do players come back to refine their research?
- **Watchlist usage** — are players using preparation tools?
- **Post-draft sentiment** — do players feel more invested in their picks?
