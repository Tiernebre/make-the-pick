import type { Database } from "./league/league.repository.ts";
import {
  createLeagueRepository,
  createLeagueRouter,
  createLeagueService,
} from "./league/mod.ts";

export function createFeatureRouters(db: Database) {
  const leagueRepo = createLeagueRepository(db);
  const leagueService = createLeagueService({ leagueRepo });
  const leagueRouter = createLeagueRouter(leagueService);

  return { leagueRouter };
}
