import { TRPCError } from "@trpc/server";
import { logger } from "../../logger.ts";
import type { LeagueRepository } from "./league.repository.ts";

const log = logger.child({ module: "league.service" });

const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  const chars = new Array(INVITE_CODE_LENGTH);
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    chars[i] =
      INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return chars.join("");
}

export function createLeagueService(
  deps: { leagueRepo: LeagueRepository },
) {
  return {
    create(userId: string, input: { name: string }) {
      const inviteCode = generateInviteCode();
      log.debug({ userId, name: input.name, inviteCode }, "creating league");
      return deps.leagueRepo.createWithCommissioner(userId, {
        ...input,
        inviteCode,
      });
    },

    async getById(id: string) {
      log.debug({ leagueId: id }, "fetching league by id");
      const league = await deps.leagueRepo.findById(id);
      if (!league) {
        log.debug({ leagueId: id }, "league not found");
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      return league;
    },

    listByUser(userId: string) {
      log.debug({ userId }, "listing leagues for user");
      return deps.leagueRepo.findAllByUserId(userId);
    },

    async delete(userId: string, leagueId: string) {
      log.debug({ userId, leagueId }, "attempting league delete");
      const league = await deps.leagueRepo.findById(leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      const player = await deps.leagueRepo.findPlayer(leagueId, userId);
      if (player?.role !== "commissioner") {
        log.debug(
          { userId, leagueId },
          "delete forbidden — user is not commissioner",
        );
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can delete a league",
        });
      }
      await deps.leagueRepo.deleteById(leagueId);
      log.debug({ leagueId }, "league deleted");
    },

    async listPlayers(leagueId: string) {
      log.debug({ leagueId }, "listing players");
      const league = await deps.leagueRepo.findById(leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      return deps.leagueRepo.findPlayersByLeagueId(leagueId);
    },

    async join(userId: string, inviteCode: string) {
      log.debug({ userId, inviteCode }, "attempting to join league");
      const league = await deps.leagueRepo.findByInviteCode(inviteCode);
      if (!league) {
        log.debug({ inviteCode }, "invalid invite code");
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite code",
        });
      }

      const existingPlayer = await deps.leagueRepo.findPlayer(
        league.id,
        userId,
      );
      if (existingPlayer) {
        log.debug(
          { userId, leagueId: league.id },
          "user already a member",
        );
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already a member of this league",
        });
      }

      await deps.leagueRepo.addPlayer(league.id, userId);
      log.debug({ userId, leagueId: league.id }, "user joined league");
      return league;
    },
  };
}

export type LeagueService = ReturnType<typeof createLeagueService>;
