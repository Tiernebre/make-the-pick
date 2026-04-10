import type {
  DraftPoolItem,
  DraftState,
  LeaguePlayer,
} from "@make-the-pick/shared";

export function makePlayer(
  id: string,
  name: string,
  overrides: Partial<LeaguePlayer> = {},
): LeaguePlayer {
  return {
    id,
    userId: `user-${id}`,
    name,
    image: null,
    role: "member",
    joinedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makePoolItem(
  id: string,
  name: string,
  types: string[] = ["normal"],
): DraftPoolItem {
  return {
    id,
    draftPoolId: "pool-1",
    name,
    thumbnailUrl: null,
    metadata: {
      pokemonId: 1,
      types,
      baseStats: {
        hp: 50,
        attack: 50,
        defense: 50,
        specialAttack: 50,
        specialDefense: 50,
        speed: 50,
      },
      generation: "1",
    },
  };
}

export interface DraftStateOverrides {
  status?: string;
  currentPick?: number;
  pickOrder?: string[];
  players?: LeaguePlayer[];
  poolItems?: DraftPoolItem[];
  picks?: DraftState["picks"];
  availableItemIds?: string[];
  leagueId?: string;
}

export function makeDraftState(
  overrides: DraftStateOverrides = {},
): DraftState {
  const players = overrides.players ?? [
    makePlayer("p1", "Alice"),
    makePlayer("p2", "Bob"),
  ];
  const poolItems = overrides.poolItems ?? [
    makePoolItem("item-1", "bulbasaur", ["grass"]),
    makePoolItem("item-2", "charmander", ["fire"]),
    makePoolItem("item-3", "squirtle", ["water"]),
    makePoolItem("item-4", "pikachu", ["electric"]),
  ];
  const picks = overrides.picks ?? [];
  const pickedIds = new Set(picks.map((p) => p.poolItemId));
  const availableItemIds = overrides.availableItemIds ??
    poolItems.filter((i) => !pickedIds.has(i.id)).map((i) => i.id);

  return {
    draft: {
      id: "draft-1",
      leagueId: overrides.leagueId ?? "league-1",
      format: "snake",
      status: overrides.status ?? "in_progress",
      pickOrder: overrides.pickOrder ?? players.map((p) => p.id),
      currentPick: overrides.currentPick ?? 0,
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: null,
    },
    picks,
    players,
    poolItems,
    availableItemIds,
  };
}
