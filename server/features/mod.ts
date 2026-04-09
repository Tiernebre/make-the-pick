import type { Pokemon, PokemonVersion } from "@make-the-pick/shared";
import pokemonJson from "../../packages/shared/data/pokemon.json" with {
  type: "json",
};
import pokemonVersionsJson from "../../packages/shared/data/pokemon-versions.json" with {
  type: "json",
};
import regionalPokedexesJson from "../../packages/shared/data/regional-pokedexes.json" with {
  type: "json",
};
import { createDraftRepository } from "./draft/mod.ts";
import {
  createDraftPoolRepository,
  createDraftPoolRouter,
  createDraftPoolService,
} from "./draft-pool/mod.ts";
import type { Database } from "./league/league.repository.ts";
import {
  createLeagueRepository,
  createLeagueRouter,
  createLeagueService,
} from "./league/mod.ts";
import {
  createUserRepository,
  createUserRouter,
  createUserService,
} from "./user/mod.ts";

export function createFeatureRouters(db: Database) {
  const leagueRepo = createLeagueRepository(db);
  const draftRepo = createDraftRepository(db);
  const leagueService = createLeagueService({ leagueRepo, draftRepo });
  const leagueRouter = createLeagueRouter(leagueService);

  const userRepo = createUserRepository(db);
  const userService = createUserService({ userRepo });
  const userRouter = createUserRouter(userService);

  const draftPoolRepo = createDraftPoolRepository(db);
  const draftPoolService = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: pokemonJson as Pokemon[],
    pokemonVersions: pokemonVersionsJson as PokemonVersion[],
    regionalPokedexes: regionalPokedexesJson as Record<string, number[]>,
  });
  const draftPoolRouter = createDraftPoolRouter(draftPoolService);

  return { leagueRouter, userRouter, draftPoolRouter };
}
