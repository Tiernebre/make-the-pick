import {
  getDraftStateInputSchema,
  makePickInputSchema,
  pauseDraftInputSchema,
  resumeDraftInputSchema,
  startDraftInputSchema,
  undoLastPickInputSchema,
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

    pause: protectedProcedure
      .input(pauseDraftInputSchema)
      .mutation(({ ctx, input }) => {
        return draftService.pauseDraft({
          userId: ctx.user.id,
          leagueId: input.leagueId,
        });
      }),

    resume: protectedProcedure
      .input(resumeDraftInputSchema)
      .mutation(({ ctx, input }) => {
        return draftService.resumeDraft({
          userId: ctx.user.id,
          leagueId: input.leagueId,
        });
      }),

    undoLastPick: protectedProcedure
      .input(undoLastPickInputSchema)
      .mutation(({ ctx, input }) => {
        return draftService.undoLastPick({
          userId: ctx.user.id,
          leagueId: input.leagueId,
        });
      }),
  });
}
