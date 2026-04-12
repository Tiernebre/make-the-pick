import {
  commissionerPickInputSchema,
  forceAutoPickInputSchema,
  getDraftStateInputSchema,
  makePickInputSchema,
  pauseDraftInputSchema,
  resumeDraftInputSchema,
  setFastModeInputSchema,
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

    setFastMode: protectedProcedure
      .input(setFastModeInputSchema)
      .mutation(({ ctx, input }) => {
        return draftService.setFastMode({
          userId: ctx.user.id,
          leagueId: input.leagueId,
          fastMode: input.fastMode,
        });
      }),

    commissionerPick: protectedProcedure
      .input(commissionerPickInputSchema)
      .mutation(({ ctx, input }) => {
        return draftService.commissionerPick({
          userId: ctx.user.id,
          leagueId: input.leagueId,
          poolItemId: input.poolItemId,
        });
      }),

    forceAutoPick: protectedProcedure
      .input(forceAutoPickInputSchema)
      .mutation(({ ctx, input }) => {
        return draftService.forceAutoPick({
          userId: ctx.user.id,
          leagueId: input.leagueId,
        });
      }),
  });
}
