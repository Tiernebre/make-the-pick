import type { z } from "zod";
import { array, number, record, string } from "zod";

// Map of game version id -> list of Pokemon dex ids that are obtainable in
// that version through means PokeAPI's wild encounter endpoint does not
// expose: in-game gifts, static encounters, fossil revivals, in-game trades,
// and one-off events. Hand-curated; see docs/domain/draft-pool.md for scope.
export const pokemonGiftsDataSchema: z.ZodRecord<
  z.ZodString,
  z.ZodArray<z.ZodNumber>
> = record(string(), array(number()));

export type PokemonGiftsData = z.infer<typeof pokemonGiftsDataSchema>;
