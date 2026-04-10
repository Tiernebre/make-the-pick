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
  "chaos",
] as const;

export type NpcStrategyKind = (typeof NPC_STRATEGY_KINDS)[number];

export interface NpcStrategyInfo {
  kind: NpcStrategyKind;
  preferredType: string | null;
  label: string;
  description: string;
}

const LABELS: Record<NpcStrategyKind, string> = {
  "balanced": "Balanced",
  "best-available": "Best Available",
  "type-specialist": "Type Specialist",
  "chaos": "Chaos",
};

const DESCRIPTIONS: Record<NpcStrategyKind, string> = {
  "balanced": "Diversifies types across the roster",
  "best-available": "Always grabs the highest base-stat Pokémon",
  "type-specialist": "Favors a single signature type",
  "chaos": "Picks completely at random",
};

/**
 * Parses a raw `npc_strategy` value (nullable text column) into a structured
 * `NpcStrategyInfo`. Returns `null` for human users or unknown values.
 */
export function parseNpcStrategy(raw: string | null): NpcStrategyInfo | null {
  if (!raw) return null;
  const [kindRaw, preferredType] = raw.split(":");
  const kind = kindRaw as NpcStrategyKind;
  if (!NPC_STRATEGY_KINDS.includes(kind)) return null;
  const label = kind === "type-specialist" && preferredType
    ? `${capitalize(preferredType)} Specialist`
    : LABELS[kind];
  const description = DESCRIPTIONS[kind];
  return {
    kind,
    preferredType: preferredType ?? null,
    label,
    description,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
