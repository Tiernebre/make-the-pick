import { assertEquals } from "@std/assert";
import type { Pokemon } from "./pokemon.ts";
import type { PokemonEvolutionsData } from "./pokemon-evolutions.ts";
import { buildSpecies, type Species } from "./species.ts";

function mon(
  id: number,
  name: string,
  overrides: Partial<Pokemon> = {},
): Pokemon {
  return {
    id,
    name,
    types: ["normal"],
    baseStats: {
      hp: 50,
      attack: 50,
      defense: 50,
      specialAttack: 50,
      specialDefense: 50,
      speed: 50,
    },
    generation: "generation-i",
    captureRate: 45,
    spriteUrl: `sprite/${id}.png`,
    ...overrides,
  };
}

function evo(
  pokemonId: number,
  chainId: number,
  evolvesFromId: number | null,
): PokemonEvolutionsData[string] {
  return { pokemonId, chainId, evolvesFromId, triggers: [] };
}

function findSpecies(species: Species[], name: string): Species {
  const match = species.find((s) => s.name === name);
  if (!match) {
    throw new Error(
      `species "${name}" not found; got: ${
        species.map((s) => s.name).join(", ")
      }`,
    );
  }
  return match;
}

Deno.test("buildSpecies: linear 3-stage line collapses to one species", () => {
  const pokemon: Pokemon[] = [
    mon(4, "charmander", { types: ["fire"] }),
    mon(5, "charmeleon", { types: ["fire"] }),
    mon(6, "charizard", { types: ["fire", "flying"] }),
  ];
  const evolutions: PokemonEvolutionsData = {
    "4": evo(4, 2, null),
    "5": evo(5, 2, 4),
    "6": evo(6, 2, 5),
  };

  const species = buildSpecies(pokemon, evolutions);

  assertEquals(species.length, 1);
  const charizard = species[0];
  assertEquals(charizard.name, "charizard");
  assertEquals(charizard.finals.length, 1);
  assertEquals(charizard.finals[0].pokemonId, 6);
  assertEquals(charizard.finals[0].regionalForm, null);
  assertEquals(charizard.finals[0].types, ["fire", "flying"]);
  assertEquals(charizard.members.map((m) => m.pokemonId), [4, 5, 6]);
  assertEquals(
    charizard.members.map((m) => m.stage),
    ["base", "middle", "final"],
  );
  // Each member carries its own sprite so the UI can render an evolution
  // chain like "<charmander> <charmeleon> <charizard> Charizard Line".
  assertEquals(
    charizard.members.map((m) => m.spriteUrl),
    ["sprite/4.png", "sprite/5.png", "sprite/6.png"],
  );
});

Deno.test("buildSpecies: single-stage pokemon is its own species", () => {
  const pokemon: Pokemon[] = [mon(128, "tauros")];
  const evolutions: PokemonEvolutionsData = {
    "128": evo(128, 50, null),
  };

  const species = buildSpecies(pokemon, evolutions);

  assertEquals(species.length, 1);
  assertEquals(species[0].name, "tauros");
  assertEquals(species[0].finals.length, 1);
  assertEquals(species[0].finals[0].pokemonId, 128);
  assertEquals(species[0].members.length, 1);
  assertEquals(species[0].members[0].stage, "final");
});

Deno.test("buildSpecies: branching chain produces one species per terminal, sharing base", () => {
  const pokemon: Pokemon[] = [
    mon(133, "eevee"),
    mon(134, "vaporeon", { types: ["water"] }),
    mon(135, "jolteon", { types: ["electric"] }),
    mon(136, "flareon", { types: ["fire"] }),
  ];
  const evolutions: PokemonEvolutionsData = {
    "133": evo(133, 67, null),
    "134": evo(134, 67, 133),
    "135": evo(135, 67, 133),
    "136": evo(136, 67, 133),
  };

  const species = buildSpecies(pokemon, evolutions);

  assertEquals(species.length, 3);
  const flareon = findSpecies(species, "flareon");
  assertEquals(flareon.finals.map((f) => f.pokemonId), [136]);
  assertEquals(flareon.members.map((m) => m.pokemonId), [133, 136]);
  assertEquals(flareon.members.map((m) => m.stage), ["base", "final"]);

  const jolteon = findSpecies(species, "jolteon");
  assertEquals(jolteon.members.map((m) => m.pokemonId), [133, 135]);
  const vaporeon = findSpecies(species, "vaporeon");
  assertEquals(vaporeon.members.map((m) => m.pokemonId), [133, 134]);
});

Deno.test("buildSpecies: regional variants of a terminal collapse into one species", () => {
  const pokemon: Pokemon[] = [
    mon(37, "vulpix", { types: ["fire"] }),
    mon(38, "ninetales", { types: ["fire"] }),
    mon(10103, "vulpix-alola", { types: ["ice"] }),
    mon(10104, "ninetales-alola", { types: ["ice", "fairy"] }),
  ];
  const evolutions: PokemonEvolutionsData = {
    "37": evo(37, 15, null),
    "38": evo(38, 15, 37),
  };

  const species = buildSpecies(pokemon, evolutions);

  assertEquals(species.length, 1);
  const ninetales = species[0];
  assertEquals(ninetales.name, "ninetales");

  // Both regional finals present, each with a regionalForm set.
  assertEquals(ninetales.finals.length, 2);
  const kanto = ninetales.finals.find((f) => f.pokemonId === 38);
  const alola = ninetales.finals.find((f) => f.pokemonId === 10104);
  if (!kanto || !alola) throw new Error("missing regional final");
  assertEquals(kanto.regionalForm, null);
  assertEquals(kanto.types, ["fire"]);
  assertEquals(alola.regionalForm, "alola");
  assertEquals(alola.types, ["ice", "fairy"]);

  // Members include both regional pre-evos.
  const memberIds = ninetales.members.map((m) => m.pokemonId).sort((a, b) =>
    a - b
  );
  assertEquals(memberIds, [37, 38, 10103, 10104]);
  const alolaVulpix = ninetales.members.find((m) => m.pokemonId === 10103);
  if (!alolaVulpix) throw new Error("missing alolan vulpix");
  assertEquals(alolaVulpix.regionalForm, "alola");
  assertEquals(alolaVulpix.stage, "base");
  assertEquals(alolaVulpix.spriteUrl, "sprite/10103.png");
});

Deno.test("buildSpecies: linear chain with Galarian pre-evos collapses to one species (Obstagoon)", () => {
  const pokemon: Pokemon[] = [
    mon(263, "zigzagoon", { types: ["normal"] }),
    mon(264, "linoone", { types: ["normal"] }),
    mon(862, "obstagoon", { types: ["dark", "normal"] }),
    mon(22217, "zigzagoon-galar", { types: ["dark", "normal"] }),
    mon(22236, "linoone-galar", { types: ["dark", "normal"] }),
  ];
  const evolutions: PokemonEvolutionsData = {
    "263": evo(263, 134, null),
    "264": evo(264, 134, 263),
    "862": evo(862, 134, 264),
  };

  const species = buildSpecies(pokemon, evolutions);

  assertEquals(species.length, 1);
  const obstagoon = species[0];
  assertEquals(obstagoon.name, "obstagoon");
  assertEquals(obstagoon.finals.length, 1);
  assertEquals(obstagoon.finals[0].pokemonId, 862);

  const memberIds = obstagoon.members.map((m) => m.pokemonId).sort((a, b) =>
    a - b
  );
  assertEquals(memberIds, [263, 264, 862, 22217, 22236]);
  const galarZig = obstagoon.members.find((m) => m.pokemonId === 22217);
  if (!galarZig) throw new Error("missing galar zigzagoon");
  assertEquals(galarZig.regionalForm, "galar");
  assertEquals(galarZig.stage, "base");
});

Deno.test("buildSpecies: returns species sorted deterministically", () => {
  const pokemon: Pokemon[] = [
    mon(4, "charmander"),
    mon(5, "charmeleon"),
    mon(6, "charizard"),
    mon(1, "bulbasaur"),
    mon(2, "ivysaur"),
    mon(3, "venusaur"),
  ];
  const evolutions: PokemonEvolutionsData = {
    "1": evo(1, 1, null),
    "2": evo(2, 1, 1),
    "3": evo(3, 1, 2),
    "4": evo(4, 2, null),
    "5": evo(5, 2, 4),
    "6": evo(6, 2, 5),
  };

  const species = buildSpecies(pokemon, evolutions);
  // Sorted by the terminal final's pokemon id ascending, so venusaur before charizard.
  assertEquals(species.map((s) => s.name), ["venusaur", "charizard"]);
});
