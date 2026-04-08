import { createLeagueSchema } from "@make-the-pick/shared";
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

    join: protectedProcedure
      .input(object({ inviteCode: string().min(1) }))
      .mutation(({ ctx, input }) => {
        return leagueService.join(ctx.user.id, input.inviteCode);
      }),
  });
}
