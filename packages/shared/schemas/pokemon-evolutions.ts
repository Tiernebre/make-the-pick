import type { z } from "zod";
import { array, boolean, nullable, number, object, record, string } from "zod";

export const evolutionTriggerSchema: z.ZodObject<{
  trigger: z.ZodString;
  minLevel: z.ZodNullable<z.ZodNumber>;
  item: z.ZodNullable<z.ZodString>;
  heldItem: z.ZodNullable<z.ZodString>;
  knownMove: z.ZodNullable<z.ZodString>;
  minHappiness: z.ZodNullable<z.ZodNumber>;
  timeOfDay: z.ZodNullable<z.ZodString>;
  needsOverworldRain: z.ZodBoolean;
  location: z.ZodNullable<z.ZodString>;
  tradeSpecies: z.ZodNullable<z.ZodString>;
}> = object({
  trigger: string(),
  minLevel: nullable(number()),
  item: nullable(string()),
  heldItem: nullable(string()),
  knownMove: nullable(string()),
  minHappiness: nullable(number()),
  timeOfDay: nullable(string()),
  needsOverworldRain: boolean(),
  location: nullable(string()),
  tradeSpecies: nullable(string()),
});

export type EvolutionTrigger = z.infer<typeof evolutionTriggerSchema>;

export const pokemonEvolutionSchema: z.ZodObject<{
  pokemonId: z.ZodNumber;
  chainId: z.ZodNumber;
  evolvesFromId: z.ZodNullable<z.ZodNumber>;
  triggers: z.ZodArray<typeof evolutionTriggerSchema>;
}> = object({
  pokemonId: number(),
  chainId: number(),
  evolvesFromId: nullable(number()),
  triggers: array(evolutionTriggerSchema),
});

export type PokemonEvolution = z.infer<typeof pokemonEvolutionSchema>;

export const pokemonEvolutionsDataSchema: z.ZodRecord<
  z.ZodString,
  typeof pokemonEvolutionSchema
> = record(string(), pokemonEvolutionSchema);

export type PokemonEvolutionsData = z.infer<typeof pokemonEvolutionsDataSchema>;
