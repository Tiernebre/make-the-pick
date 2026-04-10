import type {
  Pokemon,
  PokemonVersion,
  RegionalPokedexEntry,
} from "@make-the-pick/shared";
import { TRPCError } from "@trpc/server";
import { logger } from "../../logger.ts";
import type { LeagueRepository } from "../league/league.repository.ts";
import type { DraftPoolRepository } from "./draft-pool.repository.ts";

const log = logger.child({ module: "draft-pool.service" });

const DEFAULT_POOL_SIZE_MULTIPLIER = 2;

interface RulesConfig {
  numberOfRounds: number;
  poolSizeMultiplier?: number;
  gameVersion?: string;
  excludeLegendaries?: boolean;
  excludeStarters?: boolean;
  excludeTradeEvolutions?: boolean;
}

function fisherYatesShuffle<T>(
  array: T[],
  randomFn: () => number = Math.random,
): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createDraftPoolService(deps: {
  draftPoolRepo: DraftPoolRepository;
  leagueRepo: LeagueRepository;
  pokemonData: Pokemon[];
  pokemonVersions?: PokemonVersion[];
  regionalPokedexes?: Record<string, RegionalPokedexEntry[]>;
  legendaryPokemonIds?: number[];
  starterPokemonIds?: number[];
  tradeEvolutionPokemonIds?: number[];
}) {
  return {
    async generate(userId: string, input: { leagueId: string }) {
      log.debug(
        { userId, leagueId: input.leagueId },
        "generating draft pool",
      );

      const league = await deps.leagueRepo.findById(input.leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }

      if (league.status !== "setup") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Draft pool can only be generated during league setup",
        });
      }

      const player = await deps.leagueRepo.findPlayer(
        input.leagueId,
        userId,
      );
      if (player?.role !== "commissioner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can generate the draft pool",
        });
      }

      if (!league.rulesConfig) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "League rules must be configured before generating a draft pool",
        });
      }

      const playerCount = await deps.leagueRepo.countPlayers(input.leagueId);
      if (playerCount < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "League needs at least 2 players to generate a draft pool",
        });
      }

      const rulesConfig = league.rulesConfig as RulesConfig;

      // Filter Pokemon by regional dex if a game version is specified
      let eligiblePokemon = deps.pokemonData;
      if (rulesConfig.gameVersion) {
        const version = deps.pokemonVersions?.find(
          (v) => v.id === rulesConfig.gameVersion,
        );
        if (!version) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Unknown game version: ${rulesConfig.gameVersion}`,
          });
        }

        const regionalDexIds = deps.regionalPokedexes?.[version.versionGroup];
        if (!regionalDexIds) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              `No regional Pokedex data for version group: ${version.versionGroup}`,
          });
        }

        const dexIdSet = new Set(regionalDexIds.map((e) => e.pokemonId));
        eligiblePokemon = deps.pokemonData.filter((p) => dexIdSet.has(p.id));

        log.debug(
          {
            gameVersion: rulesConfig.gameVersion,
            versionGroup: version.versionGroup,
            regionalDexSize: regionalDexIds.length,
            eligibleCount: eligiblePokemon.length,
          },
          "filtered Pokemon by regional dex",
        );
      }

      // Apply category exclusions
      const excludeIds = new Set<number>();
      if (rulesConfig.excludeLegendaries && deps.legendaryPokemonIds) {
        for (const id of deps.legendaryPokemonIds) excludeIds.add(id);
      }
      if (rulesConfig.excludeStarters && deps.starterPokemonIds) {
        for (const id of deps.starterPokemonIds) excludeIds.add(id);
      }
      if (rulesConfig.excludeTradeEvolutions && deps.tradeEvolutionPokemonIds) {
        for (const id of deps.tradeEvolutionPokemonIds) excludeIds.add(id);
      }
      if (excludeIds.size > 0) {
        eligiblePokemon = eligiblePokemon.filter((p) => !excludeIds.has(p.id));
        log.debug(
          {
            excludedCount: excludeIds.size,
            eligibleCount: eligiblePokemon.length,
          },
          "applied category exclusions",
        );
      }

      if (eligiblePokemon.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No eligible Pokemon remain after applying the league's filter rules",
        });
      }

      const multiplier = rulesConfig.poolSizeMultiplier ??
        DEFAULT_POOL_SIZE_MULTIPLIER;
      const rawPoolSize = Math.floor(
        rulesConfig.numberOfRounds * playerCount * multiplier,
      );
      const poolSize = Math.min(rawPoolSize, eligiblePokemon.length);

      log.debug(
        {
          leagueId: input.leagueId,
          playerCount,
          numberOfRounds: rulesConfig.numberOfRounds,
          multiplier,
          poolSize,
        },
        "calculated pool size",
      );

      // Delete existing pool (re-roll support)
      await deps.draftPoolRepo.deleteByLeagueId(input.leagueId);

      // Shuffle and select
      const shuffled = fisherYatesShuffle(eligiblePokemon);
      const selected = shuffled.slice(0, poolSize);

      // Create pool
      const pool = await deps.draftPoolRepo.create(
        input.leagueId,
        "Draft Pool",
      );

      // Map to pool items
      const poolItems = selected.map((pokemon) => ({
        draftPoolId: pool.id,
        name: pokemon.name,
        thumbnailUrl: pokemon.spriteUrl,
        metadata: {
          pokemonId: pokemon.id,
          types: pokemon.types,
          baseStats: pokemon.baseStats,
          generation: pokemon.generation,
        },
      }));

      const items = await deps.draftPoolRepo.createItems(poolItems);

      log.debug(
        { poolId: pool.id, itemCount: items.length },
        "draft pool generated",
      );

      return { ...pool, items };
    },

    async getByLeagueId(userId: string, leagueId: string) {
      log.debug({ userId, leagueId }, "fetching draft pool");

      const league = await deps.leagueRepo.findById(leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }

      const player = await deps.leagueRepo.findPlayer(leagueId, userId);
      if (!player) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a member of the league to view the draft pool",
        });
      }

      const pool = await deps.draftPoolRepo.findByLeagueId(leagueId);
      if (!pool) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No draft pool has been generated for this league yet",
        });
      }

      const items = await deps.draftPoolRepo.findItemsByPoolId(pool.id);

      return { ...pool, items };
    },
  };
}

export type DraftPoolService = ReturnType<typeof createDraftPoolService>;
