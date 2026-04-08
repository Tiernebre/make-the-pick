import { TRPCError } from "@trpc/server";
import type { LeagueRepository } from "./league.repository.ts";

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
      return deps.leagueRepo.createWithCreator(userId, {
        ...input,
        inviteCode,
      });
    },

    async getById(id: string) {
      const league = await deps.leagueRepo.findById(id);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      return league;
    },

    listByUser(userId: string) {
      return deps.leagueRepo.findAllByUserId(userId);
    },

    async join(userId: string, inviteCode: string) {
      const league = await deps.leagueRepo.findByInviteCode(inviteCode);
      if (!league) {
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
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already a member of this league",
        });
      }

      await deps.leagueRepo.addPlayer(league.id, userId);
      return league;
    },
  };
}

export type LeagueService = ReturnType<typeof createLeagueService>;
