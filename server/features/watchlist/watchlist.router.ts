import {
  addToWatchlistSchema,
  getWatchlistSchema,
  removeFromWatchlistSchema,
  reorderWatchlistSchema,
} from "@make-the-pick/shared";
import { protectedProcedure, router } from "../../trpc/trpc.ts";
import type { WatchlistService } from "./watchlist.service.ts";

export function createWatchlistRouter(watchlistService: WatchlistService) {
  return router({
    list: protectedProcedure
      .input(getWatchlistSchema)
      .query(({ ctx, input }) => {
        return watchlistService.list(ctx.user.id, input.leagueId);
      }),

    add: protectedProcedure
      .input(addToWatchlistSchema)
      .mutation(({ ctx, input }) => {
        return watchlistService.add(ctx.user.id, input);
      }),

    remove: protectedProcedure
      .input(removeFromWatchlistSchema)
      .mutation(({ ctx, input }) => {
        return watchlistService.remove(ctx.user.id, input);
      }),

    reorder: protectedProcedure
      .input(reorderWatchlistSchema)
      .mutation(({ ctx, input }) => {
        return watchlistService.reorder(ctx.user.id, input);
      }),
  });
}
