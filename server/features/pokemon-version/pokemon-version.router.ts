import type { PokemonVersion } from "@make-the-pick/shared";
import { procedure, router } from "../../trpc/trpc.ts";

export function createPokemonVersionRouter(
  pokemonVersions: PokemonVersion[],
) {
  return router({
    list: procedure.query(() => {
      return pokemonVersions;
    }),
  });
}
