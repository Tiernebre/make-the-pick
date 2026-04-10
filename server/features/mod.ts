import type {
  Pokemon,
  PokemonVersion,
  RegionalPokedexEntry,
} from "@make-the-pick/shared";
import pokemonJson from "../../packages/shared/data/pokemon.json" with {
  type: "json",
};
import pokemonVersionsJson from "../../packages/shared/data/pokemon-versions.json" with {
  type: "json",
};
import regionalPokedexesJson from "../../packages/shared/data/regional-pokedexes.json" with {
  type: "json",
};
import legendaryPokemonJson from "../../packages/shared/data/legendary-pokemon.json" with {
  type: "json",
};
import starterPokemonJson from "../../packages/shared/data/starter-pokemon.json" with {
  type: "json",
};
import tradeEvolutionPokemonJson from "../../packages/shared/data/trade-evolution-pokemon.json" with {
  type: "json",
};
import type { Hono } from "hono";
import {
  createDraftEventPublisher,
  createDraftRepository,
  createDraftRouter,
  createDraftService,
  type DraftEventPublisher,
  type DraftService,
  registerDraftSseRoute,
} from "./draft/mod.ts";
import { auth } from "../auth/mod.ts";
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
import { createPokemonVersionRouter } from "./pokemon-version/mod.ts";
import {
  createUserRepository,
  createUserRouter,
  createUserService,
} from "./user/mod.ts";
import {
  createPoolItemNoteRepository,
  createPoolItemNoteRouter,
  createPoolItemNoteService,
} from "./pool-item-note/mod.ts";
import {
  createWatchlistRepository,
  createWatchlistRouter,
  createWatchlistService,
} from "./watchlist/mod.ts";

export function createFeatureRouters(db: Database) {
  const leagueRepo = createLeagueRepository(db);
  const draftRepo = createDraftRepository(db);
  const draftPoolRepo = createDraftPoolRepository(db);
  const draftPoolService = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: pokemonJson as Pokemon[],
    pokemonVersions: pokemonVersionsJson as PokemonVersion[],
    regionalPokedexes: regionalPokedexesJson as Record<
      string,
      RegionalPokedexEntry[]
    >,
    legendaryPokemonIds: legendaryPokemonJson as number[],
    starterPokemonIds: starterPokemonJson as number[],
    tradeEvolutionPokemonIds: tradeEvolutionPokemonJson as number[],
  });
  const draftPoolRouter = createDraftPoolRouter(draftPoolService);

  const leagueService = createLeagueService({
    leagueRepo,
    draftRepo,
    draftPoolService,
  });
  const leagueRouter = createLeagueRouter(leagueService);

  const draftEventPublisher = createDraftEventPublisher();
  const draftService = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher,
  });
  const draftRouter = createDraftRouter(draftService);

  const userRepo = createUserRepository(db);
  const userService = createUserService({ userRepo });
  const userRouter = createUserRouter(userService);

  const pokemonVersionRouter = createPokemonVersionRouter(
    pokemonVersionsJson as PokemonVersion[],
  );

  const watchlistRepo = createWatchlistRepository(db);
  const watchlistService = createWatchlistService({
    watchlistRepo,
    leagueRepo,
  });
  const watchlistRouter = createWatchlistRouter(watchlistService);

  const poolItemNoteRepo = createPoolItemNoteRepository(db);
  const poolItemNoteService = createPoolItemNoteService({
    poolItemNoteRepo,
    leagueRepo,
  });
  const poolItemNoteRouter = createPoolItemNoteRouter(poolItemNoteService);

  return {
    leagueRouter,
    userRouter,
    draftPoolRouter,
    draftRouter,
    pokemonVersionRouter,
    watchlistRouter,
    poolItemNoteRouter,
    draftEventPublisher,
    draftService,
  };
}

/**
 * Registers non-tRPC HTTP routes that depend on feature services — currently
 * the draft SSE stream. Called from `main.ts` after `createFeatureRouters`
 * so the publisher singleton is shared with the tRPC-facing draft service.
 */
export function registerFeatureRoutes(
  app: Hono,
  deps: {
    draftEventPublisher: DraftEventPublisher;
    draftService: DraftService;
  },
): void {
  registerDraftSseRoute(app, {
    draftService: deps.draftService,
    draftEventPublisher: deps.draftEventPublisher,
    sessionResolver: async (req) => {
      const sessionData = await auth.api.getSession({ headers: req.headers });
      if (!sessionData?.user?.id) return null;
      return { userId: sessionData.user.id };
    },
  });
}
