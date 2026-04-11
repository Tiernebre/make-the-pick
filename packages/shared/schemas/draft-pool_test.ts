import { assertEquals, assertThrows } from "@std/assert";
import {
  draftPoolItemMetadataSchema,
  individualPoolItemMetadataSchema,
  speciesPoolItemMetadataSchema,
} from "./draft-pool.ts";

const individualWithoutMode = {
  pokemonId: 6,
  types: ["fire", "flying"],
  baseStats: {
    hp: 78,
    attack: 84,
    defense: 78,
    specialAttack: 109,
    specialDefense: 85,
    speed: 100,
  },
  generation: "generation-i",
};

const individualWithMode = {
  ...individualWithoutMode,
  mode: "individual" as const,
};

const speciesMetadata = {
  mode: "species" as const,
  finals: [
    {
      pokemonId: 38,
      name: "ninetales",
      regionalForm: null,
      types: ["fire"],
      baseStats: {
        hp: 73,
        attack: 76,
        defense: 75,
        specialAttack: 81,
        specialDefense: 100,
        speed: 100,
      },
      generation: "generation-i",
      spriteUrl: null,
    },
    {
      pokemonId: 10229,
      name: "ninetales",
      regionalForm: "alola",
      types: ["ice", "fairy"],
      baseStats: {
        hp: 73,
        attack: 67,
        defense: 75,
        specialAttack: 81,
        specialDefense: 100,
        speed: 109,
      },
      generation: "generation-vii",
      spriteUrl: null,
    },
  ],
  members: [
    {
      pokemonId: 37,
      name: "vulpix",
      regionalForm: null,
      stage: "base" as const,
      spriteUrl: null,
    },
    {
      pokemonId: 38,
      name: "ninetales",
      regionalForm: null,
      stage: "final" as const,
      spriteUrl: null,
    },
    {
      pokemonId: 10228,
      name: "vulpix-alola",
      regionalForm: "alola",
      stage: "base" as const,
      spriteUrl: null,
    },
    {
      pokemonId: 10229,
      name: "ninetales-alola",
      regionalForm: "alola",
      stage: "final" as const,
      spriteUrl: null,
    },
  ],
};

Deno.test("draftPoolItemMetadataSchema accepts legacy individual metadata without a mode field", () => {
  const parsed = draftPoolItemMetadataSchema.parse(individualWithoutMode);
  assertEquals(parsed.mode, "individual");
  if (parsed.mode !== "individual") throw new Error("expected individual");
  assertEquals(parsed.pokemonId, 6);
  assertEquals(parsed.types, ["fire", "flying"]);
});

Deno.test("draftPoolItemMetadataSchema accepts individual metadata with an explicit mode", () => {
  const parsed = draftPoolItemMetadataSchema.parse(individualWithMode);
  assertEquals(parsed.mode, "individual");
});

Deno.test("draftPoolItemMetadataSchema accepts species metadata", () => {
  const parsed = draftPoolItemMetadataSchema.parse(speciesMetadata);
  if (parsed.mode !== "species") throw new Error("expected species");
  assertEquals(parsed.finals.length, 2);
  assertEquals(parsed.members.length, 4);
  assertEquals(parsed.finals[0].regionalForm, null);
  assertEquals(parsed.finals[1].regionalForm, "alola");
});

Deno.test("draftPoolItemMetadataSchema rejects species metadata missing finals", () => {
  const broken = { ...speciesMetadata, finals: undefined };
  assertThrows(() => draftPoolItemMetadataSchema.parse(broken));
});

Deno.test("draftPoolItemMetadataSchema rejects species metadata missing members", () => {
  const broken = { ...speciesMetadata, members: undefined };
  assertThrows(() => draftPoolItemMetadataSchema.parse(broken));
});

Deno.test("draftPoolItemMetadataSchema rejects unknown mode", () => {
  assertThrows(() =>
    draftPoolItemMetadataSchema.parse({
      ...individualWithoutMode,
      mode: "bogus",
    })
  );
});

Deno.test("individualPoolItemMetadataSchema validates the individual shape directly", () => {
  const parsed = individualPoolItemMetadataSchema.parse(individualWithoutMode);
  assertEquals(parsed.mode, "individual");
  assertEquals(parsed.pokemonId, 6);
});

Deno.test("speciesPoolItemMetadataSchema validates the species shape directly", () => {
  const parsed = speciesPoolItemMetadataSchema.parse(speciesMetadata);
  assertEquals(parsed.mode, "species");
  assertEquals(parsed.finals[0].pokemonId, 38);
});
