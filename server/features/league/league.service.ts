import { LEAGUE_STATUS_TRANSITIONS } from "@make-the-pick/shared";
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

    async updateSettings(
      userId: string,
      input: {
        leagueId: string;
        sportType: string;
        maxPlayers: number;
        rulesConfig: {
          draftFormat: string;
          numberOfRounds: number;
          pickTimeLimitSeconds: number | null;
        };
      },
    ) {
      log.debug(
        { userId, leagueId: input.leagueId },
        "attempting league settings update",
      );
      const league = await deps.leagueRepo.findById(input.leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      if (league.status !== "setup") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "League settings can only be changed during setup",
        });
      }
      const player = await deps.leagueRepo.findPlayer(
        input.leagueId,
        userId,
      );
      if (player?.role !== "commissioner") {
        log.debug(
          { userId, leagueId: input.leagueId },
          "updateSettings forbidden — user is not commissioner",
        );
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can update settings",
        });
      }
      const updated = await deps.leagueRepo.updateSettings(input.leagueId, {
        sportType: input.sportType,
        maxPlayers: input.maxPlayers,
        rulesConfig: input.rulesConfig,
      });
      log.debug({ leagueId: input.leagueId }, "league settings updated");
      return updated;
    },

    async advanceStatus(userId: string, input: { leagueId: string }) {
      log.debug(
        { userId, leagueId: input.leagueId },
        "attempting league status advance",
      );
      const league = await deps.leagueRepo.findById(input.leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      const player = await deps.leagueRepo.findPlayer(
        input.leagueId,
        userId,
      );
      if (player?.role !== "commissioner") {
        log.debug(
          { userId, leagueId: input.leagueId },
          "advanceStatus forbidden — user is not commissioner",
        );
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can advance the league status",
        });
      }
      const nextStatus = LEAGUE_STATUS_TRANSITIONS[
        league.status as keyof typeof LEAGUE_STATUS_TRANSITIONS
      ];
      if (!nextStatus) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "League is already complete",
        });
      }
      if (league.status === "setup") {
        if (!league.sportType || !league.rulesConfig) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "League settings must be configured before advancing from setup",
          });
        }
      }
      const updated = await deps.leagueRepo.updateStatus(
        input.leagueId,
        nextStatus,
      );
      log.debug(
        { leagueId: input.leagueId, newStatus: nextStatus },
        "league status advanced",
      );
      return updated;
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

      if (league.maxPlayers !== null) {
        const playerCount = await deps.leagueRepo.countPlayers(league.id);
        if (playerCount >= league.maxPlayers) {
          log.debug(
            { userId, leagueId: league.id, maxPlayers: league.maxPlayers },
            "league is full",
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "League is full",
          });
        }
      }

      await deps.leagueRepo.addPlayer(league.id, userId);
      log.debug({ userId, leagueId: league.id }, "user joined league");
      return league;
    },

    async removePlayer(
      userId: string,
      input: { leagueId: string; playerUserId: string },
    ) {
      log.debug(
        { userId, leagueId: input.leagueId, playerUserId: input.playerUserId },
        "attempting to remove player from league",
      );
      const league = await deps.leagueRepo.findById(input.leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }

      const caller = await deps.leagueRepo.findPlayer(
        input.leagueId,
        userId,
      );
      if (caller?.role !== "commissioner") {
        log.debug(
          { userId, leagueId: input.leagueId },
          "removePlayer forbidden — user is not commissioner",
        );
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can remove players",
        });
      }

      const target = await deps.leagueRepo.findPlayer(
        input.leagueId,
        input.playerUserId,
      );
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found in league",
        });
      }

      if (target.role === "commissioner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the commissioner from the league",
        });
      }

      await deps.leagueRepo.deletePlayer(input.leagueId, input.playerUserId);
      log.debug(
        { leagueId: input.leagueId, playerUserId: input.playerUserId },
        "player removed from league",
      );
    },
  };
}

export type LeagueService = ReturnType<typeof createLeagueService>;
