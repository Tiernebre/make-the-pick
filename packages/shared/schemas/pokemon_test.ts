import { assertEquals, assertThrows } from "@std/assert";
import { pokemonSchema } from "./pokemon.ts";

Deno.test("pokemonSchema parses a valid pokemon", () => {
  const result = pokemonSchema.parse({
    id: 25,
    name: "pikachu",
    types: ["electric"],
    baseStats: {
      hp: 35,
      attack: 55,
      defense: 40,
      specialAttack: 50,
      specialDefense: 50,
      speed: 90,
    },
    generation: "generation-i",
    spriteUrl:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
  });

  assertEquals(result.id, 25);
  assertEquals(result.name, "pikachu");
  assertEquals(result.types, ["electric"]);
  assertEquals(result.baseStats.hp, 35);
  assertEquals(result.generation, "generation-i");
});

Deno.test("pokemonSchema accepts null spriteUrl", () => {
  const result = pokemonSchema.parse({
    id: 10271,
    name: "some-form",
    types: ["normal"],
    baseStats: {
      hp: 50,
      attack: 50,
      defense: 50,
      specialAttack: 50,
      specialDefense: 50,
      speed: 50,
    },
    generation: "generation-ix",
    spriteUrl: null,
  });

  assertEquals(result.spriteUrl, null);
});

Deno.test("pokemonSchema rejects missing fields", () => {
  assertThrows(() => {
    pokemonSchema.parse({});
  });
});

Deno.test("pokemonSchema rejects wrong types", () => {
  assertThrows(() => {
    pokemonSchema.parse({
      id: "not-a-number",
      name: 123,
      types: "fire",
      baseStats: null,
      generation: 1,
      spriteUrl: 42,
    });
  });
});
