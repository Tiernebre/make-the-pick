import type { z } from "zod";
import { enum as enum_, object, string, unknown } from "zod";

export const leagueStatusSchema: z.ZodEnum<["setup"]> = enum_(["setup"]);

export type LeagueStatus = z.infer<typeof leagueStatusSchema>;

export const leaguePlayerRoleSchema: z.ZodEnum<["creator", "member"]> = enum_([
  "creator",
  "member",
]);

export type LeaguePlayerRole = z.infer<typeof leaguePlayerRoleSchema>;

export const createLeagueSchema: z.ZodObject<{
  name: z.ZodString;
}> = object({
  name: string().min(1).max(100),
});

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

export const leagueSchema = object({
  id: string(),
  name: string(),
  status: leagueStatusSchema,
  rulesConfig: unknown().nullable(),
  inviteCode: string(),
  createdBy: string(),
  createdAt: string(),
  updatedAt: string(),
});

export type League = z.infer<typeof leagueSchema>;
