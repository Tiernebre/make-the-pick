import {
  deletePoolItemNoteSchema,
  getPoolItemNotesSchema,
  upsertPoolItemNoteSchema,
} from "@make-the-pick/shared";
import { protectedProcedure, router } from "../../trpc/trpc.ts";
import type { PoolItemNoteService } from "./pool-item-note.service.ts";

export function createPoolItemNoteRouter(
  poolItemNoteService: PoolItemNoteService,
) {
  return router({
    list: protectedProcedure
      .input(getPoolItemNotesSchema)
      .query(({ ctx, input }) => {
        return poolItemNoteService.list(ctx.user.id, input.leagueId);
      }),

    upsert: protectedProcedure
      .input(upsertPoolItemNoteSchema)
      .mutation(({ ctx, input }) => {
        return poolItemNoteService.upsert(ctx.user.id, input);
      }),

    delete: protectedProcedure
      .input(deletePoolItemNoteSchema)
      .mutation(({ ctx, input }) => {
        return poolItemNoteService.delete(ctx.user.id, input);
      }),
  });
}
