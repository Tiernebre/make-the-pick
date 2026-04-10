import type { z } from "zod";
import { array, enum as enum_, nullable, number, object, string } from "zod";

export const poolItemAvailabilitySchema: z.ZodEnum<["early", "mid", "late"]> =
  enum_(["early", "mid", "late"]);

export type PoolItemAvailability = z.infer<typeof poolItemAvailabilitySchema>;

export const draftPoolItemMetadataSchema: z.ZodObject<{
  pokemonId: z.ZodNumber;
  types: z.ZodArray<z.ZodString>;
  baseStats: z.ZodObject<{
    hp: z.ZodNumber;
    attack: z.ZodNumber;
    defense: z.ZodNumber;
    specialAttack: z.ZodNumber;
    specialDefense: z.ZodNumber;
    speed: z.ZodNumber;
  }>;
  generation: z.ZodString;
}> = object({
  pokemonId: number(),
  types: array(string()),
  baseStats: object({
    hp: number(),
    attack: number(),
    defense: number(),
    specialAttack: number(),
    specialDefense: number(),
    speed: number(),
  }),
  generation: string(),
});

export type DraftPoolItemMetadata = z.infer<typeof draftPoolItemMetadataSchema>;

export const draftPoolItemSchema: z.ZodObject<{
  id: z.ZodString;
  draftPoolId: z.ZodString;
  name: z.ZodString;
  thumbnailUrl: z.ZodNullable<z.ZodString>;
  metadata: z.ZodNullable<typeof draftPoolItemMetadataSchema>;
  availability: z.ZodNullable<typeof poolItemAvailabilitySchema>;
}> = object({
  id: string().uuid(),
  draftPoolId: string().uuid(),
  name: string(),
  thumbnailUrl: nullable(string()),
  metadata: draftPoolItemMetadataSchema.nullable(),
  availability: poolItemAvailabilitySchema.nullable(),
});

export type DraftPoolItem = z.infer<typeof draftPoolItemSchema>;

export const draftPoolSchema: z.ZodObject<{
  id: z.ZodString;
  leagueId: z.ZodString;
  name: z.ZodString;
  createdAt: z.ZodString;
}> = object({
  id: string().uuid(),
  leagueId: string().uuid(),
  name: string(),
  createdAt: string(),
});

export type DraftPool = z.infer<typeof draftPoolSchema>;

export const generateDraftPoolSchema: z.ZodObject<{
  leagueId: z.ZodString;
}> = object({
  leagueId: string().uuid(),
});

export type GenerateDraftPoolInput = z.infer<typeof generateDraftPoolSchema>;
