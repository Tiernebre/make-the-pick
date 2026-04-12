import type { z } from "zod";
import {
  array,
  boolean,
  literal,
  nullable,
  number,
  object,
  string,
  union,
} from "zod";
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
  autoPicked: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}> = object({
  id: string().uuid(),
  draftId: string().uuid(),
  leaguePlayerId: string().uuid(),
  poolItemId: string().uuid(),
  pickNumber: number().int().min(0),
  pickedAt: string(),
  autoPicked: boolean().optional().default(false),
});

export type DraftPick = z.infer<typeof draftPickSchema>;

// Draft state snapshot (sent on connect + used by tRPC query)
// Note: `status` is left loose (z.string()) to avoid coupling the wire format
// to the DB enum — valid values today are "pending" | "in_progress" | "paused"
// | "complete".
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
    currentTurnDeadline: z.ZodNullable<z.ZodString>;
    fastMode: z.ZodBoolean;
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
    currentTurnDeadline: nullable(string()),
    fastMode: boolean(),
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

export const pauseDraftInputSchema: z.ZodObject<{
  leagueId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
});

export type PauseDraftInput = z.infer<typeof pauseDraftInputSchema>;

export const resumeDraftInputSchema: z.ZodObject<{
  leagueId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
});

export type ResumeDraftInput = z.infer<typeof resumeDraftInputSchema>;

export const undoLastPickInputSchema: z.ZodObject<{
  leagueId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
});

export type UndoLastPickInput = z.infer<typeof undoLastPickInputSchema>;

export const setFastModeInputSchema: z.ZodObject<{
  leagueId: z.ZodString;
  fastMode: z.ZodBoolean;
}> = object({
  leagueId: string().uuid(),
  fastMode: boolean(),
});

export type SetFastModeInput = z.infer<typeof setFastModeInputSchema>;

export const commissionerPickInputSchema: z.ZodObject<{
  leagueId: z.ZodString;
  poolItemId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
  poolItemId: string().uuid(),
});

export type CommissionerPickInput = z.infer<
  typeof commissionerPickInputSchema
>;

export const forceAutoPickInputSchema: z.ZodObject<{
  leagueId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
});

export type ForceAutoPickInput = z.infer<typeof forceAutoPickInputSchema>;

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
    autoPicked: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
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
    turnDeadline: z.ZodNullable<z.ZodString>;
  }>;
}> = object({
  type: literal("draft:turn_change"),
  data: object({
    currentLeaguePlayerId: string().uuid(),
    pickNumber: number().int(),
    round: number().int(),
    turnDeadline: nullable(string()),
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

export const draftPausedEventSchema: z.ZodObject<{
  type: z.ZodLiteral<"draft:paused">;
  data: z.ZodObject<{
    pausedAt: z.ZodString;
  }>;
}> = object({
  type: literal("draft:paused"),
  data: object({
    pausedAt: string(),
  }),
});

export type DraftPausedEvent = z.infer<typeof draftPausedEventSchema>;

export const draftResumedEventSchema: z.ZodObject<{
  type: z.ZodLiteral<"draft:resumed">;
  data: z.ZodObject<{
    turnDeadline: z.ZodNullable<z.ZodString>;
  }>;
}> = object({
  type: literal("draft:resumed"),
  data: object({
    turnDeadline: nullable(string()),
  }),
});

export type DraftResumedEvent = z.infer<typeof draftResumedEventSchema>;

export const draftPickUndoneEventSchema: z.ZodObject<{
  type: z.ZodLiteral<"draft:pick_undone">;
  data: z.ZodObject<{
    pickNumber: z.ZodNumber;
    leaguePlayerId: z.ZodString;
    poolItemId: z.ZodString;
    round: z.ZodNumber;
  }>;
}> = object({
  type: literal("draft:pick_undone"),
  data: object({
    pickNumber: number().int().min(0),
    leaguePlayerId: string().uuid(),
    poolItemId: string().uuid(),
    round: number().int().min(0),
  }),
});

export type DraftPickUndoneEvent = z.infer<typeof draftPickUndoneEventSchema>;

export const draftFastModeChangedEventSchema: z.ZodObject<{
  type: z.ZodLiteral<"draft:fast_mode_changed">;
  data: z.ZodObject<{
    fastMode: z.ZodBoolean;
  }>;
}> = object({
  type: literal("draft:fast_mode_changed"),
  data: object({
    fastMode: boolean(),
  }),
});

export type DraftFastModeChangedEvent = z.infer<
  typeof draftFastModeChangedEventSchema
>;

export const draftPoolItemRevealedEventSchema: z.ZodObject<{
  type: z.ZodLiteral<"draftPool:item_revealed">;
  data: z.ZodObject<{
    itemId: z.ZodString;
    revealOrder: z.ZodNumber;
    remaining: z.ZodNumber;
  }>;
}> = object({
  type: literal("draftPool:item_revealed"),
  data: object({
    itemId: string().uuid(),
    revealOrder: number().int().min(0),
    remaining: number().int().min(0),
  }),
});

export type DraftPoolItemRevealedEvent = z.infer<
  typeof draftPoolItemRevealedEventSchema
>;

export const draftPoolRevealCompletedEventSchema: z.ZodObject<{
  type: z.ZodLiteral<"draftPool:reveal_completed">;
}> = object({
  type: literal("draftPool:reveal_completed"),
});

export type DraftPoolRevealCompletedEvent = z.infer<
  typeof draftPoolRevealCompletedEventSchema
>;

export const draftEventSchema: z.ZodUnion<[
  typeof draftStartedEventSchema,
  typeof draftPickMadeEventSchema,
  typeof draftTurnChangeEventSchema,
  typeof draftCompletedEventSchema,
  typeof draftStateEventSchema,
  typeof draftPausedEventSchema,
  typeof draftResumedEventSchema,
  typeof draftPickUndoneEventSchema,
  typeof draftFastModeChangedEventSchema,
  typeof draftPoolItemRevealedEventSchema,
  typeof draftPoolRevealCompletedEventSchema,
]> = union([
  draftStartedEventSchema,
  draftPickMadeEventSchema,
  draftTurnChangeEventSchema,
  draftCompletedEventSchema,
  draftStateEventSchema,
  draftPausedEventSchema,
  draftResumedEventSchema,
  draftPickUndoneEventSchema,
  draftFastModeChangedEventSchema,
  draftPoolItemRevealedEventSchema,
  draftPoolRevealCompletedEventSchema,
]);

export type DraftEvent = z.infer<typeof draftEventSchema>;
