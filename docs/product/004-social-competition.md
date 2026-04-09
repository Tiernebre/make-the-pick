# Social Competition — Product Vision

## Overview

The best part of drafting isn't the picks themselves — it's the mind games. Who
saw that sleeper pick coming? Who panicked and reached for a Pokemon two rounds
early? The draft is a social event, and the most memorable moments come from
**reading opponents, making bold calls, and proving you were right.**

This document explores features that turn the research phase and draft into a
social competition — not just "pick the best Pokemon" but "outsmart your
friends."

---

## Feature: Mock Draft Simulator

### What It Is

A practice draft where a player can simulate the real draft using the actual
pool, against AI-controlled opponents. Think of it as a scrimmage before the
real game.

### How It Works

- **Uses the real pool** — the same Pokemon that will be available on draft day.
- **AI opponents** draft based on configurable strategies:
  - **Random** — picks randomly (useful for exploring what's available in later
    rounds)
  - **Best available** — always picks the highest base stat total (a greedy
    baseline)
  - **Type-focused** — each AI "prefers" a type and prioritizes it (simulates
    real player tendencies)
- **Same draft format** — snake draft with the same number of rounds as the real
  draft.
- **Instant** — no timers, no waiting. Pick as fast as you want.
- **Unlimited replays** — run as many mock drafts as you like. Each one can have
  different AI behavior.
- **Results summary** — after the mock draft, see your full roster with stats,
  type coverage, and how it compares to the AI rosters.

### Why This Is Powerful

Mock drafts answer the most important strategic questions:

- **"What's available in round 3?"** — Run a mock draft to see what typically
  falls to your pick position.
- **"Should I go offensive or defensive early?"** — Try both strategies and
  compare the resulting rosters.
- **"What's the best pivot if Garchomp gets picked before me?"** — Simulate
  different scenarios.
- **"Is it worth reaching for a rare type in round 1?"** — Test whether the type
  scarcity actually matters over a full draft.

Fantasy football mock drafts are one of the highest-engagement features on
platforms like ESPN, Yahoo, and Sleeper. They're fun, they're educational, and
they drive repeat visits.

### AI Strategy Details

The AI doesn't need to be brilliant — it needs to be **realistic enough** to
create meaningful practice scenarios.

#### Random Strategy

- Picks uniformly at random from remaining pool.
- Useful for: exploring the pool, seeing what's available late.
- Not useful for: realistic practice.

#### Best Available Strategy

- Ranks all remaining Pokemon by base stat total, picks the highest.
- Useful for: practicing against "optimal" opponents.
- Creates a predictable meta where the player can plan around known AI behavior.

#### Type-Focused Strategy

- Each AI is assigned 1-2 preferred types at random.
- Picks the highest-BST Pokemon of their preferred type if available, otherwise
  falls back to best available.
- Useful for: simulating real opponents who have preferences and tendencies.
- Most realistic strategy — real players have biases.

#### Future: Profile-Based Strategy

- AI mimics a specific player's historical tendencies (if past draft data
  exists).
- "Practice against Alex's draft style."
- Requires enough historical data to be meaningful — a v2/v3 feature.

### Data Model

Mock drafts are ephemeral — no server storage needed for v1. Run entirely
client-side:

- Pool data is already loaded on the client.
- AI logic runs in the browser.
- Results are displayed and then discarded (unless the player wants to save —
  see below).

For a future version with saved mock draft history:

```
mock_draft
  id: UUID (PK)
  league_player_id: UUID (FK -> league_player.id)
  draft_pool_id: UUID (FK -> draft_pool.id)
  result: jsonb (full draft results — picks, rosters, AI strategies)
  created_at: timestamptz
```

### UX Considerations

- The mock draft should feel **fast and lightweight** — not a ceremony. Click
  "Mock Draft", pick your position, go.
- Show a compact draft board during the mock — you don't need the full live
  draft UI. A simple pick-by-pick list is fine.
- After the mock draft, the results summary is the star. Show:
  - Your roster with type coverage and stat totals.
  - Which Pokemon went in which round.
  - "If this were real, you'd have: [roster summary]."
- A "Quick Mock" option that auto-drafts for you based on your watchlist
  rankings — shows what your watchlist strategy would produce.

---

## Feature: Pre-Draft Predictions

### What It Is

A mini-game where players make predictions about what will happen during the
draft. Predictions are locked before the draft starts and scored afterward.

### How It Works

#### Making Predictions

Before the draft begins, each player answers a set of prediction prompts:

- **"Which Pokemon will be picked first overall?"** — Pick one.
- **"Which Pokemon will be the biggest steal (picked latest relative to BST
  rank)?"** — Pick one.
- **"Which player will draft the most [type] Pokemon?"** — Pick a player.
- **"What will your best Pokemon's BST be?"** — Enter a number.
- **"Which Pokemon will go undrafted?"** — Pick up to 3.

Predictions are:

- **Private** — locked in a sealed envelope, invisible to other players.
- **Immutable** — once submitted, can't be changed.
- **Optional** — players can skip the prediction game entirely.

#### Scoring Predictions

After the draft completes, predictions are revealed and scored:

- **Exact match** — predicted first pick correctly: 3 points.
- **Close match** — predicted first pick was actually pick 2-3: 1 point.
- **Steal prediction** — the Pokemon you named was picked 5+ spots later than
  its BST rank: 2 points.
- **Type prediction** — correctly named the player with the most of that type: 2
  points.
- **BST prediction** — within 10 of your best Pokemon's actual BST: 2 points.
- **Undrafted prediction** — each correctly predicted undrafted Pokemon: 1
  point.

Total possible: ~12-15 points. The player with the most points wins the
prediction game.

### Why This Is Fun

- **Turns passive watching into active participation** — even when it's not your
  pick, you're invested because your predictions are on the line.
- **Creates draft-day narratives** — "I called the Gengar first pick! Pay up!"
- **Low-effort high-reward** — takes 2 minutes to fill out, creates hours of
  entertainment.
- **Rewards game knowledge** — the player who best understands the pool AND
  their opponents' tendencies wins.
- **Post-draft content** — the prediction reveal is a natural "post-game show"
  moment.

### Data Model

```
draft_prediction_set
  id: UUID (PK)
  league_player_id: UUID (FK -> league_player.id)
  draft_id: UUID (FK -> draft.id)
  submitted_at: timestamptz
  score: integer (null until scored)
  scored_at: timestamptz (null until scored)

  UNIQUE(league_player_id, draft_id)

draft_prediction
  id: UUID (PK)
  prediction_set_id: UUID (FK -> draft_prediction_set.id, CASCADE)
  prompt_key: text (e.g. "first_pick", "biggest_steal", "undrafted")
  prediction_value: jsonb (flexible — could be a pool_item_id, player_id, number)
  result_value: jsonb (null until scored — actual outcome)
  points_earned: integer (null until scored)
```

Using `prompt_key` and JSONB values keeps this flexible. New prediction types
can be added without schema changes.

### UX Considerations

- Prediction prompts should feel like a **fun quiz**, not homework. Keep the UI
  playful.
- Show a countdown: "Predictions lock when the draft starts — 2 hours
  remaining."
- The reveal should be **dramatic** — show each prediction one at a time with a
  reveal animation. Did you get it right? Confetti. Wrong? Sad trombone.
- Leaderboard for prediction scores alongside the main draft results.
- Consider a "prediction streak" across multiple leagues — track who's the best
  predictor over time.

---

## Feature: Draft Tendencies & Opponent Scouting

### What It Is

A player profile page showing historical draft behavior across past leagues.
Helps players scout their opponents and adjust their strategy.

### How It Works

#### Data Tracked (Derived from Past Drafts)

For each player, across all leagues they've participated in:

- **Type preferences** — percentage breakdown of types drafted. "Alex drafts
  Dragon 23% of the time."
- **Positional tendencies** — what do they prioritize early vs. late? "Alex
  always takes a bulky Pokemon in round 1."
- **BST tendencies** — do they chase high stats or take sleepers? "Alex's
  average first-pick BST is 540 — he goes for power."
- **Draft style label** — auto-generated descriptor based on patterns:
  - "The Specialist" — heavily favors 1-2 types
  - "The Generalist" — even type distribution
  - "The Contrarian" — picks low-BST Pokemon early
  - "The Meta Player" — always picks highest BST available

#### Display

- **Player profile card** — shown in the league lobby alongside each player's
  name.
- **Scouting report** — accessible from the draft pool page. "View opponent
  scouting reports."
- **Comparison view** — see your tendencies vs. an opponent's side-by-side.

### Why This Is Fun

- **Metagame depth** — drafting against strangers is random. Drafting against
  friends with known tendencies is chess.
- **Self-awareness** — seeing your own tendencies might make you realize you
  always do the same thing. "Am I really that predictable?"
- **Mind games** — if Alex knows that you know he always picks Dragon first,
  does he switch it up? The metagame deepens.
- **Replay value** — every new league in the same friend group builds on the
  history. The rivalry evolves.

### Data Requirements

This feature needs multiple completed drafts to be meaningful. It's a **long-
term feature** that gets better over time.

- **Minimum data**: 2-3 completed drafts to show any patterns.
- **Good data**: 5+ drafts to generate confident style labels.
- **No data yet**: Show "No draft history" with an encouraging message: "Play
  more drafts to unlock scouting reports!"

### Data Model

No new tables needed — all data is derived from existing `draft_pick` records
joined with `draft_pool_item` metadata. Tendencies are computed on read, not
stored.

For performance (if querying across many drafts is slow):

```
player_draft_profile (materialized/cached)
  league_player_id: UUID (FK)
  drafts_completed: integer
  type_distribution: jsonb ({dragon: 0.23, water: 0.18, ...})
  avg_first_pick_bst: number
  avg_overall_bst: number
  style_label: text
  computed_at: timestamptz
```

Recomputed after each draft completes.

### UX Considerations

- Scouting reports should feel like **sports broadcast graphics** — fun, visual,
  maybe slightly over-the-top.
- Type distribution as a radar chart or horizontal bar chart.
- Style labels should be playful, not judgmental. "The Specialist" sounds cool.
  "One-dimensional" does not.
- If two players have drafted against each other before, show their head-to-head
  record.

---

## Feature: Post-Draft Highlights & Awards

### What It Is

An automated "post-game show" after the draft completes. Highlights the most
interesting moments and hands out fun awards.

### Awards

- **Best Value Pick** — the Pokemon with the highest BST drafted latest. "Round
  5 Alakazam? Steal of the draft."
- **Biggest Reach** — the Pokemon with the lowest BST drafted earliest. "Round 1
  Magikarp? Bold strategy."
- **Type Monopolist** — the player who cornered a type. "Jordan has 4 of the 5
  Ghost types. Nobody else gets a ghost."
- **Most Balanced Roster** — the player with the most even type distribution.
- **Highest Ceiling** — roster with the highest total BST.
- **Prediction Champion** — highest prediction score (if predictions were
  played).
- **The Heel** — the player who "stole" the most Pokemon that were on other
  players' watchlists (revealed post-draft if watchlists are shared).

### How It Works

- **Auto-generated** — no manual input needed. Computed from draft results.
- **Revealed sequentially** — show awards one at a time with brief animation /
  fanfare.
- **Shareable** — generate a summary card that players can screenshot or share
  to Discord.

### Data Model

```
draft_award
  id: UUID (PK)
  draft_id: UUID (FK -> draft.id)
  award_key: text (e.g. "best_value", "biggest_reach", "type_monopolist")
  league_player_id: UUID (FK -> league_player.id)
  details: jsonb (context — which Pokemon, what round, etc.)
  created_at: timestamptz

  UNIQUE(draft_id, award_key)
```

Awards are computed and stored when the draft completes.

### Why This Is Fun

- **Creates stories** — every draft becomes memorable. "Remember when Jordan
  took Magikarp round 1?"
- **Encourages replay** — players want to win different awards next time.
- **Social sharing** — the summary card drives engagement beyond the app.
- **Validation** — the "Best Value" award feels amazing. Your research paid off.

---

## How These Features Connect

```
                    BEFORE DRAFT
                    ============
  Mock Draft -----> "I have a strategy"
       |
  Predictions ----> "I know what's going to happen"
       |
  Scouting -------> "I know my opponents"

                    DURING DRAFT
                    ============
  Predictions at stake ----> every pick matters to prediction scores
  Scouting in mind --------> "called it, Alex went Dragon again"

                    AFTER DRAFT
                    ===========
  Prediction reveal ----> "Who called it?"
  Awards ceremony ------> "Who won the metagame?"
  Scouting updated -----> "Next time, I'll be ready for Jordan"
       |
       v
  ALL OF THIS FEEDS INTO THE NEXT DRAFT
```

The loop is self-reinforcing. Every draft generates data that makes the next
draft's social competition richer. This is how you build a game people come back
to.

---

## Phasing

### Phase 1: Post-Draft Awards

- Auto-generated awards after each draft completes.
- Low effort, high delight. Turns the end of the draft into a moment instead of
  a whimper.
- No new pre-draft features needed — works with the draft as it exists today.

### Phase 2: Pre-Draft Predictions

- Prediction prompts and sealed submissions.
- Scoring engine that runs when the draft completes.
- Prediction reveal ceremony.
- Pairs naturally with the awards — prediction champion is just another award.

### Phase 3: Mock Draft Simulator

- Client-side mock draft engine with AI opponents.
- Results summary with roster analysis.
- No server storage needed for v1 — fully client-side.

### Phase 4: Draft Tendencies & Scouting

- Requires multiple completed drafts to be useful.
- Build the data pipeline first — start collecting and aggregating draft
  behavior as soon as drafts are happening.
- Surface the scouting UI once there's enough data to be interesting.

---

## Open Questions

1. **Prediction prompt variety** — should prompts be the same every draft, or
   should the commissioner be able to customize them? Fixed prompts are simpler
   and allow cross-league comparison. Custom prompts are more fun but harder to
   score.
2. **Mock draft sharing** — should players be able to share mock draft results
   with friends? Could be fun ("look what I drafted in practice!") but also
   reveals strategy.
3. **Award customization** — should commissioners be able to create custom
   awards? e.g. "Best Monotype Run" for a themed league.
4. **Scouting across leagues** — if you play with different friend groups,
   should your tendencies aggregate across all leagues or be scoped per group?
   Cross- group aggregation is more data-rich. Per-group is more relevant.
5. **Competitive integrity** — should there be an option to hide scouting
   reports in a league? Some groups might find it more fun without the data,
   relying on memory and intuition instead.
6. **Mock draft AI training** — could we use the real draft tendency data to
   make AI opponents more realistic? i.e. the AI mimics your actual league
   mates. Incredibly fun but privacy-sensitive.
