import {
  getDraftStateInputSchema,
  makePickInputSchema,
  startDraftInputSchema,
} from "@make-the-pick/shared";
import { protectedProcedure, router } from "../../trpc/trpc.ts";
import type { DraftService } from "./draft.service.ts";

export function createDraftRouter(draftService: DraftService) {
  return router({
    startDraft: protectedProcedure
      .input(startDraftInputSchema)
      .mutation(({ ctx, input }) => {
        return draftService.startDraft({
          userId: ctx.user.id,
          leagueId: input.leagueId,
        });
      }),

    makePick: protectedProcedure
      .input(makePickInputSchema)
      .mutation(({ ctx, input }) => {
        return draftService.makePick({
          userId: ctx.user.id,
          leagueId: input.leagueId,
          poolItemId: input.poolItemId,
        });
      }),

    validatePick: protectedProcedure
      .input(makePickInputSchema)
      .query(({ ctx, input }) => {
        return draftService.validatePick({
          userId: ctx.user.id,
          leagueId: input.leagueId,
          poolItemId: input.poolItemId,
        });
      }),

    getState: protectedProcedure
      .input(getDraftStateInputSchema)
      .query(({ ctx, input }) => {
        return draftService.getState({
          userId: ctx.user.id,
          leagueId: input.leagueId,
        });
      }),
  });
}
