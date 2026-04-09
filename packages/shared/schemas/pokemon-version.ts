import type { z } from "zod";
import { number, object, string } from "zod";

export const pokemonVersionSchema: z.ZodObject<{
  id: z.ZodString;
  name: z.ZodString;
  versionGroup: z.ZodString;
  region: z.ZodString;
  generation: z.ZodNumber;
}> = object({
  id: string(),
  name: string(),
  versionGroup: string(),
  region: string(),
  generation: number().int().min(1),
});

export type PokemonVersion = z.infer<typeof pokemonVersionSchema>;
