import {
  type CreateLeagueInput,
  LEAGUE_STATUS_TRANSITIONS,
  rulesConfigSchema,
} from "@make-the-pick/shared";
import { TRPCError } from "@trpc/server";
import type { DraftEventPublisher } from "../draft/draft.events.ts";
import type { DraftRepository } from "../draft/draft.repository.ts";
import type { DraftPoolRepository } from "../draft-pool/draft-pool.repository.ts";
import type { DraftPoolService } from "../draft-pool/draft-pool.service.ts";
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
  deps: {
    leagueRepo: LeagueRepository;
    draftRepo: DraftRepository;
    draftPoolRepo: DraftPoolRepository;
    draftPoolService: DraftPoolService;
    eventPublisher?: DraftEventPublisher;
    startDraft?: (
      input: { userId: string; leagueId: string },
    ) => Promise<unknown>;
  },
) {
  return {
    create(userId: string, input: CreateLeagueInput) {
      const inviteCode = generateInviteCode();
      log.info({ userId, name: input.name, inviteCode }, "creating league");
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
      log.info({ leagueId }, "league deleted");
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
      log.info({ leagueId: input.leagueId }, "league settings updated");
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
        const rulesParsed = rulesConfigSchema.safeParse(league.rulesConfig);
        if (
          !league.sportType || !league.maxPlayers || league.maxPlayers < 2 ||
          !rulesParsed.success
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "League settings must be fully configured before advancing from setup",
          });
        }
        // Generate the pool on entry to pooling. Items are born hidden
        // (revealed_at = null) so the showcase UI starts from zero. A
        // commissioner that doesn't want the showcase can immediately
        // advance from pooling to scouting below, which reveals the rest.
        await deps.draftPoolService.generate(userId, {
          leagueId: input.leagueId,
        });
      }
      if (league.status === "pooling") {
        // "Advance to scouting" skips the showcase: reveal everything that
        // the commissioner hasn't revealed manually so scouting starts with
        // a fully-visible pool.
        const pool = await deps.draftPoolRepo.findByLeagueId(
          input.leagueId,
        );
        if (pool) {
          await deps.draftPoolRepo.revealAllItems(pool.id, new Date());
        }
        deps.eventPublisher?.publish(input.leagueId, {
          type: "draftPool:reveal_completed",
        });
      }
      if (league.status === "drafting") {
        const draft = await deps.draftRepo.findByLeagueId(input.leagueId);
        if (!draft || draft.status !== "complete") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "The draft must be completed before advancing from drafting",
          });
        }
      }
      const updated = await deps.leagueRepo.updateStatus(
        input.leagueId,
        nextStatus,
      );
      log.info(
        { leagueId: input.leagueId, newStatus: nextStatus },
        "league status advanced",
      );
      if (league.status === "scouting" && deps.startDraft) {
        await deps.startDraft({
          userId,
          leagueId: input.leagueId,
        });
      }
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
      log.info({ userId, leagueId: league.id }, "user joined league");
      return league;
    },

    async addNpcPlayer(
      userId: string,
      input: { leagueId: string; npcUserId?: string },
    ) {
      log.debug(
        { userId, leagueId: input.leagueId, npcUserId: input.npcUserId },
        "adding NPC to league",
      );
      const league = await deps.leagueRepo.findById(input.leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      const caller = await deps.leagueRepo.findPlayer(input.leagueId, userId);
      if (caller?.role !== "commissioner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can add NPC players",
        });
      }
      if (league.status !== "setup") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "NPCs can only be added while the league is in setup",
        });
      }
      if (league.maxPlayers !== null) {
        const playerCount = await deps.leagueRepo.countPlayers(input.leagueId);
        if (playerCount >= league.maxPlayers) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "League is full",
          });
        }
      }
      const available = await deps.leagueRepo.findAvailableNpcUsers(
        input.leagueId,
      );
      if (available.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No NPC trainers available — all have already joined",
        });
      }
      let npc;
      if (input.npcUserId) {
        npc = available.find((n) => n.id === input.npcUserId);
        if (!npc) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That NPC trainer isn't available for this league",
          });
        }
      } else {
        npc = available[Math.floor(Math.random() * available.length)];
      }
      await deps.leagueRepo.addPlayer(input.leagueId, npc.id);
      log.info(
        { leagueId: input.leagueId, npcId: npc.id, npcName: npc.name },
        "NPC added to league",
      );
      return { userId: npc.id, name: npc.name };
    },

    async listAvailableNpcs(
      userId: string,
      input: { leagueId: string },
    ) {
      log.debug(
        { userId, leagueId: input.leagueId },
        "listing available NPCs for league",
      );
      const league = await deps.leagueRepo.findById(input.leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }
      const caller = await deps.leagueRepo.findPlayer(input.leagueId, userId);
      if (caller?.role !== "commissioner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league commissioner can list available NPCs",
        });
      }
      const available = await deps.leagueRepo.findAvailableNpcUsers(
        input.leagueId,
      );
      return available.map((n) => ({
        id: n.id,
        name: n.name,
        npcStrategy: n.npcStrategy,
        image: n.image,
      }));
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

      if (league.status !== "setup") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Players can only be removed while the league is in setup",
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
      log.info(
        { leagueId: input.leagueId, playerUserId: input.playerUserId },
        "player removed from league",
      );
    },

    async leaveLeague(userId: string, input: { leagueId: string }) {
      log.debug(
        { userId, leagueId: input.leagueId },
        "attempting to leave league",
      );
      const league = await deps.leagueRepo.findById(input.leagueId);
      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }

      const player = await deps.leagueRepo.findPlayer(input.leagueId, userId);
      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a member of this league",
        });
      }

      if (player.role === "commissioner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "The commissioner cannot leave the league — delete it instead",
        });
      }

      const available = await deps.leagueRepo.findAvailableNpcUsers(
        input.leagueId,
      );
      if (available.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot leave — no NPC trainers available to take your spot",
        });
      }

      const npc = available[Math.floor(Math.random() * available.length)];
      await deps.leagueRepo.replacePlayerUser(
        input.leagueId,
        userId,
        npc.id,
      );
      log.info(
        { leagueId: input.leagueId, userId, npcId: npc.id },
        "player left league, replaced by NPC",
      );
    },
  };
}

export type LeagueService = ReturnType<typeof createLeagueService>;
