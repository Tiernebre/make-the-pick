import { TRPCError } from "@trpc/server";
import { logger } from "../../logger.ts";
import type { DraftPoolRepository } from "../draft-pool/draft-pool.repository.ts";
import type { LeagueRepository } from "../league/league.repository.ts";
import {
  DraftPickConflictError,
  type DraftRepository,
} from "./draft.repository.ts";
import { resolveSnakeTurn } from "./draft-utils.ts";

const log = logger.child({ module: "draft.service" });

interface RulesConfigShape {
  numberOfRounds: number;
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
    })),
    players: args.players.map((player) => ({
      id: player.id,
      userId: player.userId,
      name: player.name,
      image: player.image,
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
}) {
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

      const updated = await deps.draftRepo.updateStatus(
        draftRow.id,
        "in_progress",
        { startedAt: new Date() },
      );

      const picks = await deps.draftRepo.listPicks(updated.id);
      return toStateShape({ draft: updated, picks, players, poolItems });
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

      try {
        await deps.draftRepo.createPick({
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
      if (nextPick >= totalPicks) {
        finalDraft = await deps.draftRepo.updateStatus(
          draftRow.id,
          "complete",
          { completedAt: new Date() },
        );
      }

      const picks = await deps.draftRepo.listPicks(draftRow.id);
      return toStateShape({
        draft: finalDraft,
        picks,
        players,
        poolItems,
      });
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
