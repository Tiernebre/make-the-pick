import type { z } from "zod";
import { array, number, object, string } from "zod";

export const watchlistItemSchema: z.ZodObject<{
  id: z.ZodString;
  leaguePlayerId: z.ZodString;
  draftPoolItemId: z.ZodString;
  position: z.ZodNumber;
  createdAt: z.ZodString;
}> = object({
  id: string().uuid(),
  leaguePlayerId: string().uuid(),
  draftPoolItemId: string().uuid(),
  position: number().int(),
  createdAt: string(),
});

export type WatchlistItem = z.infer<typeof watchlistItemSchema>;

export const getWatchlistSchema: z.ZodObject<{
  leagueId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
});

export type GetWatchlistInput = z.infer<typeof getWatchlistSchema>;

export const addToWatchlistSchema: z.ZodObject<{
  leagueId: z.ZodString;
  draftPoolItemId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
  draftPoolItemId: string().uuid(),
});

export type AddToWatchlistInput = z.infer<typeof addToWatchlistSchema>;

export const removeFromWatchlistSchema: z.ZodObject<{
  leagueId: z.ZodString;
  draftPoolItemId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
  draftPoolItemId: string().uuid(),
});

export type RemoveFromWatchlistInput = z.infer<
  typeof removeFromWatchlistSchema
>;

export const reorderWatchlistSchema: z.ZodObject<{
  leagueId: z.ZodString;
  itemIds: z.ZodArray<z.ZodString>;
}> = object({
  leagueId: string().uuid(),
  itemIds: array(string().uuid()),
});

export type ReorderWatchlistInput = z.infer<typeof reorderWatchlistSchema>;
