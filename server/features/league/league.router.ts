import {
  advanceLeagueStatusSchema,
  createLeagueSchema,
  updateLeagueSettingsSchema,
} from "@make-the-pick/shared";
import { object, string } from "zod";
import { protectedProcedure, router } from "../../trpc/trpc.ts";
import type { LeagueService } from "./league.service.ts";

export function createLeagueRouter(leagueService: LeagueService) {
  return router({
    create: protectedProcedure
      .input(createLeagueSchema)
      .mutation(({ ctx, input }) => {
        return leagueService.create(ctx.user.id, input);
      }),

    list: protectedProcedure
      .query(({ ctx }) => {
        return leagueService.listByUser(ctx.user.id);
      }),

    getById: protectedProcedure
      .input(object({ id: string().uuid() }))
      .query(({ input }) => {
        return leagueService.getById(input.id);
      }),

    listPlayers: protectedProcedure
      .input(object({ leagueId: string().uuid() }))
      .query(({ input }) => {
        return leagueService.listPlayers(input.leagueId);
      }),

    join: protectedProcedure
      .input(object({ inviteCode: string().min(1) }))
      .mutation(({ ctx, input }) => {
        return leagueService.join(ctx.user.id, input.inviteCode);
      }),

    updateSettings: protectedProcedure
      .input(updateLeagueSettingsSchema)
      .mutation(({ ctx, input }) => {
        return leagueService.updateSettings(ctx.user.id, input);
      }),

    advanceStatus: protectedProcedure
      .input(advanceLeagueStatusSchema)
      .mutation(({ ctx, input }) => {
        return leagueService.advanceStatus(ctx.user.id, input);
      }),

    removePlayer: protectedProcedure
      .input(object({ leagueId: string().uuid(), playerUserId: string() }))
      .mutation(({ ctx, input }) => {
        return leagueService.removePlayer(ctx.user.id, input);
      }),

    delete: protectedProcedure
      .input(object({ id: string().uuid() }))
      .mutation(({ ctx, input }) => {
        return leagueService.delete(ctx.user.id, input.id);
      }),
  });
}
