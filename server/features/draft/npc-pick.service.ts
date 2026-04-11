/**
 * NPC pick selection service.
 *
 * Extracted from `draft.service.ts` to keep the strategy-selection concern
 * independently testable and to narrow the blast radius of the draft
 * service. Given the current NPC player, the draft pool, and the picks so
 * far, decides which pool item the NPC should draft.
 *
 * This service is pure (no I/O). The draft service is responsible for
 * loading the draft context and persisting the resulting pick.
 */

import { pickWithStrategy, type StrategyPoolItem } from "./npc-strategies.ts";

export interface NpcPickSelectionInput<T extends StrategyPoolItem> {
  currentLeaguePlayerId: string;
  npcStrategy: string | null;
  poolItems: T[];
  picks: ReadonlyArray<{ leaguePlayerId: string; poolItemId: string }>;
  randomFn: () => number;
}

export interface NpcPickService {
  selectPick<T extends StrategyPoolItem>(
    input: NpcPickSelectionInput<T>,
  ): T | null;
}

export function createNpcPickService(): NpcPickService {
  function selectPick<T extends StrategyPoolItem>(
    input: NpcPickSelectionInput<T>,
  ): T | null {
    const {
      currentLeaguePlayerId,
      npcStrategy,
      poolItems,
      picks,
      randomFn,
    } = input;

    const pickedItemIds = new Set(picks.map((p) => p.poolItemId));
    const availableItems = poolItems.filter(
      (item) => !pickedItemIds.has(item.id),
    );
    if (availableItems.length === 0) return null;

    const myPickIds = new Set(
      picks
        .filter((p) => p.leaguePlayerId === currentLeaguePlayerId)
        .map((p) => p.poolItemId),
    );
    const myPicks = poolItems.filter((item) => myPickIds.has(item.id));

    return pickWithStrategy({
      rawStrategy: npcStrategy,
      availableItems,
      myPicks,
      randomFn,
    });
  }

  return { selectPick };
}
