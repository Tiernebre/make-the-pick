import { assertEquals } from "@std/assert";
import { createNpcPickService } from "./npc-pick.service.ts";

interface FakePoolItem {
  id: string;
  metadata: unknown;
}

interface FakePick {
  leaguePlayerId: string;
  poolItemId: string;
}

function makeItem(id: string, total: number, pokemonId = 1): FakePoolItem {
  return {
    id,
    metadata: {
      pokemonId,
      baseStats: {
        hp: total,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
    },
  };
}

Deno.test("npcPickService.selectPick: excludes already-picked items from available pool", () => {
  const service = createNpcPickService();
  const poolItems: FakePoolItem[] = [
    makeItem("a", 100),
    makeItem("b", 200),
    makeItem("c", 300),
  ];
  const picks: FakePick[] = [{ leaguePlayerId: "npc-1", poolItemId: "c" }];

  const chosen = service.selectPick({
    currentLeaguePlayerId: "npc-1",
    npcStrategy: "best-available",
    poolItems,
    picks,
    randomFn: () => 0,
  });

  // "c" is already picked, so "b" (total=200) is best available.
  assertEquals(chosen?.id, "b");
});

Deno.test("npcPickService.selectPick: best-available strategy picks highest base-stat total", () => {
  const service = createNpcPickService();
  const poolItems: FakePoolItem[] = [
    makeItem("a", 100, 3),
    makeItem("b", 400, 2),
    makeItem("c", 400, 1),
  ];

  const chosen = service.selectPick({
    currentLeaguePlayerId: "npc-1",
    npcStrategy: "best-available",
    poolItems,
    picks: [],
    randomFn: () => 0,
  });

  // Ties on total go to lowest pokemonId -> "c".
  assertEquals(chosen?.id, "c");
});

Deno.test("npcPickService.selectPick: null strategy falls back to random (chaos) pick", () => {
  const service = createNpcPickService();
  const poolItems: FakePoolItem[] = [
    makeItem("a", 100),
    makeItem("b", 200),
    makeItem("c", 300),
  ];

  const chosen = service.selectPick({
    currentLeaguePlayerId: "npc-1",
    npcStrategy: null,
    poolItems,
    picks: [],
    // Deterministic randomFn returns 0 -> first available item.
    randomFn: () => 0,
  });

  assertEquals(chosen?.id, "a");
});

Deno.test("npcPickService.selectPick: balanced strategy considers current player's existing picks", () => {
  const service = createNpcPickService();
  // All items tied on total; balanced uses type diversity to break ties.
  const fire = {
    id: "fire1",
    metadata: {
      pokemonId: 1,
      types: ["fire"],
      baseStats: {
        hp: 100,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
    },
  };
  const water = {
    id: "water1",
    metadata: {
      pokemonId: 2,
      types: ["water"],
      baseStats: {
        hp: 100,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
    },
  };
  // NPC already owns a fire type; balanced should prefer water now.
  const alreadyOwned = {
    id: "owned-fire",
    metadata: {
      pokemonId: 99,
      types: ["fire"],
      baseStats: {
        hp: 100,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
    },
  };
  const poolItemsWithOwned: FakePoolItem[] = [fire, water, alreadyOwned];
  const picks: FakePick[] = [
    { leaguePlayerId: "npc-1", poolItemId: "owned-fire" },
  ];

  const chosen = service.selectPick({
    currentLeaguePlayerId: "npc-1",
    npcStrategy: "balanced",
    poolItems: poolItemsWithOwned,
    picks,
    randomFn: () => 0,
  });

  assertEquals(chosen?.id, "water1");
});

Deno.test("npcPickService.selectPick: returns null when no items are available", () => {
  const service = createNpcPickService();
  const poolItems: FakePoolItem[] = [makeItem("a", 100)];
  const picks: FakePick[] = [{ leaguePlayerId: "npc-1", poolItemId: "a" }];

  const chosen = service.selectPick({
    currentLeaguePlayerId: "npc-1",
    npcStrategy: "best-available",
    poolItems,
    picks,
    randomFn: () => 0,
  });

  assertEquals(chosen, null);
});

Deno.test("npcPickService.selectPick: only considers the current player's own picks for balanced scoring", () => {
  const service = createNpcPickService();
  const fire = {
    id: "fire1",
    metadata: {
      pokemonId: 1,
      types: ["fire"],
      baseStats: {
        hp: 100,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
    },
  };
  const water = {
    id: "water1",
    metadata: {
      pokemonId: 2,
      types: ["water"],
      baseStats: {
        hp: 100,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
    },
  };
  const ownedFire = {
    id: "owned-fire",
    metadata: {
      pokemonId: 99,
      types: ["fire"],
      baseStats: {
        hp: 100,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
    },
  };
  const poolItems: FakePoolItem[] = [fire, water, ownedFire];
  // Some OTHER player owns a fire pick; current NPC owns nothing.
  const picks: FakePick[] = [
    { leaguePlayerId: "other-player", poolItemId: "owned-fire" },
  ];

  const chosen = service.selectPick({
    currentLeaguePlayerId: "npc-1",
    npcStrategy: "balanced",
    poolItems,
    picks,
    randomFn: () => 0,
  });

  // Other player's fire ownership should not penalize fire for npc-1; both
  // fire and water have equal penalty (0), same total -> first item wins.
  assertEquals(chosen?.id, "fire1");
});
