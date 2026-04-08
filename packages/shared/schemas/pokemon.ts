import type { z } from "zod";
import { array, nullable, number, object, string } from "zod";

export const pokemonSchema: z.ZodObject<{
  id: z.ZodNumber;
  name: z.ZodString;
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
  spriteUrl: z.ZodNullable<z.ZodString>;
}> = object({
  id: number(),
  name: string(),
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
  spriteUrl: nullable(string()),
});

export type Pokemon = z.infer<typeof pokemonSchema>;
