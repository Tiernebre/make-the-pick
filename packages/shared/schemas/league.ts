import type { z } from "zod";
import { boolean, enum as enum_, number, object, string, unknown } from "zod";

export const leagueStatusSchema: z.ZodEnum<
  ["setup", "drafting", "competing", "complete"]
> = enum_(["setup", "drafting", "competing", "complete"]);

export type LeagueStatus = z.infer<typeof leagueStatusSchema>;

export const LEAGUE_STATUS_TRANSITIONS: Record<
  LeagueStatus,
  LeagueStatus | null
> = {
  setup: "drafting",
  drafting: "competing",
  competing: "complete",
  complete: null,
};

export const leaguePlayerRoleSchema: z.ZodEnum<["commissioner", "member"]> =
  enum_([
    "commissioner",
    "member",
  ]);

export type LeaguePlayerRole = z.infer<typeof leaguePlayerRoleSchema>;

export const sportTypeSchema: z.ZodEnum<["pokemon"]> = enum_(["pokemon"]);

export type SportType = z.infer<typeof sportTypeSchema>;

export const draftFormatSchema: z.ZodEnum<["snake", "linear"]> = enum_([
  "snake",
  "linear",
]);

export type DraftFormat = z.infer<typeof draftFormatSchema>;

export const rulesConfigSchema: z.ZodObject<{
  draftFormat: typeof draftFormatSchema;
  numberOfRounds: z.ZodNumber;
  pickTimeLimitSeconds: z.ZodNullable<z.ZodNumber>;
  poolSizeMultiplier: z.ZodDefault<z.ZodNumber>;
  gameVersion: z.ZodOptional<z.ZodString>;
  excludeLegendaries: z.ZodOptional<z.ZodBoolean>;
  excludeStarters: z.ZodOptional<z.ZodBoolean>;
  excludeTradeEvolutions: z.ZodOptional<z.ZodBoolean>;
}> = object({
  draftFormat: draftFormatSchema,
  numberOfRounds: number().int().min(1),
  pickTimeLimitSeconds: number().int().min(1).nullable(),
  poolSizeMultiplier: number().min(1.5).max(3).default(2),
  gameVersion: string().optional(),
  excludeLegendaries: boolean().optional(),
  excludeStarters: boolean().optional(),
  excludeTradeEvolutions: boolean().optional(),
});

export type RulesConfig = z.infer<typeof rulesConfigSchema>;

export const updateLeagueSettingsSchema: z.ZodObject<{
  leagueId: z.ZodString;
  sportType: typeof sportTypeSchema;
  maxPlayers: z.ZodNumber;
  rulesConfig: typeof rulesConfigSchema;
}> = object({
  leagueId: string().uuid(),
  sportType: sportTypeSchema,
  maxPlayers: number().int().min(2),
  rulesConfig: rulesConfigSchema,
});

export type UpdateLeagueSettingsInput = z.infer<
  typeof updateLeagueSettingsSchema
>;

export const createLeagueSchema: z.ZodObject<{
  name: z.ZodString;
  sportType: typeof sportTypeSchema;
  maxPlayers: z.ZodNumber;
  rulesConfig: typeof rulesConfigSchema;
}> = object({
  name: string().min(1).max(100),
  sportType: sportTypeSchema,
  maxPlayers: number().int().min(2),
  rulesConfig: rulesConfigSchema,
});

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

export const leagueSchema: z.ZodObject<{
  id: z.ZodString;
  name: z.ZodString;
  status: typeof leagueStatusSchema;
  rulesConfig: z.ZodNullable<z.ZodUnknown>;
  sportType: z.ZodNullable<z.ZodString>;
  maxPlayers: z.ZodNullable<z.ZodNumber>;
  inviteCode: z.ZodString;
  createdBy: z.ZodString;
  createdAt: z.ZodString;
  updatedAt: z.ZodString;
}> = object({
  id: string(),
  name: string(),
  status: leagueStatusSchema,
  rulesConfig: unknown().nullable(),
  sportType: string().nullable(),
  maxPlayers: number().nullable(),
  inviteCode: string(),
  createdBy: string(),
  createdAt: string(),
  updatedAt: string(),
});

export type League = z.infer<typeof leagueSchema>;

export const advanceLeagueStatusSchema: z.ZodObject<{
  leagueId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
});

export type AdvanceLeagueStatusInput = z.infer<
  typeof advanceLeagueStatusSchema
>;

export const leaguePlayerSchema: z.ZodObject<{
  id: z.ZodString;
  userId: z.ZodString;
  name: z.ZodString;
  image: z.ZodNullable<z.ZodString>;
  isNpc: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
  npcStrategy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  role: typeof leaguePlayerRoleSchema;
  joinedAt: z.ZodString;
}> = object({
  id: string(),
  userId: string(),
  name: string(),
  image: string().nullable(),
  isNpc: boolean().optional().default(false),
  npcStrategy: string().nullable().optional(),
  role: leaguePlayerRoleSchema,
  joinedAt: string(),
});

export type LeaguePlayer = z.infer<typeof leaguePlayerSchema>;
