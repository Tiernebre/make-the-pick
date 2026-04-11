import { pokemonSchema } from "../packages/shared/schemas/pokemon.ts";
import type { Pokemon } from "../packages/shared/schemas/pokemon.ts";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const BATCH_SIZE = 25;

interface RawListResult {
  name: string;
  url: string;
}

interface RawDetail {
  id: number;
  name: string;
  types: Array<{ type: { name: string } }>;
  stats: Array<{ stat: { name: string }; base_stat: number }>;
  sprites: { front_default: string | null };
  species: { url: string };
}

interface RawSpecies {
  generation: { name: string };
  capture_rate: number;
}

const STAT_NAME_MAP: Record<string, keyof Pokemon["baseStats"]> = {
  "hp": "hp",
  "attack": "attack",
  "defense": "defense",
  "special-attack": "specialAttack",
  "special-defense": "specialDefense",
  "speed": "speed",
};

function extractIdFromUrl(url: string): number {
  const parts = url.replace(/\/$/, "").split("/");
  return Number(parts[parts.length - 1]);
}

async function fetchWithRetry(url: string): Promise<Response> {
  const response = await fetch(url);
  if (response.ok) return response;

  // Retry once after 1 second
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const retry = await fetch(url);
  if (retry.ok) return retry;

  throw new Error(
    `Failed to fetch ${url}: ${retry.status} ${retry.statusText}`,
  );
}

async function fetchPokemonList(): Promise<RawListResult[]> {
  const response = await fetchWithRetry(`${POKEAPI_BASE}/pokemon?limit=2000`);
  const data = await response.json();
  return data.results;
}

async function fetchPokemonDetail(id: number): Promise<RawDetail> {
  const response = await fetchWithRetry(`${POKEAPI_BASE}/pokemon/${id}`);
  return response.json();
}

async function fetchPokemonSpecies(
  id: number,
  cache: Map<number, RawSpecies>,
): Promise<RawSpecies> {
  const cached = cache.get(id);
  if (cached) return cached;

  const response = await fetchWithRetry(
    `${POKEAPI_BASE}/pokemon-species/${id}`,
  );
  const species: RawSpecies = await response.json();
  cache.set(id, species);
  return species;
}

function mapToPokemon(
  detail: RawDetail,
  species: RawSpecies,
): Pokemon {
  const baseStats = {} as Record<keyof Pokemon["baseStats"], number>;
  for (const stat of detail.stats) {
    const key = STAT_NAME_MAP[stat.stat.name];
    if (key) {
      baseStats[key] = stat.base_stat;
    }
  }

  return pokemonSchema.parse({
    id: detail.id,
    name: detail.name,
    types: detail.types.map((t) => t.type.name),
    baseStats,
    generation: species.generation.name,
    captureRate: species.capture_rate,
    spriteUrl: detail.sprites.front_default,
  });
}

async function main() {
  console.log("Fetching Pokemon list from PokeAPI...");
  const list = await fetchPokemonList();
  const total = list.length;
  console.log(`Found ${total} Pokemon.`);

  const speciesCache = new Map<number, RawSpecies>();
  const allPokemon: Pokemon[] = [];

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (entry) => {
        const id = extractIdFromUrl(entry.url);
        const detail = await fetchPokemonDetail(id);
        const speciesId = extractIdFromUrl(detail.species.url);
        const species = await fetchPokemonSpecies(speciesId, speciesCache);
        return mapToPokemon(detail, species);
      }),
    );

    allPokemon.push(...results);
    console.log(
      `Fetched ${Math.min(i + BATCH_SIZE, total)}/${total} Pokemon...`,
    );
  }

  allPokemon.sort((a, b) => a.id - b.id);

  const outputPath = new URL(
    "../server/data/pokemon.json",
    import.meta.url,
  );
  await Deno.mkdir(new URL(".", outputPath), { recursive: true });
  await Deno.writeTextFile(
    outputPath,
    JSON.stringify(allPokemon, null, 2) + "\n",
  );

  console.log(
    `Done. ${allPokemon.length} Pokemon written to server/data/pokemon.json`,
  );
}

main();
