import type { z } from "zod";
import { array, number, object, record, string } from "zod";

export const pokemonEncounterSummarySchema: z.ZodObject<{
  location: z.ZodString;
  method: z.ZodString;
  minLevel: z.ZodNumber;
  maxLevel: z.ZodNumber;
  chance: z.ZodNumber;
}> = object({
  location: string(),
  method: string(),
  minLevel: number(),
  maxLevel: number(),
  chance: number(),
});

export type PokemonEncounterSummary = z.infer<
  typeof pokemonEncounterSummarySchema
>;

export const pokemonEncounterPrimarySchema: z.ZodObject<{
  location: z.ZodString;
  method: z.ZodString;
}> = object({
  location: string(),
  method: string(),
});

export type PokemonEncounterPrimary = z.infer<
  typeof pokemonEncounterPrimarySchema
>;

export const pokemonEncountersEntrySchema: z.ZodObject<{
  primary: z.ZodNullable<typeof pokemonEncounterPrimarySchema>;
  encounters: z.ZodArray<typeof pokemonEncounterSummarySchema>;
}> = object({
  primary: pokemonEncounterPrimarySchema.nullable(),
  encounters: array(pokemonEncounterSummarySchema),
});

export type PokemonEncountersEntry = z.infer<
  typeof pokemonEncountersEntrySchema
>;

export const pokemonEncountersDataSchema: z.ZodRecord<
  z.ZodString,
  z.ZodRecord<z.ZodString, typeof pokemonEncountersEntrySchema>
> = record(string(), record(string(), pokemonEncountersEntrySchema));

export type PokemonEncountersData = z.infer<
  typeof pokemonEncountersDataSchema
>;

export const poolItemEncounterSchema: z.ZodObject<{
  primary: z.ZodNullable<typeof pokemonEncounterPrimarySchema>;
  all: z.ZodArray<typeof pokemonEncounterSummarySchema>;
}> = object({
  primary: pokemonEncounterPrimarySchema.nullable(),
  all: array(pokemonEncounterSummarySchema),
});

export type PoolItemEncounter = z.infer<typeof poolItemEncounterSchema>;

export const poolItemEffortSchema: z.ZodObject<{
  score: z.ZodNumber;
  reasons: z.ZodArray<z.ZodString>;
}> = object({
  score: number().int().min(1).max(5),
  reasons: array(string()),
});

export type PoolItemEffort = z.infer<typeof poolItemEffortSchema>;
