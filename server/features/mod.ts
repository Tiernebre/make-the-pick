import type { Pokemon } from "@make-the-pick/shared";
import pokemonJson from "../../packages/shared/data/pokemon.json" with {
  type: "json",
};
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
  const leagueService = createLeagueService({ leagueRepo });
  const leagueRouter = createLeagueRouter(leagueService);

  const userRepo = createUserRepository(db);
  const userService = createUserService({ userRepo });
  const userRouter = createUserRouter(userService);

  const draftPoolRepo = createDraftPoolRepository(db);
  const draftPoolService = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: pokemonJson as Pokemon[],
  });
  const draftPoolRouter = createDraftPoolRouter(draftPoolService);

  return { leagueRouter, userRouter, draftPoolRouter };
}
