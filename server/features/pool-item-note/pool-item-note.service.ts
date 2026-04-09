import { TRPCError } from "@trpc/server";
import { logger } from "../../logger.ts";
import type { LeagueRepository } from "../league/league.repository.ts";
import type { PoolItemNoteRepository } from "./pool-item-note.repository.ts";

const log = logger.child({ module: "pool-item-note.service" });

export function createPoolItemNoteService(deps: {
  poolItemNoteRepo: PoolItemNoteRepository;
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
      log.debug({ userId, leagueId }, "listing pool item notes");
      const player = await resolveLeaguePlayer(userId, leagueId);
      return deps.poolItemNoteRepo.findByLeaguePlayerId(player.id);
    },

    async upsert(
      userId: string,
      input: { leagueId: string; draftPoolItemId: string; content: string },
    ) {
      log.debug({ userId, ...input }, "upserting pool item note");
      const player = await resolveLeaguePlayer(userId, input.leagueId);
      return deps.poolItemNoteRepo.upsert({
        leaguePlayerId: player.id,
        draftPoolItemId: input.draftPoolItemId,
        content: input.content,
      });
    },

    async delete(
      userId: string,
      input: { leagueId: string; draftPoolItemId: string },
    ) {
      log.debug({ userId, ...input }, "deleting pool item note");
      const player = await resolveLeaguePlayer(userId, input.leagueId);
      await deps.poolItemNoteRepo.deleteByLeaguePlayerIdAndDraftPoolItemId(
        player.id,
        input.draftPoolItemId,
      );
    },
  };
}

export type PoolItemNoteService = ReturnType<
  typeof createPoolItemNoteService
>;
