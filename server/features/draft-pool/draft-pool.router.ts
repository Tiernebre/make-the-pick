import { generateDraftPoolSchema } from "@make-the-pick/shared";
import { object, string } from "zod";
import { protectedProcedure, router } from "../../trpc/trpc.ts";
import type { DraftPoolService } from "./draft-pool.service.ts";

export function createDraftPoolRouter(draftPoolService: DraftPoolService) {
  return router({
    generate: protectedProcedure
      .input(generateDraftPoolSchema)
      .mutation(({ ctx, input }) => {
        return draftPoolService.generate(ctx.user.id, input);
      }),

    getByLeagueId: protectedProcedure
      .input(object({ leagueId: string().uuid() }))
      .query(({ ctx, input }) => {
        return draftPoolService.getByLeagueId(ctx.user.id, input.leagueId);
      }),
  });
}
