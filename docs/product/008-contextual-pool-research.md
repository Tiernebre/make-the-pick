# Contextual Pool Research — Version-Aware Investigation

## Overview

[002-draft-pool-research-vision.md](./002-draft-pool-research-vision.md) laid
out the research vision in terms of _the table itself_ — better sorting,
personal tier lists, watchlists, mock drafts. All of that treats the pool as a
flat list of creatures with stats.

This document is about the next layer: **the pool item is not just a Pokemon,
it's a Pokemon _in a specific game_.** Every league is drafting from a version
(Emerald, Platinum, HeartGold, etc.), and that version is the most load-bearing
context a player has. When and where a Pokemon shows up in that game is often
more strategically important than its base stats — a 600 BST monster you can't
catch until post-game is nearly useless for a co-op playthrough league, and a
mid-BST Pokemon you can grab before the first gym might be the best pick on the
board.

Today the pool page shows none of this. The same Gyarados card looks identical
whether the league is drafting from Fire Red or Black 2. That's a miss. This doc
explores how to make the pool page _know what game it's in_ and surface the
parts of that game that actually change how players evaluate picks.

---

## The Core Insight

Research in a fantasy league is answering questions. The current pool answers:

- _"How good is this Pokemon in a vacuum?"_

The version-aware pool can also answer:

- _"When can I use this Pokemon in this game?"_
- _"Where do I go to get it?"_
- _"How much work is it to actually have it on my team?"_
- _"Is it a staple in this version, or is it a trap?"_

Every one of those is a question players already ask out loud during drafts and
answer by tabbing out to Bulbapedia or Serebii. Bringing the answers in-app is
the entire opportunity.

---

## Tier 1: Game Availability Column

**The ask:** a column (or visual marker) that tells you when in the game's
natural progression this Pokemon becomes catchable.

### How to bucket it

The regional Pokedex number is a surprisingly good proxy for this. Game
designers number regional dex entries roughly in the order you encounter them
along the critical path, so dex position → game progression is a cheap,
universal heuristic that works across every version without hand-curation.

Concretely:

- **Early** — regional dex position in the first third of the dex. Routes 1–N
  before the 3rd badge area.
- **Mid** — middle third. Roughly 3rd–6th badge era.
- **Late** — last third. Post-7th-badge, Victory Road, etc.
- **Post-game** — available only after the Elite Four / national dex unlock.
- **Event / unobtainable in cart** — Mew, Celebi, Deoxys, etc. Useful for
  flagging picks that require an event distribution the league may or may not
  count as legal.

### Why regional dex ordering is the right starting point

- It exists for every mainline version already — no manual route-by-route data
  needed to ship v1 of this feature.
- It's version-specific by construction. The same Pokemon will bucket
  differently in Emerald (mid) vs Fire Red (early), which is exactly the signal
  players want.
- It's wrong sometimes — starters, in-game trades, and version exclusives all
  get dex numbers that don't match when you can actually catch them. That's fine
  for v1 and fixable later with manual overrides (see Tier 2).

### How it should feel on the page

- A small pill next to the sprite: `Early`, `Mid`, `Late`, `Post-game`, `Event`.
- Color-coded so the player can scan a whole pool in a second and see: is this a
  front-loaded pool (mostly early) or a back-loaded one (mostly late)?
- Filterable. "Show me only Pokemon I can have by badge 3" is the single most
  common question a player asks during a playthrough-league draft.
- Sortable. Sorting by availability gives players a natural draft-order starting
  point: early-game Pokemon tend to get picked first in co-op playthrough
  formats because they carry you through more of the run.

---

## Tier 2: Route & Location Data

**The ask:** a column (or drill-in) that tells you where to physically go in the
version to catch this Pokemon.

This is the next level of depth past the availability pill. "Mid-game" tells you
_roughly when_; route data tells you _exactly how_.

### What to surface

For each Pokemon in the pool, scoped to the league's version:

- **Primary encounter location(s)** — "Route 119 (grass, 5% encounter rate)".
- **Encounter method** — grass, surf, fish (old/good/super), rock smash, honey
  tree, headbutt, horde, gift NPC, fossil revival, trade-only, static encounter,
  roaming.
- **Level range** at encounter — matters a lot for playthrough leagues; a level
  3 Zigzagoon and a level 45 Altaria are very different draft picks.
- **Rarity** — common / uncommon / rare / one-time. A 1% encounter rate is a
  real cost players should see up front.
- **Prerequisites** — "requires Surf", "requires National Dex", "requires a
  specific in-game trade first". These are soft locks that change availability.
- **Version exclusivity** — if the league version is Ruby, flag the Sapphire
  exclusives so commissioners and players aren't surprised.

### How it should feel on the page

- A "Where to find" popover on hover or click, not a dense inline column.
  Location data is high-value but high-volume; the pool table can't absorb it
  without drowning.
- A lightweight inline hint for the common case: one primary location shown
  inline ("Route 119"), everything else in the popover.
- Eventually, a **regional map view** of the pool — a silhouette of the region
  with the pool's Pokemon pinned to their routes. That's a qualitatively
  different research surface than the table, and it's the single most evocative
  "we know what game you're in" feature in this doc. Players would screenshot
  it.

### Data source strategy

PokeAPI has encounter data keyed by version, which is enough to seed Tier 2
without hand-curating each game. Expect gaps and known-wrong entries — the
schema should allow a per-(version, species) override so commissioners or admins
can correct bad data without waiting for upstream fixes.

---

## Tier 3: Effort & Accessibility Signals

Availability and location are "can I get it and when". This tier is "how much of
a pain is it going to be". These are the signals that separate an experienced
version-player from a draft newbie, and exposing them levels the playing field.

### Effort-to-team score

A rough 1–5 rating composed from:

- Encounter rarity (1% fishing spot = painful).
- Evolution cost (level 55 final evo with no stone shortcut = late payoff).
- Item/trade requirements (trade evolutions in a solo playthrough are
  effectively locked).
- Level gap between encounter level and "usable" level.

Displayed as a small meter. The goal isn't precision — it's to warn the player
that Milotic looks great on paper and is a nightmare to actually field.

### Evolution path in this version

The pool card already knows the species. It should also show:

- Full evolution line with level / method / item required.
- Whether those items are obtainable _in this version, before post-game_. (Moon
  Stones in Gen 2 vs Gen 3 are very different questions.)
- Trade evolution warning — critical for solo-player league formats where trade
  evos are effectively off-limits.

### Movepool windows

- What level does this Pokemon learn its first _actually good_ STAB move in this
  version? (Magikarp at L20 is a different proposition than Magikarp at L1.)
- What TMs does the version give you that this Pokemon can learn, and when in
  the game do those TMs become available?

This is the deep-cut research the tryhards already do in a spreadsheet. The
opportunity isn't to replace the spreadsheet — it's to surface the top one or
two facts inline so the casual player isn't drafting blind against the tryhard.

---

## Tier 4: Meta & Historical Context

These features don't come from the cartridge — they come from the community and
from Make the Pick's own draft history.

### Version-specific tier rankings

- Scrape or curate a "playthrough tier list" for the version (Smogon in-game
  tiers are a real, existing resource for most main-series games).
- Show the tier next to each Pokemon in the pool.
- Filter by tier. "Show me only S and A tier picks in Platinum" is a legitimate
  research query.

### Historical draft data in this version

Once Make the Pick has run enough leagues in a given version, the app itself
becomes a data source:

- _"Linoone has been drafted in 84% of Emerald leagues on MtP. Usually round 2
  or 3."_
- _"Altaria has been drafted in 12% of Emerald leagues — sleeper?"_
- _"Average pick position of Swampert across MtP Emerald drafts: 1.4."_

This is the strongest possible answer to _"am I reaching?"_ and it only gets
better the more leagues exist. It also feeds the **reading opponents** pillar
from 002 — you're not reading a specific opponent, you're reading the whole
player base.

### Gym / Elite Four coverage score

Against a fixed version, you can precompute type-effectiveness per Pokemon
against every gym leader and E4 member. Collapse that into:

- _"Covers 6 of 8 gyms in Emerald."_
- _"Hard-walls Winona."_
- _"Dead weight vs Drake."_

Coverage is the single most practical strategic question in a playthrough league
("who beats what boss") and the game context makes it computable.

---

## Tier 5: Exploratory / Speculative

Ideas worth writing down even if they don't ship soon.

### Pokedex-order draft view

An alternate pool view that arranges the pool in regional dex order, not as a
table. Playing off the same "this is a game, not a stats sheet" instinct as the
map view. Makes it visually obvious which sections of the dex this pool
concentrates in.

### "Fill the Dex" commissioner mode

A league setting where the pool is intentionally built to span the full regional
dex with one representative per evolution family. Research for this format is
totally different — instead of "find value", it's "find breadth".

### Story-aware progression simulator

Pick a badge count (0, 1, 2, ... 8, E4) and the pool re-sorts itself to show
what's actually _available_ to you at that checkpoint. Makes it trivial to plan
"my first 3 picks are early-available, my 4th is a mid-game carry, my 5th is a
post-E4 cleanup hitter."

### Cross-version comparison

When a player is returning from a different league, show "you drafted Salamence
in your Emerald league; here's the closest analog in Platinum." Bridges research
across versions and gives returning players a running mental model of their own
preferences.

---

## Open Questions

1. **Where does this data live?** Is per-version game data part of the Make the
   Pick database, or is PokeAPI the runtime source of truth? Probably: seed from
   PokeAPI into our DB on version import, then allow overrides. Runtime calls to
   PokeAPI during draft would be too fragile.
2. **How much of this is Pokemon-specific?** The doc's vision is "draft
   anything", but availability / location / progression are extremely
   Pokemon-shaped. The abstraction is probably "game-context metadata" — every
   draftable domain has _some_ equivalent, and the pool page has a version-aware
   slot for it.
3. **Who curates overrides?** If PokeAPI data is wrong for Emerald's Feebas, who
   fixes it — site admins, league commissioners, or anyone? Leaning admin-only
   for correctness, with a "suggest a fix" affordance.
4. **Does location data leak spoilers?** For a player who's never played the
   version before, showing "Route 119, post-badge-6" might spoil story beats.
   Probably a non-issue for the current audience but worth flagging as a toggle.
5. **How does this interact with fog-of-war (from 002)?** If a league hides
   stats, does it also hide locations? Game context might actually be the _more_
   interesting thing to fog, since it creates genuine in-game knowledge
   asymmetry.

---

## Recommendation: Where to Start

The ordering here is the same ordering as the tiers — each tier unlocks the next
but also delivers real value on its own.

1. **Availability pill, keyed on regional dex position.** Cheap, universal,
   immediately changes how the pool reads. One new column, one derived field, no
   new data pipeline.
2. **Primary encounter location inline + full location popover.** Requires
   importing PokeAPI encounter data per version. This is the biggest single jump
   in perceived product depth.
3. **Evolution path + effort-to-team score.** Warns players about traps and
   rewards players who know the version.
4. **Historical draft data from MtP itself.** Free once there's enough draft
   history; becomes a defensible moat over time.
5. **Map view and story-checkpoint simulator.** The "wow" features. Ship after
   the fundamentals are solid.

The north star: **a new player should be able to open the pool page and
understand the game they're drafting from, not just the stat line of each
Pokemon on it.**
