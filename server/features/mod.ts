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

  return { leagueRouter, userRouter };
}
