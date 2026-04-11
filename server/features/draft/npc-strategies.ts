/**
 * NPC draft strategies. Each NPC user carries a strategy string on
 * `user.npc_strategy`; when their turn comes up, `runNpcPick` delegates pool
 * selection to `pickWithStrategy` below. This module is intentionally
 * free of I/O so strategies can be tested with plain in-memory fixtures.
 */

interface PoolItemMetadata {
  pokemonId?: number;
  types?: string[];
  generation?: string;
  baseStats?: {
    hp?: number;
    attack?: number;
    defense?: number;
    specialAttack?: number;
    specialDefense?: number;
    speed?: number;
  };
}

export interface StrategyPoolItem {
  id: string;
  metadata: unknown;
}

export interface PickWithStrategyArgs<T extends StrategyPoolItem> {
  rawStrategy: string | null;
  availableItems: T[];
  myPicks: T[];
  randomFn: () => number;
}

function readMeta(item: StrategyPoolItem): PoolItemMetadata {
  return (item.metadata ?? {}) as PoolItemMetadata;
}

function bstTotal(item: StrategyPoolItem): number {
  const bs = readMeta(item).baseStats;
  if (!bs) return 0;
  return (bs.hp ?? 0) +
    (bs.attack ?? 0) +
    (bs.defense ?? 0) +
    (bs.specialAttack ?? 0) +
    (bs.specialDefense ?? 0) +
    (bs.speed ?? 0);
}

function pokemonId(item: StrategyPoolItem): number {
  return readMeta(item).pokemonId ?? Number.POSITIVE_INFINITY;
}

function types(item: StrategyPoolItem): string[] {
  return readMeta(item).types ?? [];
}

function generation(item: StrategyPoolItem): string | null {
  return readMeta(item).generation ?? null;
}

function pickRandom<T>(items: T[], randomFn: () => number): T | null {
  if (items.length === 0) return null;
  const index = Math.floor(randomFn() * items.length);
  return items[index];
}

function pickBestAvailable<T extends StrategyPoolItem>(items: T[]): T | null {
  if (items.length === 0) return null;
  let best = items[0];
  let bestTotal = bstTotal(best);
  let bestId = pokemonId(best);
  for (let i = 1; i < items.length; i++) {
    const candidate = items[i];
    const total = bstTotal(candidate);
    const id = pokemonId(candidate);
    if (total > bestTotal || (total === bestTotal && id < bestId)) {
      best = candidate;
      bestTotal = total;
      bestId = id;
    }
  }
  return best;
}

function pickTypeSpecialist<T extends StrategyPoolItem>(
  items: T[],
  preferredType: string | null,
): T | null {
  if (!preferredType) return pickBestAvailable(items);
  const matching = items.filter((item) =>
    types(item).some((t) => t.toLowerCase() === preferredType.toLowerCase())
  );
  if (matching.length > 0) return pickBestAvailable(matching);
  return pickBestAvailable(items);
}

function pickRegional<T extends StrategyPoolItem>(
  items: T[],
  preferredGeneration: string | null,
): T | null {
  if (!preferredGeneration) return pickBestAvailable(items);
  const matching = items.filter((item) =>
    generation(item)?.toLowerCase() === preferredGeneration.toLowerCase()
  );
  if (matching.length > 0) return pickBestAvailable(matching);
  return pickBestAvailable(items);
}

function pickBalanced<T extends StrategyPoolItem>(
  availableItems: T[],
  myPicks: T[],
): T | null {
  if (availableItems.length === 0) return null;
  const typeCounts = new Map<string, number>();
  for (const picked of myPicks) {
    for (const t of types(picked)) {
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
  }

  let best = availableItems[0];
  let bestPenalty = scorePenalty(best, typeCounts);
  let bestTotal = bstTotal(best);
  for (let i = 1; i < availableItems.length; i++) {
    const candidate = availableItems[i];
    const penalty = scorePenalty(candidate, typeCounts);
    const total = bstTotal(candidate);
    if (
      penalty < bestPenalty ||
      (penalty === bestPenalty && total > bestTotal)
    ) {
      best = candidate;
      bestPenalty = penalty;
      bestTotal = total;
    }
  }
  return best;
}

function scorePenalty(
  item: StrategyPoolItem,
  typeCounts: Map<string, number>,
): number {
  const itemTypes = types(item);
  if (itemTypes.length === 0) return 0;
  let sum = 0;
  for (const t of itemTypes) {
    sum += typeCounts.get(t) ?? 0;
  }
  return sum;
}

export function pickWithStrategy<T extends StrategyPoolItem>(
  args: PickWithStrategyArgs<T>,
): T | null {
  const { rawStrategy, availableItems, myPicks, randomFn } = args;
  if (availableItems.length === 0) return null;

  if (!rawStrategy) return pickRandom(availableItems, randomFn);

  const [kind, preferredType] = rawStrategy.split(":");
  switch (kind) {
    case "best-available":
      return pickBestAvailable(availableItems);
    case "type-specialist":
      return pickTypeSpecialist(availableItems, preferredType ?? null);
    case "regional":
      return pickRegional(availableItems, preferredType ?? null);
    case "balanced":
      return pickBalanced(availableItems, myPicks);
    case "chaos":
      return pickRandom(availableItems, randomFn);
    default:
      return pickRandom(availableItems, randomFn);
  }
}
