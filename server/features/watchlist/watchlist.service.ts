import { TRPCError } from "@trpc/server";
import { logger } from "../../logger.ts";
import type { LeagueRepository } from "../league/league.repository.ts";
import type { WatchlistRepository } from "./watchlist.repository.ts";

const log = logger.child({ module: "watchlist.service" });

export function createWatchlistService(deps: {
  watchlistRepo: WatchlistRepository;
  leagueRepo: LeagueRepository;
}) {
  async function resolveLeaguePlayer(userId: string, leagueId: string) {
    const league = await deps.leagueRepo.findById(leagueId);
    if (!league) {
      throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
    }

    const player = await deps.leagueRepo.findPlayer(leagueId, userId);
    if (!player) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User is not a member of this league",
      });
    }

    return player;
  }

  return {
    async list(userId: string, leagueId: string) {
      log.debug({ userId, leagueId }, "listing watchlist");
      const player = await resolveLeaguePlayer(userId, leagueId);
      return deps.watchlistRepo.findByLeaguePlayerId(player.id);
    },

    async add(
      userId: string,
      input: { leagueId: string; draftPoolItemId: string },
    ) {
      log.debug({ userId, ...input }, "adding to watchlist");
      const player = await resolveLeaguePlayer(userId, input.leagueId);

      const existing = await deps.watchlistRepo
        .findByLeaguePlayerIdAndDraftPoolItemId(
          player.id,
          input.draftPoolItemId,
        );
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Item is already in watchlist",
        });
      }

      const maxPosition = await deps.watchlistRepo.getMaxPosition(player.id);
      const nextPosition = maxPosition != null ? maxPosition + 1 : 0;

      return deps.watchlistRepo.create({
        leaguePlayerId: player.id,
        draftPoolItemId: input.draftPoolItemId,
        position: nextPosition,
      });
    },

    async remove(
      userId: string,
      input: { leagueId: string; draftPoolItemId: string },
    ) {
      log.debug({ userId, ...input }, "removing from watchlist");
      const player = await resolveLeaguePlayer(userId, input.leagueId);
      await deps.watchlistRepo.deleteByLeaguePlayerIdAndDraftPoolItemId(
        player.id,
        input.draftPoolItemId,
      );
    },

    async reorder(
      userId: string,
      input: { leagueId: string; itemIds: string[] },
    ) {
      log.debug({ userId, leagueId: input.leagueId }, "reordering watchlist");
      const player = await resolveLeaguePlayer(userId, input.leagueId);
      await deps.watchlistRepo.replaceAllPositions(player.id, input.itemIds);
      return deps.watchlistRepo.findByLeaguePlayerId(player.id);
    },
  };
}

export type WatchlistService = ReturnType<typeof createWatchlistService>;
