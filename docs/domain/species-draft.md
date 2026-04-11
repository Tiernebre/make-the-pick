# Species Draft

An alternate drafting mode where the draftable unit is a **species** — an entire
evolution line rooted at a single terminal final form — rather than an
individual Pokemon. When a player drafts Charizard they acquire Charmander,
Charmeleon, and Charizard in one pick. When they draft Ninetales they acquire
both Kanto and Alolan Vulpix/Ninetales.

This mode coexists with the existing one-Pokemon-per-pick mode via a new league
setting. See [`draft.md`](./draft.md) for the underlying draft entities and
lifecycle, which are unchanged.

## Motivation

1. **Strategic picks over dex memorization.** A player who wants to run
   Charizard shouldn't have to burn picks on Charmander and Charmeleon to
   complete the line. Species drafting collapses each evolution family into a
   single decision.
2. **Smaller, more readable pool.** ~1025 individual mons become ~600 species,
   which scouts and drafts better.
3. **Alignment with fantasy-Pokemon league conventions.** Most external pod
   leagues already draft this way, so new users arrive with the mental model
   already built.

## Definitions

### Species

A species is **identified by its terminal final form's name** and owns every
Pokemon (across all regional variants) whose evolution path terminates at a
Pokemon with that name.

- Charizard species owns {Charmander, Charmeleon, Charizard}.
- Ninetales species owns {Vulpix (Kanto), Vulpix (Alola), Ninetales (Kanto),
  Ninetales (Alola)} — both regionals collapse because the final form name is
  the same.
- Obstagoon species owns {Zigzagoon (Galar), Linoone (Galar), Obstagoon},
  distinct from Linoone species which owns {Zigzagoon (Kanto), Linoone (Kanto)},
  because the final form names differ.
- Flareon species owns {Eevee, Flareon}. Jolteon species owns {Eevee, Jolteon}.
  Each Eeveelution is its own species; Eevee is a **shared pre-evo** that
  appears as a member of all nine.
- Tauros species owns {Tauros}. Single-stage Pokemon are trivially their own
  species.

### Terminal final form

A Pokemon with no outbound evolution edges in the evolution graph. Branching
evolutions (Eevee, Wurmple, Tyrogue, Slowpoke-Galar, ...) produce multiple
terminal finals and therefore multiple species rooted at the same base form.

### Shared pre-evo

A Pokemon that is a member of more than one species because it sits below a
branching point. Eevee, Wurmple, Tyrogue, baby Pokemon like Pichu and Togepi,
and branching Slowpoke bases all qualify. Shared pre-evos are flavor and
catch-location data — they are **not** scarce and cannot be drafted
independently (see invariants).

## Species member composition rules

Given a final-form name `F`, the species `F` owns the union of:

1. All Pokemon (across all regional variants) named `F`.
2. For each such `F` variant, every ancestor in its evolution graph walked
   toward the base form.

A member appears in a species at most once. The base form(s) may be shared
across species (see Eevee above).

## Scouting card

Species drafting changes what the scouting UI shows. A species card displays
**combined info derived from the species' members**, not the base form's.

| Field           | Source                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Species name    | The terminal final form's name (e.g. "Raticate", "Ninetales").                                   |
| Sprite          | The terminal final form's sprite. Regional variants each get a tab/toggle.                       |
| Base stats      | The terminal final form's base stats. If multiple regional finals exist, show each side-by-side. |
| Types           | The terminal final form's types. Regional variants shown separately.                             |
| Generation      | The generation the terminal final form was introduced in.                                        |
| Catch locations | Union of catch locations across **all pre-evos** (across all regional variants in the species).  |

Pre-evolution stats are not displayed. The player is drafting the endgame mon;
the pre-evos exist to explain how it's acquired in-game, not to be scouted as
battlers.

**Regional variants with different final-form stats/types** (e.g. Ninetales)
render each regional final as its own stat/type block within the single species
card. There are at most ~2 regional finals in any known species, so this stays
visually bounded.

## Pool generation

Today pool generation picks individual Pokemon, filtered by version dex, catch
rate, and category exclusions, then writes one `draft_pool_item` per Pokemon
(see `server/features/draft-pool/draft-pool.service.ts`). Species mode changes
the unit of generation without changing the persistence shape:

1. **Enumerate terminal final forms.** Walk
   `packages/shared/data/pokemon-evolutions.json` and collect every Pokemon that
   is a terminal.
2. **Group terminals by final-form name.** Collapses regional variants into one
   species.
3. **Walk ancestors** for each final to build the member list.
4. **Apply filters at the species level**, not the member level. A species is
   eligible for the pool if **any** of its terminal finals passes the
   version-dex/catch-rate/category filters. The rationale: if any regional
   Ninetales is legal in Sword, the species is legal.
5. **Write one `draft_pool_item` per species**, with `name` set to the terminal
   final form name and `metadata` extended to carry the member list and
   per-regional final stat blocks.

Pool size shrinks naturally because the unit is coarser. The existing
`poolSizeMultiplier` (currently default 2x) stays —
`rounds × players ×
multiplier`, applied against the species-count universe
instead of the Pokemon-count universe.

## Data shape

No new tables. `draft_pool_item.metadata` is already `jsonb` and intentionally
flexible. In species mode the metadata is extended with a `species` envelope:

```ts
type SpeciesPoolItemMetadata = {
  mode: "species";
  finals: Array<{
    // One entry per terminal final form in this species.
    // Usually 1; up to ~2 for regional-final species like Ninetales.
    pokemonId: number;
    name: string; // same across entries by construction
    regionalForm: string | null; // e.g. "alola", null for the base region
    types: string[];
    baseStats: BaseStats;
    generation: string;
    spriteUrl: string;
  }>;
  members: Array<{
    // All Pokemon that belong to this species, including pre-evos.
    // Used to resolve catch locations and display the full line on the card.
    pokemonId: number;
    name: string;
    regionalForm: string | null;
    stage: "base" | "middle" | "final";
  }>;
};
```

Individual mode (`mode: "individual"`) retains today's metadata shape. Both
modes persist to the same table.

## Invariants

Species drafting keeps every invariant from [`draft.md`](./draft.md) and adds:

1. **Species are identified by terminal final form name.** Two terminals with
   the same name (regional variants) are the same species; two terminals with
   different names are different species, even if they share a base form.
2. **Species are never split.** There is no commissioner toggle for breaking up
   an evolution line within a terminal. The only branching at species boundaries
   happens at terminal-form differences (Eevee, Wurmple, ...).
3. **Pre-evos cannot be drafted independently.** The pool contains no entry
   whose `name` is a non-terminal Pokemon. Eevee, Charmander, Wurmple, etc.
   never appear as pool items.
4. **Shared pre-evos may belong to multiple drafted species simultaneously.** If
   two players draft Flareon and Jolteon, both rosters include Eevee as a
   member. This is not a scarcity violation because scarcity lives at the
   terminal final form, not the base.
5. **A species is eligible for a pool if any of its terminal finals passes the
   pool-generation filters.** A species is not excluded merely because some of
   its regional finals are not in the chosen game version's dex.
6. **Species drafting is a league-level setting fixed at league creation.** A
   league cannot switch between individual and species drafting once the pool is
   generated.

## Build order

Species drafting should ship behind a league setting so nothing changes for
existing leagues. TDD order, each step landing as its own PR:

1. **Shared package: species builder.** Pure function in `@make-the-pick/shared`
   that takes `pokemon.json` + `pokemon-evolutions.json` and returns
   `Species[]`. Tests cover the tricky cases: Charizard (linear), Ninetales
   (regional collapse), Flareon/Jolteon (branching with shared pre-evo),
   Obstagoon vs. Kanto Linoone (regional divergence at the final), Tauros
   (single-stage), legendaries. No server or client changes.
2. **Shared Zod schemas.** `SpeciesPoolItemMetadata` and the extended
   discriminated union on `DraftPoolItemMetadata`. Tests assert that existing
   individual-mode metadata still validates.
3. **Server: pool generation in species mode.** Extend `draft-pool.service.ts`
   to accept a `mode` and emit species-shaped items. Integration tests against
   the real pool generator asserting counts and shapes for a known version dex.
4. **Server: league setting.** Add `draftMode` to league creation with
   `individual` default. Router validates that the pool matches the league's
   mode.
5. **Client: scouting card.** Species card component with the regional-variant
   tab behavior and combined catch locations. Storybook coverage for
   single-final, dual-final-regional, and shared-pre-evo rendering.
6. **Client: draft board integration.** Pool table and roster panel render
   species cards when the league is in species mode. Feature-flag the league
   creation form to let opt-in leagues select the mode.

Each step is independently shippable and the league setting gates the UX until
the pipeline is end-to-end.
