import type { z } from "zod";
import { object, string } from "zod";

export const poolItemNoteSchema: z.ZodObject<{
  id: z.ZodString;
  leaguePlayerId: z.ZodString;
  draftPoolItemId: z.ZodString;
  content: z.ZodString;
  createdAt: z.ZodString;
  updatedAt: z.ZodString;
}> = object({
  id: string().uuid(),
  leaguePlayerId: string().uuid(),
  draftPoolItemId: string().uuid(),
  content: string().min(1).max(280),
  createdAt: string(),
  updatedAt: string(),
});

export type PoolItemNote = z.infer<typeof poolItemNoteSchema>;

export const getPoolItemNotesSchema: z.ZodObject<{
  leagueId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
});

export type GetPoolItemNotesInput = z.infer<typeof getPoolItemNotesSchema>;

export const upsertPoolItemNoteSchema: z.ZodObject<{
  leagueId: z.ZodString;
  draftPoolItemId: z.ZodString;
  content: z.ZodString;
}> = object({
  leagueId: string().uuid(),
  draftPoolItemId: string().uuid(),
  content: string().min(1).max(280),
});

export type UpsertPoolItemNoteInput = z.infer<
  typeof upsertPoolItemNoteSchema
>;

export const deletePoolItemNoteSchema: z.ZodObject<{
  leagueId: z.ZodString;
  draftPoolItemId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
  draftPoolItemId: string().uuid(),
});

export type DeletePoolItemNoteInput = z.infer<
  typeof deletePoolItemNoteSchema
>;
