import type { z } from "zod";
import {
  array,
  enum as enum_,
  literal,
  nullable,
  number,
  object,
  string,
  union,
} from "zod";
import {
  poolItemEffortSchema,
  poolItemEncounterSchema,
} from "./pokemon-encounters.ts";
import { pokemonEvolutionSchema } from "./pokemon-evolutions.ts";

export const poolItemAvailabilitySchema: z.ZodEnum<["early", "mid", "late"]> =
  enum_(["early", "mid", "late"]);

export type PoolItemAvailability = z.infer<typeof poolItemAvailabilitySchema>;

const baseStatsSchema: z.ZodObject<{
  hp: z.ZodNumber;
  attack: z.ZodNumber;
  defense: z.ZodNumber;
  specialAttack: z.ZodNumber;
  specialDefense: z.ZodNumber;
  speed: z.ZodNumber;
}> = object({
  hp: number(),
  attack: number(),
  defense: number(),
  specialAttack: number(),
  specialDefense: number(),
  speed: number(),
});

// Individual-mode metadata: the unit of drafting is a single Pokemon.
// `mode` is defaulted so legacy rows written before species-mode existed
// still validate — they get `mode: "individual"` added at parse time.
export const individualPoolItemMetadataSchema: z.ZodObject<{
  mode: z.ZodDefault<z.ZodLiteral<"individual">>;
  pokemonId: z.ZodNumber;
  types: z.ZodArray<z.ZodString>;
  baseStats: typeof baseStatsSchema;
  generation: z.ZodString;
}> = object({
  mode: literal("individual").default("individual"),
  pokemonId: number(),
  types: array(string()),
  baseStats: baseStatsSchema,
  generation: string(),
});

export type IndividualPoolItemMetadata = z.infer<
  typeof individualPoolItemMetadataSchema
>;

const speciesFinalPoolItemSchema: z.ZodObject<{
  pokemonId: z.ZodNumber;
  name: z.ZodString;
  regionalForm: z.ZodNullable<z.ZodString>;
  types: z.ZodArray<z.ZodString>;
  baseStats: typeof baseStatsSchema;
  generation: z.ZodString;
  spriteUrl: z.ZodNullable<z.ZodString>;
}> = object({
  pokemonId: number(),
  name: string(),
  regionalForm: nullable(string()),
  types: array(string()),
  baseStats: baseStatsSchema,
  generation: string(),
  spriteUrl: nullable(string()),
});

const speciesMemberPoolItemSchema: z.ZodObject<{
  pokemonId: z.ZodNumber;
  name: z.ZodString;
  regionalForm: z.ZodNullable<z.ZodString>;
  stage: z.ZodEnum<["base", "middle", "final"]>;
}> = object({
  pokemonId: number(),
  name: string(),
  regionalForm: nullable(string()),
  stage: enum_(["base", "middle", "final"]),
});

// Species-mode metadata: the unit of drafting is an entire evolution line
// rooted at a terminal final form. See docs/domain/species-draft.md.
export const speciesPoolItemMetadataSchema: z.ZodObject<{
  mode: z.ZodLiteral<"species">;
  finals: z.ZodArray<typeof speciesFinalPoolItemSchema>;
  members: z.ZodArray<typeof speciesMemberPoolItemSchema>;
}> = object({
  mode: literal("species"),
  finals: array(speciesFinalPoolItemSchema),
  members: array(speciesMemberPoolItemSchema),
});

export type SpeciesPoolItemMetadata = z.infer<
  typeof speciesPoolItemMetadataSchema
>;

// Union covering both drafting modes. A discriminated union would be
// stricter but would require every stored row to carry an explicit `mode`
// field, which legacy individual-mode rows don't — the `.default` on the
// individual variant lets the plain `union` fall through cleanly.
export const draftPoolItemMetadataSchema: z.ZodUnion<[
  typeof individualPoolItemMetadataSchema,
  typeof speciesPoolItemMetadataSchema,
]> = union([
  individualPoolItemMetadataSchema,
  speciesPoolItemMetadataSchema,
]);

export type DraftPoolItemMetadata = z.infer<typeof draftPoolItemMetadataSchema>;

export const draftPoolItemSchema: z.ZodObject<{
  id: z.ZodString;
  draftPoolId: z.ZodString;
  name: z.ZodString;
  thumbnailUrl: z.ZodNullable<z.ZodString>;
  metadata: z.ZodNullable<typeof draftPoolItemMetadataSchema>;
  availability: z.ZodNullable<typeof poolItemAvailabilitySchema>;
  encounter: z.ZodNullable<typeof poolItemEncounterSchema>;
  effort: z.ZodNullable<typeof poolItemEffortSchema>;
  evolution: z.ZodNullable<typeof pokemonEvolutionSchema>;
}> = object({
  id: string().uuid(),
  draftPoolId: string().uuid(),
  name: string(),
  thumbnailUrl: nullable(string()),
  metadata: draftPoolItemMetadataSchema.nullable(),
  availability: poolItemAvailabilitySchema.nullable(),
  encounter: poolItemEncounterSchema.nullable(),
  effort: poolItemEffortSchema.nullable(),
  evolution: pokemonEvolutionSchema.nullable(),
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
