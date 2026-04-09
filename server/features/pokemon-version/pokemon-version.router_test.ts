import { assertEquals } from "@std/assert";
import type { PokemonVersion } from "@make-the-pick/shared";
import { createPokemonVersionRouter } from "./pokemon-version.router.ts";
import { router } from "../../trpc/trpc.ts";
import { createContext } from "../../trpc/context.ts";

const fakePokemonVersions: PokemonVersion[] = [
  {
    id: "red",
    name: "Red",
    versionGroup: "red-blue",
    region: "Kanto",
    generation: 1,
  },
  {
    id: "gold",
    name: "Gold",
    versionGroup: "gold-silver",
    region: "Johto",
    generation: 2,
  },
];

Deno.test("pokemonVersion.list returns all pokemon versions", async () => {
  const pokemonVersionRouter = createPokemonVersionRouter(fakePokemonVersions);
  const testRouter = router({ pokemonVersion: pokemonVersionRouter });
  const ctx = await createContext(new Request("http://localhost/"));
  const caller = testRouter.createCaller(ctx);

  const result = await caller.pokemonVersion.list();

  assertEquals(result.length, 2);
  assertEquals(result[0].id, "red");
  assertEquals(result[1].id, "gold");
});

Deno.test("pokemonVersion.list returns versions with all expected fields", async () => {
  const pokemonVersionRouter = createPokemonVersionRouter(fakePokemonVersions);
  const testRouter = router({ pokemonVersion: pokemonVersionRouter });
  const ctx = await createContext(new Request("http://localhost/"));
  const caller = testRouter.createCaller(ctx);

  const result = await caller.pokemonVersion.list();
  const version = result[0];

  assertEquals(version.id, "red");
  assertEquals(version.name, "Red");
  assertEquals(version.versionGroup, "red-blue");
  assertEquals(version.region, "Kanto");
  assertEquals(version.generation, 1);
});
