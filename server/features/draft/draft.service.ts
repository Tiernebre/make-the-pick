import { TRPCError } from "@trpc/server";
import type { DraftEvent, DraftState } from "@make-the-pick/shared";
import { logger } from "../../logger.ts";
import type { DraftPoolRepository } from "../draft-pool/draft-pool.repository.ts";
import type { LeagueRepository } from "../league/league.repository.ts";
import {
  DraftPickConflictError,
  type DraftRepository,
} from "./draft.repository.ts";
import { computeTurnDeadline, resolveSnakeTurn } from "./draft-utils.ts";
import type { DraftEventPublisher } from "./draft.events.ts";
import type { Clock, DraftTimerScheduler } from "./draft.timers.ts";
import { type NpcScheduler, randomNpcPickDelayMs } from "./npc-scheduler.ts";

const noopPublisher: DraftEventPublisher = {
  subscribe: () => () => {},
  publish: () => {},
  subscriberCount: () => 0,
};

const log = logger.child({ module: "draft.service" });

interface RulesConfigShape {
  numberOfRounds: number;
  pickTimeLimitSeconds?: number | null;
}

type DraftRow = Awaited<ReturnType<DraftRepository["findByLeagueId"]>>;
type DraftPickRow = Awaited<ReturnType<DraftRepository["listPicks"]>>[number];
type LeagueRow = Awaited<ReturnType<LeagueRepository["findById"]>>;
type LeaguePlayerRow = Awaited<
  ReturnType<LeagueRepository["findPlayersByLeagueId"]>
>[number];
type PoolRow = Awaited<ReturnType<DraftPoolRepository["findByLeagueId"]>>;
type PoolItemRow = Awaited<
  ReturnType<DraftPoolRepository["findItemsByPoolId"]>
>[number];

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

function getNumberOfRounds(league: NonNullable<LeagueRow>): number {
  const rules = league.rulesConfig as RulesConfigShape | null;
  if (!rules || typeof rules.numberOfRounds !== "number") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "League rules must specify numberOfRounds",
    });
  }
  return rules.numberOfRounds;
}

function getPickTimeLimitSeconds(
  league: NonNullable<LeagueRow>,
): number | null {
  const rules = league.rulesConfig as RulesConfigShape | null;
  if (!rules || rules.pickTimeLimitSeconds == null) return null;
  if (typeof rules.pickTimeLimitSeconds !== "number") return null;
  return rules.pickTimeLimitSeconds;
}

interface PoolItemWithMetadata {
  id: string;
  metadata: unknown;
}

/**
 * Deterministic auto-pick selector — highest base-stat total, tiebreak by
 * lowest Pokédex id, then by name for the degenerate case.
 *
 * Addresses the spec's Open Question #3 ("what selection rule?") by picking
 * the strongest-on-paper option so auto-picks never hand out obviously bad
 * Pokémon to absent drafters.
 */
/**
 * Random pool-item selector used by NPC auto-picks. Dev-only: real auto-picks
 * on deadline expiry use the deterministic `selectAutoPickItem` above.
 */
export function selectRandomPoolItem<T>(
  availableItems: T[],
  randomFn: () => number = Math.random,
): T | null {
  if (availableItems.length === 0) return null;
  const index = Math.floor(randomFn() * availableItems.length);
  return availableItems[index];
}

export function selectAutoPickItem<T extends PoolItemWithMetadata>(
  availableItems: T[],
): T | null {
  if (availableItems.length === 0) return null;
  const scored = availableItems.map((item) => {
    const meta = item.metadata as
      | {
        pokemonId?: number;
        baseStats?: {
          hp?: number;
          attack?: number;
          defense?: number;
          specialAttack?: number;
          specialDefense?: number;
          speed?: number;
        };
      }
      | null;
    const bs = meta?.baseStats;
    const total = bs
      ? (bs.hp ?? 0) +
        (bs.attack ?? 0) +
        (bs.defense ?? 0) +
        (bs.specialAttack ?? 0) +
        (bs.specialDefense ?? 0) +
        (bs.speed ?? 0)
      : 0;
    return {
      item,
      total,
      pokemonId: meta?.pokemonId ?? Number.POSITIVE_INFINITY,
    };
  });
  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.pokemonId - b.pokemonId;
  });
  return scored[0].item;
}

function toStateShape(args: {
  draft: NonNullable<DraftRow>;
  picks: DraftPickRow[];
  players: LeaguePlayerRow[];
  poolItems: PoolItemRow[];
}) {
  const pickedItemIds = new Set(args.picks.map((p) => p.poolItemId));
  const availableItemIds = args.poolItems
    .filter((item) => !pickedItemIds.has(item.id))
    .map((item) => item.id);

  return {
    draft: {
      id: args.draft.id,
      leagueId: args.draft.leagueId,
      format: args.draft.format,
      status: args.draft.status,
      pickOrder: args.draft.pickOrder as string[],
      currentPick: args.draft.currentPick,
      startedAt: args.draft.startedAt
        ? args.draft.startedAt.toISOString()
        : null,
      completedAt: args.draft.completedAt
        ? args.draft.completedAt.toISOString()
        : null,
      currentTurnDeadline: args.draft.currentTurnDeadline
        ? (args.draft.currentTurnDeadline instanceof Date
          ? args.draft.currentTurnDeadline.toISOString()
          : String(args.draft.currentTurnDeadline))
        : null,
    },
    picks: args.picks.map((p) => ({
      id: p.id,
      draftId: p.draftId,
      leaguePlayerId: p.leaguePlayerId,
      poolItemId: p.poolItemId,
      pickNumber: p.pickNumber,
      pickedAt: p.pickedAt instanceof Date
        ? p.pickedAt.toISOString()
        : String(p.pickedAt),
      autoPicked: p.autoPicked ?? false,
    })),
    players: args.players.map((player) => ({
      id: player.id,
      userId: player.userId,
      name: player.name,
      image: player.image,
      isNpc: (player as { isNpc?: boolean }).isNpc ?? false,
      role: player.role,
      joinedAt: player.joinedAt instanceof Date
        ? player.joinedAt.toISOString()
        : String(player.joinedAt),
    })),
    poolItems: args.poolItems.map((item) => ({
      id: item.id,
      draftPoolId: item.draftPoolId,
      name: item.name,
      thumbnailUrl: item.thumbnailUrl,
      metadata: item.metadata,
    })),
    availableItemIds,
  };
}

export function createDraftService(deps: {
  draftRepo: DraftRepository;
  leagueRepo: LeagueRepository;
  draftPoolRepo: DraftPoolRepository;
  draftEventPublisher?: DraftEventPublisher;
  clock?: Clock;
  timerScheduler?: DraftTimerScheduler;
  npcScheduler?: NpcScheduler;
  randomFn?: () => number;
}) {
  const publisher = deps.draftEventPublisher ?? noopPublisher;
  const clock: Clock = deps.clock ?? { now: () => new Date() };
  const scheduler = deps.timerScheduler;
  const npcScheduler = deps.npcScheduler;
  const randomFn = deps.randomFn ?? Math.random;

  function publishTurnChange(
    leagueId: string,
    pickOrder: string[],
    nextPickNumber: number,
    turnDeadline: Date | null,
  ) {
    const turn = resolveSnakeTurn(pickOrder, nextPickNumber);
    const event: DraftEvent = {
      type: "draft:turn_change",
      data: {
        currentLeaguePlayerId: turn.leaguePlayerId,
        pickNumber: nextPickNumber,
        round: turn.round,
        turnDeadline: turnDeadline ? turnDeadline.toISOString() : null,
      },
    };
    publisher.publish(leagueId, event);
  }

  /**
   * If the player whose turn it currently is happens to be an NPC, schedule
   * an auto-pick after a short random "thinking" delay. No-op when no NPC
   * scheduler is wired (production) or the current player is human.
   */
  function maybeScheduleNpcPick(args: {
    draftId: string;
    leagueId: string;
    pickOrder: string[];
    currentPick: number;
    players: LeaguePlayerRow[];
  }) {
    if (!npcScheduler) return;
    const turn = resolveSnakeTurn(args.pickOrder, args.currentPick);
    const player = args.players.find((p) => p.id === turn.leaguePlayerId);
    const isNpc = (player as { isNpc?: boolean } | undefined)?.isNpc ?? false;
    if (!isNpc) {
      npcScheduler.cancel(args.draftId);
      return;
    }
    npcScheduler.schedule(
      args.draftId,
      args.leagueId,
      randomNpcPickDelayMs(randomFn),
    );
  }

  async function loadDraftContext(leagueId: string) {
    const league = await deps.leagueRepo.findById(leagueId);
    if (!league) {
      throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
    }
    const pool = await deps.draftPoolRepo.findByLeagueId(leagueId);
    if (!pool) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A draft pool has not been generated for this league",
      });
    }
    const [players, poolItems] = await Promise.all([
      deps.leagueRepo.findPlayersByLeagueId(leagueId),
      deps.draftPoolRepo.findItemsByPoolId(pool.id),
    ]);
    return { league, pool, players, poolItems };
  }

  return {
    async startDraft(
      { userId, leagueId }: { userId: string; leagueId: string },
    ) {
      log.debug({ userId, leagueId }, "starting draft");
      const league = await deps.leagueRepo.findById(leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }

      const caller = await deps.leagueRepo.findPlayer(leagueId, userId);
      if (caller?.role !== "commissioner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can start the draft",
        });
      }

      const pool = await deps.draftPoolRepo.findByLeagueId(leagueId);
      if (!pool) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A draft pool has not been generated for this league",
        });
      }
      const [players, poolItems] = await Promise.all([
        deps.leagueRepo.findPlayersByLeagueId(leagueId),
        deps.draftPoolRepo.findItemsByPoolId(pool.id),
      ]);

      if (league.status !== "drafting") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "League must be in 'drafting' status to start the draft — advance the league status first",
        });
      }

      const existing = await deps.draftRepo.findByLeagueId(leagueId);
      if (existing && existing.status !== "pending") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Draft has already been started for this league",
        });
      }

      let draftRow = existing;
      if (!draftRow) {
        const pickOrder = fisherYatesShuffle(players.map((p) => p.id));
        draftRow = await deps.draftRepo.create({
          leagueId,
          poolId: pool.id,
          format: "snake",
          pickOrder,
        });
      }

      const now = clock.now();
      const updatedStatus = await deps.draftRepo.updateStatus(
        draftRow.id,
        "in_progress",
        { startedAt: now },
      );

      const pickTimeLimitSeconds = getPickTimeLimitSeconds(league);
      const deadline = computeTurnDeadline(now, pickTimeLimitSeconds);
      await deps.draftRepo.updateTurnDeadline(updatedStatus.id, deadline);
      const updated = { ...updatedStatus, currentTurnDeadline: deadline };

      const picks = await deps.draftRepo.listPicks(updated.id);
      const state = toStateShape({
        draft: updated,
        picks,
        players,
        poolItems,
      });

      publisher.publish(leagueId, {
        type: "draft:started",
        data: state as DraftState,
      });
      publishTurnChange(
        leagueId,
        state.draft.pickOrder,
        state.draft.currentPick,
        deadline,
      );

      scheduler?.schedule(updated.id, leagueId, deadline);
      maybeScheduleNpcPick({
        draftId: updated.id,
        leagueId,
        pickOrder: state.draft.pickOrder,
        currentPick: state.draft.currentPick,
        players,
      });

      return state;
    },

    async getState(
      { userId, leagueId }: { userId: string; leagueId: string },
    ) {
      log.debug({ userId, leagueId }, "getting draft state");
      const caller = await deps.leagueRepo.findPlayer(leagueId, userId);
      if (!caller) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a league member to view the draft",
        });
      }

      const { players, poolItems } = await loadDraftContext(leagueId);

      const draftRow = await deps.draftRepo.findByLeagueId(leagueId);
      if (!draftRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No draft has been created for this league yet",
        });
      }

      const picks = await deps.draftRepo.listPicks(draftRow.id);
      return toStateShape({ draft: draftRow, picks, players, poolItems });
    },

    async makePick(
      { userId, leagueId, poolItemId }: {
        userId: string;
        leagueId: string;
        poolItemId: string;
      },
    ) {
      log.debug({ userId, leagueId, poolItemId }, "making draft pick");
      const { league, players, poolItems } = await loadDraftContext(leagueId);

      const draftRow = await deps.draftRepo.findByLeagueId(leagueId);
      if (!draftRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No draft has been created for this league yet",
        });
      }

      if (draftRow.status !== "in_progress") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Draft is not in progress",
        });
      }

      const caller = await deps.leagueRepo.findPlayer(leagueId, userId);
      if (!caller) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a league member to make a pick",
        });
      }
      const callerLeaguePlayer = players.find((p) => p.userId === userId);
      if (!callerLeaguePlayer) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a league member to make a pick",
        });
      }

      const pickOrder = draftRow.pickOrder as string[];
      const turn = resolveSnakeTurn(pickOrder, draftRow.currentPick);
      if (turn.leaguePlayerId !== callerLeaguePlayer.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "It is not your turn to pick",
        });
      }

      const poolItem = poolItems.find((item) => item.id === poolItemId);
      if (!poolItem) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pool item does not belong to this draft's pool",
        });
      }

      const existingPick = await deps.draftRepo.findPickByPoolItem(
        draftRow.id,
        poolItemId,
      );
      if (existingPick) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That pool item has already been picked",
        });
      }

      let createdPickRow: Awaited<
        ReturnType<DraftRepository["createPick"]>
      >;
      try {
        createdPickRow = await deps.draftRepo.createPick({
          draftId: draftRow.id,
          leaguePlayerId: callerLeaguePlayer.id,
          poolItemId,
          pickNumber: draftRow.currentPick,
        });
      } catch (err) {
        if (err instanceof DraftPickConflictError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That pool item has already been picked",
          });
        }
        throw err;
      }

      const nextPick = await deps.draftRepo.incrementCurrentPick(draftRow.id);

      const numberOfRounds = getNumberOfRounds(league);
      const totalPicks = numberOfRounds * pickOrder.length;
      let finalDraft = { ...draftRow, currentPick: nextPick };
      const isFinalPick = nextPick >= totalPicks;
      const now = clock.now();
      let nextDeadline: Date | null = null;
      if (isFinalPick) {
        finalDraft = await deps.draftRepo.updateStatus(
          draftRow.id,
          "complete",
          { completedAt: now },
        );
        await deps.draftRepo.updateTurnDeadline(draftRow.id, null);
        finalDraft = { ...finalDraft, currentTurnDeadline: null };
      } else {
        const pickTimeLimitSeconds = getPickTimeLimitSeconds(league);
        nextDeadline = computeTurnDeadline(now, pickTimeLimitSeconds);
        await deps.draftRepo.updateTurnDeadline(draftRow.id, nextDeadline);
        finalDraft = { ...finalDraft, currentTurnDeadline: nextDeadline };
      }

      const picks = await deps.draftRepo.listPicks(draftRow.id);
      const state = toStateShape({
        draft: finalDraft,
        picks,
        players,
        poolItems,
      });

      const pickRound = resolveSnakeTurn(pickOrder, createdPickRow.pickNumber)
        .round;
      publisher.publish(leagueId, {
        type: "draft:pick_made",
        data: {
          id: createdPickRow.id,
          draftId: createdPickRow.draftId,
          leaguePlayerId: createdPickRow.leaguePlayerId,
          poolItemId: createdPickRow.poolItemId,
          pickNumber: createdPickRow.pickNumber,
          pickedAt: createdPickRow.pickedAt instanceof Date
            ? createdPickRow.pickedAt.toISOString()
            : String(createdPickRow.pickedAt),
          autoPicked: createdPickRow.autoPicked ?? false,
          playerName: callerLeaguePlayer.name,
          itemName: poolItem.name,
          round: pickRound,
        },
      });

      if (isFinalPick) {
        publisher.publish(leagueId, {
          type: "draft:completed",
          data: {
            completedAt: finalDraft.completedAt instanceof Date
              ? finalDraft.completedAt.toISOString()
              : (finalDraft.completedAt ?? new Date().toISOString()),
          },
        });
        scheduler?.cancel(draftRow.id);
        npcScheduler?.cancel(draftRow.id);
      } else {
        publishTurnChange(leagueId, pickOrder, nextPick, nextDeadline);
        scheduler?.schedule(draftRow.id, leagueId, nextDeadline);
        maybeScheduleNpcPick({
          draftId: draftRow.id,
          leagueId,
          pickOrder,
          currentPick: nextPick,
          players,
        });
      }

      return state;
    },

    /**
     * System-privileged auto-pick triggered by the timer scheduler when a
     * turn deadline expires. No userId auth — this is a server-side call.
     *
     * Selection rule: highest base-stat total, tiebreak lowest Pokédex id.
     * Re-validates deadline + status so this is a no-op if a real pick
     * already landed (the scheduler races the legitimate picker).
     */
    async runAutoPick(
      { leagueId }: { leagueId: string },
    ) {
      log.debug({ leagueId }, "running auto-pick");
      const { league, players, poolItems } = await loadDraftContext(leagueId);

      const draftRow = await deps.draftRepo.findByLeagueId(leagueId);
      if (!draftRow) return;
      if (draftRow.status !== "in_progress") return;
      // Deadline race: another pick may have landed (and reset the deadline)
      // between the timer firing and this handler running.
      const deadline = draftRow.currentTurnDeadline
        ? (draftRow.currentTurnDeadline instanceof Date
          ? draftRow.currentTurnDeadline
          : new Date(draftRow.currentTurnDeadline))
        : null;
      if (!deadline) return;
      if (deadline.getTime() > clock.now().getTime()) return;

      const pickOrder = draftRow.pickOrder as string[];
      const turn = resolveSnakeTurn(pickOrder, draftRow.currentPick);
      const currentPlayer = players.find((p) => p.id === turn.leaguePlayerId);
      if (!currentPlayer) return;

      const picks = await deps.draftRepo.listPicks(draftRow.id);
      const pickedItemIds = new Set(picks.map((p) => p.poolItemId));
      const available = poolItems.filter((item) => !pickedItemIds.has(item.id));
      const chosen = selectAutoPickItem(available);
      if (!chosen) return;

      let createdPickRow: Awaited<
        ReturnType<DraftRepository["createPick"]>
      >;
      try {
        createdPickRow = await deps.draftRepo.createPick({
          draftId: draftRow.id,
          leaguePlayerId: currentPlayer.id,
          poolItemId: chosen.id,
          pickNumber: draftRow.currentPick,
          autoPicked: true,
        });
      } catch (err) {
        if (err instanceof DraftPickConflictError) {
          // A legitimate pick landed first — stand down.
          return;
        }
        throw err;
      }

      const nextPick = await deps.draftRepo.incrementCurrentPick(draftRow.id);
      const numberOfRounds = getNumberOfRounds(league);
      const totalPicks = numberOfRounds * pickOrder.length;
      const isFinalPick = nextPick >= totalPicks;

      const now = clock.now();
      let nextDeadline: Date | null = null;
      if (isFinalPick) {
        await deps.draftRepo.updateStatus(draftRow.id, "complete", {
          completedAt: now,
        });
        await deps.draftRepo.updateTurnDeadline(draftRow.id, null);
      } else {
        const pickTimeLimitSeconds = getPickTimeLimitSeconds(league);
        nextDeadline = computeTurnDeadline(now, pickTimeLimitSeconds);
        await deps.draftRepo.updateTurnDeadline(draftRow.id, nextDeadline);
      }

      const pickRound =
        resolveSnakeTurn(pickOrder, createdPickRow.pickNumber).round;
      publisher.publish(leagueId, {
        type: "draft:pick_made",
        data: {
          id: createdPickRow.id,
          draftId: createdPickRow.draftId,
          leaguePlayerId: createdPickRow.leaguePlayerId,
          poolItemId: createdPickRow.poolItemId,
          pickNumber: createdPickRow.pickNumber,
          pickedAt: createdPickRow.pickedAt instanceof Date
            ? createdPickRow.pickedAt.toISOString()
            : String(createdPickRow.pickedAt),
          autoPicked: true,
          playerName: currentPlayer.name,
          itemName: chosen.name,
          round: pickRound,
        },
      });

      if (isFinalPick) {
        publisher.publish(leagueId, {
          type: "draft:completed",
          data: { completedAt: now.toISOString() },
        });
        scheduler?.cancel(draftRow.id);
        npcScheduler?.cancel(draftRow.id);
      } else {
        publishTurnChange(leagueId, pickOrder, nextPick, nextDeadline);
        scheduler?.schedule(draftRow.id, leagueId, nextDeadline);
        maybeScheduleNpcPick({
          draftId: draftRow.id,
          leagueId,
          pickOrder,
          currentPick: nextPick,
          players,
        });
      }
    },

    /**
     * Dev-only: auto-pick driven by the NPC scheduler when an NPC player is
     * on the clock. Unlike `runAutoPick`, this does NOT check the turn
     * deadline — it fires after a short "thinking" delay regardless of the
     * configured pick time limit. Picks a random pool item so a single
     * developer can exercise full draft flows without recruiting humans.
     */
    async runNpcPick(
      { leagueId }: { leagueId: string },
    ) {
      log.debug({ leagueId }, "running NPC auto-pick");
      if (!npcScheduler) return;
      const { league, players, poolItems } = await loadDraftContext(leagueId);

      const draftRow = await deps.draftRepo.findByLeagueId(leagueId);
      if (!draftRow) return;
      if (draftRow.status !== "in_progress") return;

      const pickOrder = draftRow.pickOrder as string[];
      const turn = resolveSnakeTurn(pickOrder, draftRow.currentPick);
      const currentPlayer = players.find((p) => p.id === turn.leaguePlayerId);
      if (!currentPlayer) return;
      const isNpc = (currentPlayer as { isNpc?: boolean }).isNpc ?? false;
      if (!isNpc) return;

      const picks = await deps.draftRepo.listPicks(draftRow.id);
      const pickedItemIds = new Set(picks.map((p) => p.poolItemId));
      const available = poolItems.filter((item) => !pickedItemIds.has(item.id));
      const chosen = selectRandomPoolItem(available, randomFn);
      if (!chosen) return;

      let createdPickRow: Awaited<
        ReturnType<DraftRepository["createPick"]>
      >;
      try {
        createdPickRow = await deps.draftRepo.createPick({
          draftId: draftRow.id,
          leaguePlayerId: currentPlayer.id,
          poolItemId: chosen.id,
          pickNumber: draftRow.currentPick,
          autoPicked: true,
        });
      } catch (err) {
        if (err instanceof DraftPickConflictError) return;
        throw err;
      }

      const nextPick = await deps.draftRepo.incrementCurrentPick(draftRow.id);
      const numberOfRounds = getNumberOfRounds(league);
      const totalPicks = numberOfRounds * pickOrder.length;
      const isFinalPick = nextPick >= totalPicks;

      const now = clock.now();
      let nextDeadline: Date | null = null;
      if (isFinalPick) {
        await deps.draftRepo.updateStatus(draftRow.id, "complete", {
          completedAt: now,
        });
        await deps.draftRepo.updateTurnDeadline(draftRow.id, null);
      } else {
        const pickTimeLimitSeconds = getPickTimeLimitSeconds(league);
        nextDeadline = computeTurnDeadline(now, pickTimeLimitSeconds);
        await deps.draftRepo.updateTurnDeadline(draftRow.id, nextDeadline);
      }

      const pickRound =
        resolveSnakeTurn(pickOrder, createdPickRow.pickNumber).round;
      publisher.publish(leagueId, {
        type: "draft:pick_made",
        data: {
          id: createdPickRow.id,
          draftId: createdPickRow.draftId,
          leaguePlayerId: createdPickRow.leaguePlayerId,
          poolItemId: createdPickRow.poolItemId,
          pickNumber: createdPickRow.pickNumber,
          pickedAt: createdPickRow.pickedAt instanceof Date
            ? createdPickRow.pickedAt.toISOString()
            : String(createdPickRow.pickedAt),
          autoPicked: true,
          playerName: currentPlayer.name,
          itemName: chosen.name,
          round: pickRound,
        },
      });

      if (isFinalPick) {
        publisher.publish(leagueId, {
          type: "draft:completed",
          data: { completedAt: now.toISOString() },
        });
        scheduler?.cancel(draftRow.id);
        npcScheduler.cancel(draftRow.id);
      } else {
        publishTurnChange(leagueId, pickOrder, nextPick, nextDeadline);
        scheduler?.schedule(draftRow.id, leagueId, nextDeadline);
        maybeScheduleNpcPick({
          draftId: draftRow.id,
          leagueId,
          pickOrder,
          currentPick: nextPick,
          players,
        });
      }
    },

    async pauseDraft(
      { userId, leagueId }: { userId: string; leagueId: string },
    ) {
      log.debug({ userId, leagueId }, "pausing draft");
      const league = await deps.leagueRepo.findById(leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      const caller = await deps.leagueRepo.findPlayer(leagueId, userId);
      if (caller?.role !== "commissioner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can pause the draft",
        });
      }
      const draftRow = await deps.draftRepo.findByLeagueId(leagueId);
      if (!draftRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No draft has been created for this league yet",
        });
      }
      if (draftRow.status !== "in_progress") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only pause an in-progress draft",
        });
      }

      const pausedAt = clock.now();
      const updated = await deps.draftRepo.pauseDraft(draftRow.id, pausedAt);
      scheduler?.cancel(draftRow.id);
      npcScheduler?.cancel(draftRow.id);

      const [players, pool] = await Promise.all([
        deps.leagueRepo.findPlayersByLeagueId(leagueId),
        deps.draftPoolRepo.findByLeagueId(leagueId),
      ]);
      const poolItems = pool
        ? await deps.draftPoolRepo.findItemsByPoolId(pool.id)
        : [];
      const picks = await deps.draftRepo.listPicks(updated.id);
      const state = toStateShape({ draft: updated, picks, players, poolItems });

      publisher.publish(leagueId, {
        type: "draft:paused",
        data: { pausedAt: pausedAt.toISOString() },
      });

      return state;
    },

    async resumeDraft(
      { userId, leagueId }: { userId: string; leagueId: string },
    ) {
      log.debug({ userId, leagueId }, "resuming draft");
      const league = await deps.leagueRepo.findById(leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      const caller = await deps.leagueRepo.findPlayer(leagueId, userId);
      if (caller?.role !== "commissioner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can resume the draft",
        });
      }
      const draftRow = await deps.draftRepo.findByLeagueId(leagueId);
      if (!draftRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No draft has been created for this league yet",
        });
      }
      if (draftRow.status !== "paused") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only resume a paused draft",
        });
      }

      const now = clock.now();
      const pickTimeLimitSeconds = getPickTimeLimitSeconds(league);
      const deadline = computeTurnDeadline(now, pickTimeLimitSeconds);

      const updated = await deps.draftRepo.resumeDraft(draftRow.id, deadline);
      scheduler?.schedule(updated.id, leagueId, deadline);

      const [players, pool] = await Promise.all([
        deps.leagueRepo.findPlayersByLeagueId(leagueId),
        deps.draftPoolRepo.findByLeagueId(leagueId),
      ]);
      const poolItems = pool
        ? await deps.draftPoolRepo.findItemsByPoolId(pool.id)
        : [];
      const picks = await deps.draftRepo.listPicks(updated.id);
      const state = toStateShape({ draft: updated, picks, players, poolItems });

      publisher.publish(leagueId, {
        type: "draft:resumed",
        data: { turnDeadline: deadline ? deadline.toISOString() : null },
      });
      publishTurnChange(
        leagueId,
        updated.pickOrder as string[],
        updated.currentPick,
        deadline,
      );
      maybeScheduleNpcPick({
        draftId: updated.id,
        leagueId,
        pickOrder: updated.pickOrder as string[],
        currentPick: updated.currentPick,
        players,
      });

      return state;
    },

    /**
     * Commissioner-only undo of the most recent pick. Supported from
     * in_progress, paused, and complete — undoing the final pick flips the
     * draft back to in_progress with a fresh deadline so play can resume.
     *
     * Design decision: from paused we intentionally do NOT emit turn_change
     * (the draft is still paused — resume will emit a fresh deadline). From
     * complete we re-schedule the timer on the same deadline we just wrote.
     */
    async undoLastPick(
      { userId, leagueId }: { userId: string; leagueId: string },
    ) {
      log.debug({ userId, leagueId }, "undoing last pick");
      const league = await deps.leagueRepo.findById(leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      const caller = await deps.leagueRepo.findPlayer(leagueId, userId);
      if (caller?.role !== "commissioner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can undo a pick",
        });
      }
      const draftRow = await deps.draftRepo.findByLeagueId(leagueId);
      if (!draftRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No draft has been created for this league yet",
        });
      }
      if (
        draftRow.status !== "in_progress" &&
        draftRow.status !== "paused" &&
        draftRow.status !== "complete"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot undo a pick on a draft that has not started",
        });
      }
      const lastPick = await deps.draftRepo.findLastPick(draftRow.id);
      if (!lastPick) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nothing to undo",
        });
      }

      const { pick: removedPick, currentPick: newCurrentPick } = await deps
        .draftRepo.undoLastPick(draftRow.id);

      const pickOrder = draftRow.pickOrder as string[];
      const removedRound =
        resolveSnakeTurn(pickOrder, removedPick.pickNumber).round;

      // Re-load draft row so we have the updated currentPick from the repo's
      // transaction. Also handles the complete → in_progress branch below.
      let updatedDraft = {
        ...draftRow,
        currentPick: newCurrentPick,
      };
      let newDeadline: Date | null = null;

      if (draftRow.status === "complete") {
        newDeadline = computeTurnDeadline(
          clock.now(),
          getPickTimeLimitSeconds(league),
        );
        updatedDraft = await deps.draftRepo.reopenCompletedDraft(
          draftRow.id,
          newDeadline,
        );
        scheduler?.schedule(updatedDraft.id, leagueId, newDeadline);
      } else if (draftRow.status === "in_progress") {
        newDeadline = computeTurnDeadline(
          clock.now(),
          getPickTimeLimitSeconds(league),
        );
        await deps.draftRepo.updateTurnDeadline(draftRow.id, newDeadline);
        updatedDraft = { ...updatedDraft, currentTurnDeadline: newDeadline };
        scheduler?.schedule(updatedDraft.id, leagueId, newDeadline);
      } else {
        // paused — keep deadline null, keep timer cancelled
        scheduler?.cancel(draftRow.id);
      }

      const [players, pool] = await Promise.all([
        deps.leagueRepo.findPlayersByLeagueId(leagueId),
        deps.draftPoolRepo.findByLeagueId(leagueId),
      ]);
      const poolItems = pool
        ? await deps.draftPoolRepo.findItemsByPoolId(pool.id)
        : [];
      const picks = await deps.draftRepo.listPicks(updatedDraft.id);
      const state = toStateShape({
        draft: updatedDraft,
        picks,
        players,
        poolItems,
      });

      publisher.publish(leagueId, {
        type: "draft:pick_undone",
        data: {
          pickNumber: removedPick.pickNumber,
          leaguePlayerId: removedPick.leaguePlayerId,
          poolItemId: removedPick.poolItemId,
          round: removedRound,
        },
      });

      if (updatedDraft.status === "in_progress") {
        publishTurnChange(
          leagueId,
          pickOrder,
          updatedDraft.currentPick,
          newDeadline,
        );
        maybeScheduleNpcPick({
          draftId: updatedDraft.id,
          leagueId,
          pickOrder,
          currentPick: updatedDraft.currentPick,
          players,
        });
      } else {
        npcScheduler?.cancel(draftRow.id);
      }

      return state;
    },

    async validatePick(
      { userId, leagueId, poolItemId }: {
        userId: string;
        leagueId: string;
        poolItemId: string;
      },
    ): Promise<{ valid: boolean; reason?: string }> {
      log.debug({ userId, leagueId, poolItemId }, "validating draft pick");
      const league = await deps.leagueRepo.findById(leagueId);
      if (!league) return { valid: false, reason: "League not found" };

      const pool = await deps.draftPoolRepo.findByLeagueId(leagueId);
      if (!pool) return { valid: false, reason: "Draft pool not generated" };

      const draftRow = await deps.draftRepo.findByLeagueId(leagueId);
      if (!draftRow) return { valid: false, reason: "Draft not created" };
      if (draftRow.status !== "in_progress") {
        return { valid: false, reason: "Draft is not in progress" };
      }

      const players = await deps.leagueRepo.findPlayersByLeagueId(leagueId);
      const callerLeaguePlayer = players.find((p) => p.userId === userId);
      if (!callerLeaguePlayer) {
        return { valid: false, reason: "You are not a league member" };
      }

      const pickOrder = draftRow.pickOrder as string[];
      const turn = resolveSnakeTurn(pickOrder, draftRow.currentPick);
      if (turn.leaguePlayerId !== callerLeaguePlayer.id) {
        return { valid: false, reason: "It is not your turn" };
      }

      const poolItems = await deps.draftPoolRepo.findItemsByPoolId(pool.id);
      const poolItem = poolItems.find((item) => item.id === poolItemId);
      if (!poolItem) {
        return {
          valid: false,
          reason: "Pool item does not belong to this draft's pool",
        };
      }

      const existingPick = await deps.draftRepo.findPickByPoolItem(
        draftRow.id,
        poolItemId,
      );
      if (existingPick) {
        return { valid: false, reason: "Pool item already picked" };
      }

      return { valid: true };
    },
  };
}

export type DraftService = ReturnType<typeof createDraftService>;
