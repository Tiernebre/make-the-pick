import type {
  DraftPoolItemMetadata,
  Pokemon,
  PokemonEncountersData,
  PokemonEvolution,
  PokemonEvolutionsData,
  PokemonVersion,
  PoolItemAvailability,
  PoolItemEffort,
  PoolItemEncounter,
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

interface StoredPoolItem {
  id: string;
  draftPoolId: string;
  name: string;
  thumbnailUrl: string | null;
  metadata: unknown;
}

interface AugmentedPoolItem {
  id: string;
  draftPoolId: string;
  name: string;
  thumbnailUrl: string | null;
  metadata: DraftPoolItemMetadata | null;
  availability: PoolItemAvailability | null;
  encounter: PoolItemEncounter | null;
  effort: PoolItemEffort | null;
  evolution: PokemonEvolution | null;
}

interface AugmentContext {
  regionalDex: RegionalPokedexEntry[] | undefined;
  gameVersionId: string | undefined;
  encountersForVersion:
    | Record<
      string,
      {
        primary: { location: string; method: string } | null;
        encounters: Array<
          {
            location: string;
            method: string;
            minLevel: number;
            maxLevel: number;
            chance: number;
          }
        >;
      }
    >
    | undefined;
  evolutions: PokemonEvolutionsData | undefined;
  tradeEvolutionIds: Set<number>;
}

function isSimpleLevelUpTrigger(
  t: PokemonEvolution["triggers"][number],
): boolean {
  return t.trigger === "level-up" &&
    t.minLevel !== null &&
    t.item === null &&
    t.heldItem === null &&
    t.knownMove === null &&
    t.minHappiness === null &&
    t.timeOfDay === null &&
    !t.needsOverworldRain &&
    t.location === null &&
    t.tradeSpecies === null;
}

export function computeEffort(deps: {
  captureRate: number | null;
  encounter: PoolItemEncounter | null;
  evolution: PokemonEvolution | null;
  isTradeEvolution: boolean;
}): PoolItemEffort {
  const reasons: string[] = [];
  let score = 1;

  if (deps.captureRate !== null) {
    if (deps.captureRate <= 45) {
      reasons.push(`Low catch rate (${deps.captureRate})`);
      score += 2;
    } else if (deps.captureRate <= 120) {
      reasons.push(`Moderate catch rate (${deps.captureRate})`);
      score += 1;
    }
  }

  if (!deps.encounter || deps.encounter.all.length === 0) {
    reasons.push("No wild encounters in this version");
    score += 2;
  } else {
    const bestChance = Math.max(...deps.encounter.all.map((e) => e.chance));
    if (bestChance > 0 && bestChance < 5) {
      reasons.push(`Very rare encounter (${bestChance}% best chance)`);
      score += 2;
    } else if (bestChance > 0 && bestChance < 15) {
      reasons.push(`Rare encounter (${bestChance}% best chance)`);
      score += 1;
    }
    if (deps.encounter.source) {
      reasons.push(
        `Must catch ${deps.encounter.source.name} and evolve it`,
      );
      score += 1;
    }
  }

  if (deps.isTradeEvolution) {
    reasons.push("Trade evolution required");
    score += 2;
  } else if (deps.evolution && deps.evolution.triggers.length > 0) {
    const hasComplex = deps.evolution.triggers.some(
      (t) => !isSimpleLevelUpTrigger(t),
    );
    if (hasComplex) {
      reasons.push("Complex evolution requirement");
      score += 1;
    } else {
      const highestLevel = Math.max(
        ...deps.evolution.triggers.map((t) => t.minLevel ?? 0),
        0,
      );
      if (highestLevel >= 40) {
        reasons.push(`Evolves at level ${highestLevel}`);
        score += 2;
      } else if (highestLevel >= 30) {
        reasons.push(`Evolves at level ${highestLevel}`);
        score += 1;
      }
    }
  }

  if (reasons.length === 0) {
    reasons.push("Easy to obtain and field");
  }

  return { score: Math.max(1, Math.min(score, 5)), reasons };
}

export function computeAvailabilityBucket(
  dexNumber: number,
  dexSize: number,
): PoolItemAvailability {
  const earlyCutoff = Math.ceil(dexSize / 3);
  const midCutoff = Math.ceil((dexSize * 2) / 3);
  if (dexNumber <= earlyCutoff) return "early";
  if (dexNumber <= midCutoff) return "mid";
  return "late";
}

function augmentItems(
  items: StoredPoolItem[],
  ctx: AugmentContext,
  pokemonById: Map<number, Pokemon>,
): AugmentedPoolItem[] {
  const dexByPokemonId = new Map<number, number>();
  const dexSize = ctx.regionalDex?.length ?? 0;
  if (ctx.regionalDex) {
    for (const entry of ctx.regionalDex) {
      dexByPokemonId.set(entry.pokemonId, entry.dexNumber);
    }
  }

  return items.map((item) => {
    const metadata = item.metadata as DraftPoolItemMetadata | null;

    let availability: PoolItemAvailability | null = null;
    if (metadata && dexSize > 0) {
      const dexNumber = dexByPokemonId.get(metadata.pokemonId);
      if (dexNumber !== undefined) {
        availability = computeAvailabilityBucket(dexNumber, dexSize);
      }
    }

    let evolution: PokemonEvolution | null = null;
    if (metadata && ctx.evolutions) {
      evolution = ctx.evolutions[String(metadata.pokemonId)] ?? null;
    }

    let encounter: PoolItemEncounter | null = null;
    if (metadata && ctx.encountersForVersion) {
      const directEntry = ctx.encountersForVersion[String(metadata.pokemonId)];
      if (directEntry && directEntry.encounters.length > 0) {
        encounter = {
          primary: directEntry.primary,
          all: directEntry.encounters,
        };
      } else if (ctx.evolutions) {
        // Evolved Pokemon are rarely catchable in the wild. Walk the
        // pre-evolution chain until we find a stage that has encounters.
        const seen = new Set<number>([metadata.pokemonId]);
        let cursor =
          ctx.evolutions[String(metadata.pokemonId)]?.evolvesFromId ??
            null;
        while (cursor !== null && !seen.has(cursor)) {
          seen.add(cursor);
          const entry = ctx.encountersForVersion[String(cursor)];
          if (entry && entry.encounters.length > 0) {
            const sourcePokemon = pokemonById.get(cursor);
            encounter = {
              primary: entry.primary,
              all: entry.encounters,
              source: {
                pokemonId: cursor,
                name: sourcePokemon?.name ?? String(cursor),
              },
            };
            break;
          }
          cursor = ctx.evolutions[String(cursor)]?.evolvesFromId ?? null;
        }
      }
    }

    let effort: PoolItemEffort | null = null;
    if (metadata) {
      const pokemon = pokemonById.get(metadata.pokemonId);
      const captureSource = encounter?.source
        ? pokemonById.get(encounter.source.pokemonId) ?? pokemon
        : pokemon;
      effort = computeEffort({
        captureRate: captureSource?.captureRate ?? null,
        encounter,
        evolution,
        isTradeEvolution: ctx.tradeEvolutionIds.has(metadata.pokemonId),
      });
    }

    return {
      id: item.id,
      draftPoolId: item.draftPoolId,
      name: item.name,
      thumbnailUrl: item.thumbnailUrl,
      metadata,
      availability,
      encounter,
      effort,
      evolution,
    };
  });
}

function resolveRegionalDexForLeague(
  rulesConfig: RulesConfig | null,
  pokemonVersions: PokemonVersion[] | undefined,
  regionalPokedexes: Record<string, RegionalPokedexEntry[]> | undefined,
): RegionalPokedexEntry[] | undefined {
  if (!rulesConfig?.gameVersion) return undefined;
  const version = pokemonVersions?.find((v) =>
    v.id === rulesConfig.gameVersion
  );
  if (!version) return undefined;
  return regionalPokedexes?.[version.versionGroup];
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
  pokemonEncounters?: PokemonEncountersData;
  pokemonEvolutions?: PokemonEvolutionsData;
}) {
  const pokemonById = new Map<number, Pokemon>(
    deps.pokemonData.map((p) => [p.id, p]),
  );
  const tradeEvolutionIdSet = new Set<number>(
    deps.tradeEvolutionPokemonIds ?? [],
  );

  function buildAugmentContext(
    rulesConfig: RulesConfig | null,
  ): AugmentContext {
    const regionalDex = resolveRegionalDexForLeague(
      rulesConfig,
      deps.pokemonVersions,
      deps.regionalPokedexes,
    );
    const gameVersionId = rulesConfig?.gameVersion;
    const encountersForVersion = gameVersionId
      ? deps.pokemonEncounters?.[gameVersionId]
      : undefined;
    return {
      regionalDex,
      gameVersionId,
      encountersForVersion,
      evolutions: deps.pokemonEvolutions,
      tradeEvolutionIds: tradeEvolutionIdSet,
    };
  }

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

      const augmentedItems = augmentItems(
        items,
        buildAugmentContext(rulesConfig),
        pokemonById,
      );

      return { ...pool, items: augmentedItems };
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

      const augmentedItems = augmentItems(
        items,
        buildAugmentContext(league.rulesConfig as RulesConfig | null),
        pokemonById,
      );

      return { ...pool, items: augmentedItems };
    },
  };
}

export type DraftPoolService = ReturnType<typeof createDraftPoolService>;
