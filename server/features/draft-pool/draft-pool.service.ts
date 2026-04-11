import type {
  DraftPoolItemMetadata,
  IndividualPoolItemMetadata,
  Pokemon,
  PokemonEncountersData,
  PokemonEvolution,
  PokemonEvolutionsData,
  PokemonGiftsData,
  PokemonVersion,
  PoolItemAvailability,
  PoolItemEffort,
  PoolItemEncounter,
  RegionalPokedexEntry,
  Species,
  SpeciesPoolItemMetadata,
} from "@make-the-pick/shared";
import { buildSpecies, LEAGUE_STATUS_TRANSITIONS } from "@make-the-pick/shared";
import { TRPCError } from "@trpc/server";
import { logger } from "../../logger.ts";
import type { DraftEventPublisher } from "../draft/draft.events.ts";
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
  draftMode?: "individual" | "species";
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

type EncountersForVersion = NonNullable<
  PokemonEncountersData[string]
>;

export function isCatchableInVersion(
  pokemonId: number,
  encountersForVersion: EncountersForVersion,
  evolutions: PokemonEvolutionsData | undefined,
  giftIds: Set<number>,
): boolean {
  if (giftIds.has(pokemonId)) return true;
  if ((encountersForVersion[String(pokemonId)]?.encounters.length ?? 0) > 0) {
    return true;
  }
  if (!evolutions) return false;
  // Walk the pre-evolution chain: an evolved form is obtainable as long as
  // some stage below it can be caught in this version.
  const seen = new Set<number>([pokemonId]);
  let cursor = evolutions[String(pokemonId)]?.evolvesFromId ?? null;
  while (cursor !== null && !seen.has(cursor)) {
    if (giftIds.has(cursor)) return true;
    if ((encountersForVersion[String(cursor)]?.encounters.length ?? 0) > 0) {
      return true;
    }
    seen.add(cursor);
    cursor = evolutions[String(cursor)]?.evolvesFromId ?? null;
  }
  return false;
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
    // Species-mode augmentation lives in a later PR; today every persisted
    // pool item is individual-mode, so narrow to that branch before reading
    // pokemonId-anchored context. Legacy rows predate the discriminator and
    // store no `mode` field, so treat "anything that isn't species" as
    // individual rather than a strict equality check.
    const individual: IndividualPoolItemMetadata | null =
      metadata && metadata.mode !== "species"
        ? (metadata as IndividualPoolItemMetadata)
        : null;

    let availability: PoolItemAvailability | null = null;
    if (individual && dexSize > 0) {
      const dexNumber = dexByPokemonId.get(individual.pokemonId);
      if (dexNumber !== undefined) {
        availability = computeAvailabilityBucket(dexNumber, dexSize);
      }
    }

    let evolution: PokemonEvolution | null = null;
    if (individual && ctx.evolutions) {
      evolution = ctx.evolutions[String(individual.pokemonId)] ?? null;
    }

    let encounter: PoolItemEncounter | null = null;
    if (individual && ctx.encountersForVersion) {
      const directEntry =
        ctx.encountersForVersion[String(individual.pokemonId)];
      if (directEntry && directEntry.encounters.length > 0) {
        encounter = {
          primary: directEntry.primary,
          all: directEntry.encounters,
        };
      } else if (ctx.evolutions) {
        // Evolved Pokemon are rarely catchable in the wild. Walk the
        // pre-evolution chain until we find a stage that has encounters.
        const seen = new Set<number>([individual.pokemonId]);
        let cursor =
          ctx.evolutions[String(individual.pokemonId)]?.evolvesFromId ??
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
    if (individual) {
      const pokemon = pokemonById.get(individual.pokemonId);
      const captureSource = encounter?.source
        ? pokemonById.get(encounter.source.pokemonId) ?? pokemon
        : pokemon;
      effort = computeEffort({
        captureRate: captureSource?.captureRate ?? null,
        encounter,
        evolution,
        isTradeEvolution: ctx.tradeEvolutionIds.has(individual.pokemonId),
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
  pokemonGifts?: PokemonGiftsData;
  eventPublisher?: DraftEventPublisher;
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

      if (league.status !== "setup" && league.status !== "pooling") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Draft pool can only be generated before the draft has started",
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

        // Some Pokemon are in the regional dex for a version group but are
        // not actually obtainable in the specific version the league picked
        // — e.g. Zangoose/Seviper are Ruby/Sapphire-locked, but both ship
        // with the shared Hoenn dex. Drop anything that has no wild
        // encounter (direct or via pre-evolution chain) and is not listed
        // in the hand-curated gift / static / in-game-trade data for the
        // version. When the encounter dataset is missing entirely (legacy
        // tests, disabled feature) we skip this filter to stay back-compat.
        const encountersForVersion = deps.pokemonEncounters?.[
          rulesConfig.gameVersion
        ];
        if (encountersForVersion) {
          const giftIds = new Set<number>(
            deps.pokemonGifts?.[rulesConfig.gameVersion] ?? [],
          );
          const beforeCount = eligiblePokemon.length;
          eligiblePokemon = eligiblePokemon.filter((p) =>
            isCatchableInVersion(
              p.id,
              encountersForVersion,
              deps.pokemonEvolutions,
              giftIds,
            )
          );
          log.debug(
            {
              gameVersion: rulesConfig.gameVersion,
              droppedCount: beforeCount - eligiblePokemon.length,
              eligibleCount: eligiblePokemon.length,
            },
            "filtered Pokemon by catchability",
          );
        }
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
      const draftMode = rulesConfig.draftMode ?? "individual";

      // In species mode the pool universe is the set of draftable species,
      // not individual Pokemon, so compute both the universe and the per-
      // species filter verdict up front. A species is eligible if *any* of
      // its terminal finals survived the individual-level filters above —
      // see species-draft.md invariant 5.
      let speciesUniverse: Species[] = [];
      if (draftMode === "species") {
        if (!deps.pokemonEvolutions) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Species drafting requires Pokemon evolution data to be loaded",
          });
        }
        const eligibleIds = new Set(eligiblePokemon.map((p) => p.id));
        const allSpecies = buildSpecies(
          deps.pokemonData,
          deps.pokemonEvolutions,
        );
        speciesUniverse = allSpecies.filter((species) =>
          species.finals.some((final) => eligibleIds.has(final.pokemonId))
        );

        if (speciesUniverse.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No eligible species remain after applying the league's filter rules",
          });
        }
      }

      const universeSize = draftMode === "species"
        ? speciesUniverse.length
        : eligiblePokemon.length;
      const rawPoolSize = Math.floor(
        rulesConfig.numberOfRounds * playerCount * multiplier,
      );
      const poolSize = Math.min(rawPoolSize, universeSize);

      log.debug(
        {
          leagueId: input.leagueId,
          playerCount,
          numberOfRounds: rulesConfig.numberOfRounds,
          multiplier,
          draftMode,
          universeSize,
          poolSize,
        },
        "calculated pool size",
      );

      // Delete existing pool (re-roll support)
      await deps.draftPoolRepo.deleteByLeagueId(input.leagueId);

      // Create pool
      const pool = await deps.draftPoolRepo.create(
        input.leagueId,
        "Draft Pool",
      );

      // Map to pool items. In both modes the source array is already
      // fisher-yates shuffled, so using the array index as reveal_order
      // gives a deterministic but random-looking showcase sequence without
      // a second shuffle.
      let poolItems: Array<{
        draftPoolId: string;
        name: string;
        thumbnailUrl: string | null;
        metadata: IndividualPoolItemMetadata | SpeciesPoolItemMetadata;
        revealOrder: number;
        revealedAt: null;
      }>;
      if (draftMode === "species") {
        const shuffled = fisherYatesShuffle(speciesUniverse);
        const selected = shuffled.slice(0, poolSize);
        poolItems = selected.map((species, index) => {
          const firstFinal = species.finals[0];
          const metadata: SpeciesPoolItemMetadata = {
            mode: "species",
            finals: species.finals,
            members: species.members,
          };
          return {
            draftPoolId: pool.id,
            name: species.name,
            thumbnailUrl: firstFinal?.spriteUrl ?? null,
            metadata,
            revealOrder: index,
            revealedAt: null,
          };
        });
      } else {
        const shuffled = fisherYatesShuffle(eligiblePokemon);
        const selected = shuffled.slice(0, poolSize);
        poolItems = selected.map((pokemon, index) => {
          const metadata: IndividualPoolItemMetadata = {
            mode: "individual",
            pokemonId: pokemon.id,
            types: pokemon.types,
            baseStats: pokemon.baseStats,
            generation: pokemon.generation,
          };
          return {
            draftPoolId: pool.id,
            name: pokemon.name,
            thumbnailUrl: pokemon.spriteUrl,
            metadata,
            revealOrder: index,
            revealedAt: null,
          };
        });
      }

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

      // During the "pooling" phase the showcase is mid-reveal: members
      // (including the commissioner running it) only see items the
      // commissioner has actually revealed so far. Once the league has
      // advanced to scouting or beyond, the filter drops and everything is
      // visible.
      const isPooling = league.status === "pooling";
      const items = await deps.draftPoolRepo.findItemsByPoolId(pool.id, {
        onlyRevealed: isPooling,
      });

      // Include the total pool size (not just revealed) so the client can
      // render a "X / Y revealed" progress indicator in the showcase banner
      // without hitting a separate endpoint. Outside of pooling, totalItems
      // equals items.length since the filter is off.
      const totalItems = isPooling
        ? items.length +
          (await deps.draftPoolRepo.countUnrevealedItems(pool.id))
        : items.length;

      const augmentedItems = augmentItems(
        items,
        buildAugmentContext(league.rulesConfig as RulesConfig | null),
        pokemonById,
      );

      return { ...pool, items: augmentedItems, totalItems };
    },

    async revealNext(userId: string, input: { leagueId: string }) {
      log.debug(
        { userId, leagueId: input.leagueId },
        "revealing next draft pool item",
      );

      const league = await deps.leagueRepo.findById(input.leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      if (league.status !== "pooling") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Draft pool items can only be revealed during the pooling phase",
        });
      }
      const player = await deps.leagueRepo.findPlayer(
        input.leagueId,
        userId,
      );
      if (player?.role !== "commissioner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can reveal draft pool items",
        });
      }

      const pool = await deps.draftPoolRepo.findByLeagueId(input.leagueId);
      if (!pool) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No draft pool has been generated for this league",
        });
      }

      const result = await deps.draftPoolRepo.revealNextItem(
        pool.id,
        new Date(),
      );
      if (!result) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All draft pool items have already been revealed",
        });
      }

      deps.eventPublisher?.publish(input.leagueId, {
        type: "draftPool:item_revealed",
        data: {
          itemId: result.item.id,
          revealOrder: result.item.revealOrder,
          remaining: result.remaining,
        },
      });

      // Auto-advance to scouting when the last item has just been revealed.
      // Avoids making the commissioner click "Advance" right after clicking
      // "Reveal" — the showcase is done, so there is nothing left to wait
      // for. Done via the direct repo call rather than by re-entering
      // leagueService.advanceStatus so we don't run revealAllItems again on
      // a pool that is already fully revealed. The next status is looked up
      // from the shared transition map instead of hard-coding "scouting"
      // so that if the lifecycle is ever reshuffled this auto-advance
      // follows the same chain the manual "Advance" button walks.
      if (result.remaining === 0) {
        const nextStatus = LEAGUE_STATUS_TRANSITIONS.pooling;
        if (nextStatus) {
          await deps.leagueRepo.updateStatus(input.leagueId, nextStatus);
        }
        deps.eventPublisher?.publish(input.leagueId, {
          type: "draftPool:reveal_completed",
        });
      }

      return {
        itemId: result.item.id,
        revealOrder: result.item.revealOrder,
        remaining: result.remaining,
      };
    },
  };
}

export type DraftPoolService = ReturnType<typeof createDraftPoolService>;
