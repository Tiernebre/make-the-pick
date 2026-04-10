import type { z } from "zod";
import { array, literal, nullable, number, object, string, union } from "zod";
import { draftPoolItemSchema } from "./draft-pool.ts";
import { leaguePlayerSchema } from "./league.ts";

// Draft pick entity
export const draftPickSchema: z.ZodObject<{
  id: z.ZodString;
  draftId: z.ZodString;
  leaguePlayerId: z.ZodString;
  poolItemId: z.ZodString;
  pickNumber: z.ZodNumber;
  pickedAt: z.ZodString;
}> = object({
  id: string().uuid(),
  draftId: string().uuid(),
  leaguePlayerId: string().uuid(),
  poolItemId: string().uuid(),
  pickNumber: number().int().min(0),
  pickedAt: string(),
});

export type DraftPick = z.infer<typeof draftPickSchema>;

// Draft state snapshot (sent on connect + used by tRPC query)
export const draftStateSchema: z.ZodObject<{
  draft: z.ZodObject<{
    id: z.ZodString;
    leagueId: z.ZodString;
    format: z.ZodString;
    status: z.ZodString;
    pickOrder: z.ZodArray<z.ZodString>;
    currentPick: z.ZodNumber;
    startedAt: z.ZodNullable<z.ZodString>;
    completedAt: z.ZodNullable<z.ZodString>;
  }>;
  picks: z.ZodArray<typeof draftPickSchema>;
  players: z.ZodArray<typeof leaguePlayerSchema>;
  poolItems: z.ZodArray<typeof draftPoolItemSchema>;
  availableItemIds: z.ZodArray<z.ZodString>;
}> = object({
  draft: object({
    id: string().uuid(),
    leagueId: string().uuid(),
    format: string(),
    status: string(),
    pickOrder: array(string()),
    currentPick: number().int(),
    startedAt: nullable(string()),
    completedAt: nullable(string()),
  }),
  picks: array(draftPickSchema),
  players: array(leaguePlayerSchema),
  poolItems: array(draftPoolItemSchema),
  availableItemIds: array(string().uuid()),
});

export type DraftState = z.infer<typeof draftStateSchema>;

// Input schemas
export const makePickInputSchema: z.ZodObject<{
  leagueId: z.ZodString;
  poolItemId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
  poolItemId: string().uuid(),
});

export type MakePickInput = z.infer<typeof makePickInputSchema>;

export const startDraftInputSchema: z.ZodObject<{
  leagueId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
});

export type StartDraftInput = z.infer<typeof startDraftInputSchema>;

export const getDraftStateInputSchema: z.ZodObject<{
  leagueId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
});

export type GetDraftStateInput = z.infer<typeof getDraftStateInputSchema>;

// SSE event schemas
export const draftStartedEventSchema: z.ZodObject<{
  type: z.ZodLiteral<"draft:started">;
  data: typeof draftStateSchema;
}> = object({
  type: literal("draft:started"),
  data: draftStateSchema,
});

export const draftPickMadeEventSchema: z.ZodObject<{
  type: z.ZodLiteral<"draft:pick_made">;
  data: z.ZodObject<{
    id: z.ZodString;
    draftId: z.ZodString;
    leaguePlayerId: z.ZodString;
    poolItemId: z.ZodString;
    pickNumber: z.ZodNumber;
    pickedAt: z.ZodString;
    playerName: z.ZodString;
    itemName: z.ZodString;
    round: z.ZodNumber;
  }>;
}> = object({
  type: literal("draft:pick_made"),
  data: draftPickSchema.extend({
    playerName: string(),
    itemName: string(),
    round: number().int(),
  }),
});

export const draftTurnChangeEventSchema: z.ZodObject<{
  type: z.ZodLiteral<"draft:turn_change">;
  data: z.ZodObject<{
    currentLeaguePlayerId: z.ZodString;
    pickNumber: z.ZodNumber;
    round: z.ZodNumber;
  }>;
}> = object({
  type: literal("draft:turn_change"),
  data: object({
    currentLeaguePlayerId: string().uuid(),
    pickNumber: number().int(),
    round: number().int(),
  }),
});

export const draftCompletedEventSchema: z.ZodObject<{
  type: z.ZodLiteral<"draft:completed">;
  data: z.ZodObject<{
    completedAt: z.ZodString;
  }>;
}> = object({
  type: literal("draft:completed"),
  data: object({
    completedAt: string(),
  }),
});

export const draftStateEventSchema: z.ZodObject<{
  type: z.ZodLiteral<"draft:state">;
  data: typeof draftStateSchema;
}> = object({
  type: literal("draft:state"),
  data: draftStateSchema,
});

export const draftEventSchema: z.ZodUnion<[
  typeof draftStartedEventSchema,
  typeof draftPickMadeEventSchema,
  typeof draftTurnChangeEventSchema,
  typeof draftCompletedEventSchema,
  typeof draftStateEventSchema,
]> = union([
  draftStartedEventSchema,
  draftPickMadeEventSchema,
  draftTurnChangeEventSchema,
  draftCompletedEventSchema,
  draftStateEventSchema,
]);

export type DraftEvent = z.infer<typeof draftEventSchema>;
