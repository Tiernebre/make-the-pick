/**
 * NPC draft strategy identifiers. Stored on `user.npc_strategy` (nullable —
 * null for human users). For type specialists, the preferred type is encoded
 * after a colon, e.g. `type-specialist:water`, so a single text column can
 * describe any NPC's draft behavior without a separate metadata table.
 */
export const NPC_STRATEGY_KINDS = [
  "balanced",
  "best-available",
  "type-specialist",
  "regional",
  "chaos",
] as const;

export type NpcStrategyKind = (typeof NPC_STRATEGY_KINDS)[number];

export interface NpcStrategyInfo {
  kind: NpcStrategyKind;
  preferredType: string | null;
  preferredGeneration: string | null;
  label: string;
  description: string;
}

const LABELS: Record<NpcStrategyKind, string> = {
  "balanced": "Balanced",
  "best-available": "Best Available",
  "type-specialist": "Type Specialist",
  "regional": "Regional Favorite",
  "chaos": "Chaos",
};

const DESCRIPTIONS: Record<NpcStrategyKind, string> = {
  "balanced": "Diversifies types across the roster",
  "best-available": "Always grabs the highest base-stat Pokémon",
  "type-specialist": "Favors a single signature type",
  "regional": "Favors Pokémon from a specific region",
  "chaos": "Picks completely at random",
};

const REGION_NAMES: Record<string, string> = {
  "generation-i": "Kanto",
  "generation-ii": "Johto",
  "generation-iii": "Hoenn",
  "generation-iv": "Sinnoh",
  "generation-v": "Unova",
  "generation-vi": "Kalos",
  "generation-vii": "Alola",
  "generation-viii": "Galar",
  "generation-ix": "Paldea",
};

/**
 * Parses a raw `npc_strategy` value (nullable text column) into a structured
 * `NpcStrategyInfo`. Returns `null` for human users or unknown values.
 */
export function parseNpcStrategy(raw: string | null): NpcStrategyInfo | null {
  if (!raw) return null;
  const [kindRaw, modifier] = raw.split(":");
  const kind = kindRaw as NpcStrategyKind;
  if (!NPC_STRATEGY_KINDS.includes(kind)) return null;
  const preferredType = kind === "type-specialist" ? (modifier ?? null) : null;
  const preferredGeneration = kind === "regional" ? (modifier ?? null) : null;
  let label = LABELS[kind];
  if (kind === "type-specialist" && preferredType) {
    label = `${capitalize(preferredType)} Specialist`;
  } else if (kind === "regional" && preferredGeneration) {
    const region = REGION_NAMES[preferredGeneration];
    if (region) label = `${region} Native`;
  }
  const description = DESCRIPTIONS[kind];
  return {
    kind,
    preferredType,
    preferredGeneration,
    label,
    description,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TYPE_COLORS: Record<string, string> = {
  normal: "gray",
  fire: "red",
  water: "blue",
  electric: "yellow",
  grass: "lime",
  ice: "cyan",
  fighting: "orange",
  poison: "grape",
  ground: "yellow",
  flying: "indigo",
  psychic: "pink",
  bug: "teal",
  rock: "dark",
  ghost: "violet",
  dragon: "indigo",
  dark: "dark",
  steel: "gray",
  fairy: "pink",
};

/**
 * Returns a Mantine color name for rendering an NPC strategy badge. Each
 * strategy gets a distinct hue so the tag is recognizable at a glance —
 * e.g. Electric Specialist renders yellow, Balanced renders neutral gray.
 */
export function npcStrategyColor(info: NpcStrategyInfo): string {
  switch (info.kind) {
    case "balanced":
      return "gray";
    case "best-available":
      return "green";
    case "regional":
      return "orange";
    case "chaos":
      return "grape";
    case "type-specialist":
      return info.preferredType
        ? (TYPE_COLORS[info.preferredType] ?? "gray")
        : "gray";
  }
}
