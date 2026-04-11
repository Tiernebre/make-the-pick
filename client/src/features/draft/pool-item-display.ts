import type { DraftPoolItem } from "@make-the-pick/shared";

type BaseStats = {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
};

type SpeciesFinalLike = {
  pokemonId: number;
  name: string;
  regionalForm: string | null;
  types: string[];
  baseStats: BaseStats;
  generation: string;
  spriteUrl: string | null;
};

// Flat projection of a draft pool item's metadata regardless of drafting
// mode. The table UI is one row per pool item in both modes — individual
// rows render the Pokemon's own stats, species rows render the terminal
// final form's stats — so callers should treat this as "the data for the
// row" and avoid branching on `mode` themselves.
export type PoolItemDisplay = {
  // "individual" for Pokemon drafting (or legacy rows without a mode
  // discriminator); "species" for species drafting. Exposed so callers that
  // actually care (e.g. a cell that wants to show a "species" badge) can
  // still branch.
  mode: "individual" | "species";
  pokemonId: number;
  types: string[];
  baseStats: BaseStats;
  generation: string;
  // For species rows, all finals beyond the primary — used to hint that
  // a species has regional-variant finals (e.g. Alolan Ninetales).
  // Empty for individual rows.
  regionalFinals: SpeciesFinalLike[];
};

// Projects a draft pool item's metadata onto the flat `PoolItemDisplay`
// shape. Returns null if the item has no metadata at all.
//
// In species mode the "primary" final is `metadata.finals[0]` — that is,
// the base-region terminal — and any additional regional-variant finals
// go into `regionalFinals`.
//
// Legacy rows persisted before the mode discriminator existed have no
// `mode` field at all; we treat them as individual so older leagues keep
// rendering.
export function getPoolItemDisplay(
  item: DraftPoolItem,
): PoolItemDisplay | null {
  const metadata = item.metadata as
    | (PoolItemDisplay["mode"] extends string ? {
        mode?: "individual" | "species";
      } & Record<string, unknown>
      : never)
    | null;
  if (!metadata) return null;

  if (metadata.mode === "species") {
    const speciesMeta = metadata as unknown as {
      finals: SpeciesFinalLike[];
    };
    const [primary, ...regionalFinals] = speciesMeta.finals;
    if (!primary) return null;
    return {
      mode: "species",
      pokemonId: primary.pokemonId,
      types: primary.types,
      baseStats: primary.baseStats,
      generation: primary.generation,
      regionalFinals,
    };
  }

  const individualMeta = metadata as unknown as {
    pokemonId: number;
    types: string[];
    baseStats: BaseStats;
    generation: string;
  };
  return {
    mode: "individual",
    pokemonId: individualMeta.pokemonId,
    types: individualMeta.types,
    baseStats: individualMeta.baseStats,
    generation: individualMeta.generation,
    regionalFinals: [],
  };
}

// Convenience helper for code paths that only need the numeric base stat
// total and want to handle the null-metadata case with a fall-through.
export function getPoolItemStatTotal(item: DraftPoolItem): number | null {
  const display = getPoolItemDisplay(item);
  if (!display) return null;
  const s = display.baseStats;
  return s.hp + s.attack + s.defense + s.specialAttack + s.specialDefense +
    s.speed;
}
