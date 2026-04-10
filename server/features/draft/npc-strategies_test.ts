import { assertEquals } from "@std/assert";
import { pickWithStrategy } from "./npc-strategies.ts";

interface FakeItem {
  id: string;
  metadata: {
    pokemonId: number;
    types: string[];
    baseStats: {
      hp: number;
      attack: number;
      defense: number;
      specialAttack: number;
      specialDefense: number;
      speed: number;
    };
  };
}

function item(
  id: string,
  pokemonId: number,
  types: string[],
  bstTotal: number,
): FakeItem {
  const per = Math.floor(bstTotal / 6);
  return {
    id,
    metadata: {
      pokemonId,
      types,
      baseStats: {
        hp: per,
        attack: per,
        defense: per,
        specialAttack: per,
        specialDefense: per,
        speed: bstTotal - per * 5,
      },
    },
  };
}

const fixedRandom = () => 0;

Deno.test("pickWithStrategy: null strategy falls back to random", () => {
  const items = [item("a", 1, ["fire"], 300), item("b", 2, ["water"], 300)];
  const chosen = pickWithStrategy({
    rawStrategy: null,
    availableItems: items,
    myPicks: [],
    randomFn: fixedRandom,
  });
  assertEquals(chosen?.id, "a");
});

Deno.test("pickWithStrategy: chaos is random", () => {
  const items = [item("a", 1, ["fire"], 300), item("b", 2, ["water"], 600)];
  const chosen = pickWithStrategy({
    rawStrategy: "chaos",
    availableItems: items,
    myPicks: [],
    randomFn: () => 0.99,
  });
  assertEquals(chosen?.id, "b");
});

Deno.test("pickWithStrategy: best-available picks highest BST", () => {
  const items = [
    item("a", 1, ["fire"], 300),
    item("b", 2, ["water"], 500),
    item("c", 3, ["grass"], 450),
  ];
  const chosen = pickWithStrategy({
    rawStrategy: "best-available",
    availableItems: items,
    myPicks: [],
    randomFn: fixedRandom,
  });
  assertEquals(chosen?.id, "b");
});

Deno.test("pickWithStrategy: best-available breaks ties by lowest pokemonId", () => {
  const items = [
    item("a", 50, ["fire"], 500),
    item("b", 10, ["water"], 500),
  ];
  const chosen = pickWithStrategy({
    rawStrategy: "best-available",
    availableItems: items,
    myPicks: [],
    randomFn: fixedRandom,
  });
  assertEquals(chosen?.id, "b");
});

Deno.test("pickWithStrategy: type-specialist prefers the configured type", () => {
  const items = [
    item("a", 1, ["fire"], 600),
    item("b", 2, ["water"], 500),
    item("c", 3, ["water", "ice"], 450),
  ];
  const chosen = pickWithStrategy({
    rawStrategy: "type-specialist:water",
    availableItems: items,
    myPicks: [],
    randomFn: fixedRandom,
  });
  assertEquals(chosen?.id, "b");
});

Deno.test("pickWithStrategy: type-specialist falls back to best-available when no match", () => {
  const items = [
    item("a", 1, ["fire"], 400),
    item("b", 2, ["grass"], 550),
  ];
  const chosen = pickWithStrategy({
    rawStrategy: "type-specialist:water",
    availableItems: items,
    myPicks: [],
    randomFn: fixedRandom,
  });
  assertEquals(chosen?.id, "b");
});

Deno.test("pickWithStrategy: balanced penalizes already-drafted types", () => {
  const items = [
    item("a", 1, ["fire"], 500),
    item("b", 2, ["water"], 500),
  ];
  const chosen = pickWithStrategy({
    rawStrategy: "balanced",
    availableItems: items,
    myPicks: [item("x", 99, ["fire"], 500)],
    randomFn: fixedRandom,
  });
  assertEquals(chosen?.id, "b");
});

Deno.test("pickWithStrategy: balanced uses BST when types are equally represented", () => {
  const items = [
    item("a", 1, ["fire"], 400),
    item("b", 2, ["water"], 600),
  ];
  const chosen = pickWithStrategy({
    rawStrategy: "balanced",
    availableItems: items,
    myPicks: [],
    randomFn: fixedRandom,
  });
  assertEquals(chosen?.id, "b");
});

Deno.test("pickWithStrategy: returns null when no items available", () => {
  const chosen = pickWithStrategy({
    rawStrategy: "best-available",
    availableItems: [],
    myPicks: [],
    randomFn: fixedRandom,
  });
  assertEquals(chosen, null);
});
