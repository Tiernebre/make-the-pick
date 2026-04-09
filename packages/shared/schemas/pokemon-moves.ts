import type { z } from "zod";
import { array, number, object, record, string } from "zod";

const pokemonMoveSchema: z.ZodObject<{
  name: z.ZodString;
  level: z.ZodNumber;
}> = object({
  name: string(),
  level: number(),
});

export const pokemonMovesEntrySchema: z.ZodObject<{
  pokemonId: z.ZodNumber;
  moves: z.ZodRecord<z.ZodString, z.ZodArray<typeof pokemonMoveSchema>>;
}> = object({
  pokemonId: number(),
  moves: record(string(), array(pokemonMoveSchema)),
});

export type PokemonMovesEntry = z.infer<typeof pokemonMovesEntrySchema>;
