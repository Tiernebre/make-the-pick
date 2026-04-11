import type { z } from "zod";
import { array, enum as zEnum, nullable, number, object, string } from "zod";
import type { Pokemon } from "./pokemon.ts";
import { pokemonSchema } from "./pokemon.ts";
import type {
  PokemonEvolution,
  PokemonEvolutionsData,
} from "./pokemon-evolutions.ts";

// The stage of a species member within its evolution line.
// A single-stage species' only member is "final".
export const speciesMemberStageSchema: z.ZodEnum<["base", "middle", "final"]> =
  zEnum(["base", "middle", "final"]);

export type SpeciesMemberStage = z.infer<typeof speciesMemberStageSchema>;

// Known regional-form suffixes used by PokeAPI-derived names like
// "vulpix-alola" or "zigzagoon-galar". The order matters: longer suffixes
// should be checked first if they ever collide, but none of these do today.
const REGIONAL_SUFFIXES = ["alola", "galar", "hisui", "paldea"] as const;
type RegionalSuffix = typeof REGIONAL_SUFFIXES[number];

export const speciesFinalSchema: z.ZodObject<{
  pokemonId: z.ZodNumber;
  name: z.ZodString;
  regionalForm: z.ZodNullable<z.ZodString>;
  types: z.ZodArray<z.ZodString>;
  baseStats: typeof pokemonSchema.shape.baseStats;
  generation: z.ZodString;
  spriteUrl: z.ZodNullable<z.ZodString>;
}> = object({
  pokemonId: number(),
  name: string(),
  regionalForm: nullable(string()),
  types: array(string()),
  baseStats: pokemonSchema.shape.baseStats,
  generation: string(),
  spriteUrl: nullable(string()),
});

export type SpeciesFinal = z.infer<typeof speciesFinalSchema>;

export const speciesMemberSchema: z.ZodObject<{
  pokemonId: z.ZodNumber;
  name: z.ZodString;
  regionalForm: z.ZodNullable<z.ZodString>;
  stage: typeof speciesMemberStageSchema;
}> = object({
  pokemonId: number(),
  name: string(),
  regionalForm: nullable(string()),
  stage: speciesMemberStageSchema,
});

export type SpeciesMember = z.infer<typeof speciesMemberSchema>;

export const speciesSchema: z.ZodObject<{
  name: z.ZodString;
  finals: z.ZodArray<typeof speciesFinalSchema>;
  members: z.ZodArray<typeof speciesMemberSchema>;
}> = object({
  name: string(),
  finals: array(speciesFinalSchema),
  members: array(speciesMemberSchema),
});

export type Species = z.infer<typeof speciesSchema>;

// Splits a pokemon name like "vulpix-alola" into { base: "vulpix", form: "alola" }.
// Returns null for names with no known regional suffix.
function parseRegionalName(
  name: string,
): { base: string; form: RegionalSuffix } | null {
  for (const suffix of REGIONAL_SUFFIXES) {
    const marker = `-${suffix}`;
    if (name.endsWith(marker)) {
      return { base: name.slice(0, -marker.length), form: suffix };
    }
  }
  return null;
}

function stageFor(
  evolvesFromId: number | null,
  hasDescendant: boolean,
): SpeciesMemberStage {
  if (!hasDescendant) return "final";
  if (evolvesFromId === null) return "base";
  return "middle";
}

/**
 * Builds the list of draftable species from the flat Pokemon catalogue and
 * the evolution graph. See docs/domain/species-draft.md for the rules.
 *
 * A species is identified by its terminal final form's name. Regional
 * variants (which do not appear in the evolution graph) are folded in by
 * name suffix — "vulpix-alola" joins the "ninetales" species because vulpix
 * is an ancestor of ninetales in the graph.
 */
export function buildSpecies(
  pokemon: readonly Pokemon[],
  evolutions: PokemonEvolutionsData,
): Species[] {
  const pokemonById = new Map<number, Pokemon>();
  const pokemonByName = new Map<string, Pokemon>();
  for (const p of pokemon) {
    pokemonById.set(p.id, p);
    pokemonByName.set(p.name, p);
  }

  // Group evolution nodes by chain, and build a parent→children index so we
  // can identify terminals cheaply.
  const childrenByParentId = new Map<number, number[]>();
  for (const node of Object.values(evolutions)) {
    if (node.evolvesFromId !== null) {
      const siblings = childrenByParentId.get(node.evolvesFromId) ?? [];
      siblings.push(node.pokemonId);
      childrenByParentId.set(node.evolvesFromId, siblings);
    }
  }

  type SpeciesDraft = {
    name: string;
    finals: SpeciesFinal[];
    members: SpeciesMember[];
    memberIds: Set<number>;
    terminalPokemonId: number;
  };

  const drafts = new Map<string, SpeciesDraft>();

  for (const node of Object.values(evolutions)) {
    const isTerminal = !childrenByParentId.has(node.pokemonId);
    if (!isTerminal) continue;

    const terminalMon = pokemonById.get(node.pokemonId);
    if (!terminalMon) continue;

    // Walk backward from the terminal to the root, collecting members in
    // base→final order.
    const chainMembers: SpeciesMember[] = [];
    let cursorId: number | null = node.pokemonId;
    while (cursorId !== null) {
      const nextCursorId: number = cursorId;
      const cursorNode: PokemonEvolution | undefined =
        evolutions[String(nextCursorId)];
      const cursorMon = pokemonById.get(nextCursorId);
      if (!cursorNode || !cursorMon) break;
      const hasDescendant = childrenByParentId.has(nextCursorId);
      // A node we reached by walking backward from a terminal is only a
      // "final" at the terminal itself.
      const stage: SpeciesMemberStage = nextCursorId === node.pokemonId
        ? "final"
        : stageFor(cursorNode.evolvesFromId, hasDescendant);
      chainMembers.unshift({
        pokemonId: cursorMon.id,
        name: cursorMon.name,
        regionalForm: null,
        stage,
      });
      cursorId = cursorNode.evolvesFromId;
    }

    const existing = drafts.get(terminalMon.name);
    if (existing) {
      // Two terminals share a name only via regional variants, which aren't
      // in the evolution graph — so this branch is unreachable today. Keep
      // the earlier draft intact.
      continue;
    }

    const finals: SpeciesFinal[] = [{
      pokemonId: terminalMon.id,
      name: terminalMon.name,
      regionalForm: null,
      types: terminalMon.types,
      baseStats: terminalMon.baseStats,
      generation: terminalMon.generation,
      spriteUrl: terminalMon.spriteUrl,
    }];

    drafts.set(terminalMon.name, {
      name: terminalMon.name,
      finals,
      members: chainMembers,
      memberIds: new Set(chainMembers.map((m) => m.pokemonId)),
      terminalPokemonId: terminalMon.id,
    });
  }

  // Fold in regional variants. For each regional pokemon, find the base
  // pokemon by stripping the suffix and locate every species that already
  // contains the base as a member. The regional joins as a member, and if
  // it's a regional of the terminal itself, it also joins `finals[]`.
  for (const p of pokemon) {
    const parsed = parseRegionalName(p.name);
    if (!parsed) continue;
    const baseMon = pokemonByName.get(parsed.base);
    if (!baseMon) continue;

    for (const draft of drafts.values()) {
      if (!draft.memberIds.has(baseMon.id)) continue;

      if (!draft.memberIds.has(p.id)) {
        const baseMember = draft.members.find((m) =>
          m.pokemonId === baseMon.id
        );
        const stage: SpeciesMemberStage = baseMember?.stage ?? "base";
        draft.members.push({
          pokemonId: p.id,
          name: p.name,
          regionalForm: parsed.form,
          stage,
        });
        draft.memberIds.add(p.id);
      }

      if (baseMon.id === draft.terminalPokemonId) {
        const alreadyFinal = draft.finals.some((f) => f.pokemonId === p.id);
        if (!alreadyFinal) {
          draft.finals.push({
            pokemonId: p.id,
            name: p.name,
            regionalForm: parsed.form,
            types: p.types,
            baseStats: p.baseStats,
            generation: p.generation,
            spriteUrl: p.spriteUrl,
          });
        }
      }
    }
  }

  const result: Species[] = Array.from(drafts.values())
    .sort((a, b) => a.terminalPokemonId - b.terminalPokemonId)
    .map((draft) => ({
      name: draft.name,
      finals: draft.finals,
      members: draft.members,
    }));

  return result;
}
