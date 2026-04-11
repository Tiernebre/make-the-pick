import { describe, expect, it } from "vitest";
import type { DraftPoolItem } from "@make-the-pick/shared";
import { getPoolItemDisplay } from "./pool-item-display";

const baseStats = {
  hp: 78,
  attack: 84,
  defense: 78,
  specialAttack: 109,
  specialDefense: 85,
  speed: 100,
};

function individualItem(): DraftPoolItem {
  return {
    id: "item-1",
    draftPoolId: "pool-1",
    name: "charizard",
    thumbnailUrl: "https://example.com/charizard.png",
    metadata: {
      mode: "individual",
      pokemonId: 6,
      types: ["fire", "flying"],
      baseStats,
      generation: "generation-i",
    },
    availability: null,
    encounter: null,
    effort: null,
    evolution: null,
  } as unknown as DraftPoolItem;
}

function speciesItem(): DraftPoolItem {
  return {
    id: "item-2",
    draftPoolId: "pool-1",
    name: "ninetales",
    thumbnailUrl: "https://example.com/ninetales.png",
    metadata: {
      mode: "species",
      finals: [
        {
          pokemonId: 38,
          name: "ninetales",
          regionalForm: null,
          types: ["fire"],
          baseStats,
          generation: "generation-i",
          spriteUrl: "https://example.com/ninetales.png",
        },
        {
          pokemonId: 10229,
          name: "ninetales",
          regionalForm: "alola",
          types: ["ice", "fairy"],
          baseStats: { ...baseStats, attack: 67, speed: 109 },
          generation: "generation-vii",
          spriteUrl: "https://example.com/ninetales-alola.png",
        },
      ],
      members: [
        {
          pokemonId: 37,
          name: "vulpix",
          regionalForm: null,
          stage: "base",
        },
        {
          pokemonId: 38,
          name: "ninetales",
          regionalForm: null,
          stage: "final",
        },
      ],
    },
    availability: null,
    encounter: null,
    effort: null,
    evolution: null,
  } as unknown as DraftPoolItem;
}

function legacyItemWithoutMode(): DraftPoolItem {
  return {
    id: "item-3",
    draftPoolId: "pool-1",
    name: "pikachu",
    thumbnailUrl: null,
    metadata: {
      // no `mode` field — legacy row written before PR 2
      pokemonId: 25,
      types: ["electric"],
      baseStats,
      generation: "generation-i",
    },
    availability: null,
    encounter: null,
    effort: null,
    evolution: null,
  } as unknown as DraftPoolItem;
}

describe("getPoolItemDisplay", () => {
  it("returns individual metadata projected onto the display shape", () => {
    const display = getPoolItemDisplay(individualItem());
    expect(display).not.toBeNull();
    expect(display!.pokemonId).toBe(6);
    expect(display!.types).toEqual(["fire", "flying"]);
    expect(display!.baseStats).toEqual(baseStats);
    expect(display!.generation).toBe("generation-i");
    expect(display!.mode).toBe("individual");
  });

  it("returns legacy individual metadata (no mode field) as individual", () => {
    const display = getPoolItemDisplay(legacyItemWithoutMode());
    expect(display).not.toBeNull();
    expect(display!.mode).toBe("individual");
    expect(display!.pokemonId).toBe(25);
    expect(display!.types).toEqual(["electric"]);
  });

  it("projects species metadata onto the terminal final", () => {
    const display = getPoolItemDisplay(speciesItem());
    expect(display).not.toBeNull();
    expect(display!.mode).toBe("species");
    // Primary final is the non-regional Ninetales — that is what the table
    // row displays by default.
    expect(display!.pokemonId).toBe(38);
    expect(display!.types).toEqual(["fire"]);
    expect(display!.generation).toBe("generation-i");
    expect(display!.baseStats.attack).toBe(84);
  });

  it("exposes regional final variants so a row can hint at them", () => {
    const display = getPoolItemDisplay(speciesItem());
    expect(display!.regionalFinals.length).toBe(1);
    expect(display!.regionalFinals[0].regionalForm).toBe("alola");
    expect(display!.regionalFinals[0].types).toEqual(["ice", "fairy"]);
  });

  it("returns null metadata when the item has no metadata", () => {
    const bare = {
      ...individualItem(),
      metadata: null,
    } as unknown as DraftPoolItem;
    expect(getPoolItemDisplay(bare)).toBeNull();
  });
});
