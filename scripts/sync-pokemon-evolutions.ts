import pokemonJson from "../server/data/pokemon.json" with {
  type: "json",
};

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const BATCH_SIZE = 25;

interface RawSpecies {
  id: number;
  name: string;
  evolution_chain: { url: string } | null;
  evolves_from_species: { name: string; url: string } | null;
}

interface RawEvolutionDetail {
  trigger: { name: string };
  min_level: number | null;
  item: { name: string } | null;
  held_item: { name: string } | null;
  known_move: { name: string } | null;
  min_happiness: number | null;
  min_affection: number | null;
  time_of_day: string;
  needs_overworld_rain: boolean;
  location: { name: string } | null;
  gender: number | null;
  trade_species: { name: string } | null;
}

interface RawEvolutionChainNode {
  species: { name: string; url: string };
  evolution_details: RawEvolutionDetail[];
  evolves_to: RawEvolutionChainNode[];
}

interface RawEvolutionChain {
  id: number;
  chain: RawEvolutionChainNode;
}

interface EvolutionTrigger {
  trigger: string;
  minLevel: number | null;
  item: string | null;
  heldItem: string | null;
  knownMove: string | null;
  minHappiness: number | null;
  timeOfDay: string | null;
  needsOverworldRain: boolean;
  location: string | null;
  tradeSpecies: string | null;
}

interface PokemonEvolution {
  pokemonId: number;
  chainId: number;
  evolvesFromId: number | null;
  triggers: EvolutionTrigger[];
}

function extractIdFromUrl(url: string): number {
  const parts = url.replace(/\/$/, "").split("/");
  return Number(parts[parts.length - 1]);
}

async function fetchWithRetry(url: string): Promise<Response> {
  const response = await fetch(url);
  if (response.ok) return response;
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const retry = await fetch(url);
  if (retry.ok) return retry;
  throw new Error(
    `Failed to fetch ${url}: ${retry.status} ${retry.statusText}`,
  );
}

async function fetchSpecies(id: number): Promise<RawSpecies> {
  const response = await fetchWithRetry(
    `${POKEAPI_BASE}/pokemon-species/${id}`,
  );
  return response.json();
}

async function fetchEvolutionChain(url: string): Promise<RawEvolutionChain> {
  const response = await fetchWithRetry(url);
  return response.json();
}

function mapDetail(raw: RawEvolutionDetail): EvolutionTrigger {
  return {
    trigger: raw.trigger.name,
    minLevel: raw.min_level,
    item: raw.item?.name ?? null,
    heldItem: raw.held_item?.name ?? null,
    knownMove: raw.known_move?.name ?? null,
    minHappiness: raw.min_happiness,
    timeOfDay: raw.time_of_day && raw.time_of_day.length > 0
      ? raw.time_of_day
      : null,
    needsOverworldRain: raw.needs_overworld_rain,
    location: raw.location?.name ?? null,
    tradeSpecies: raw.trade_species?.name ?? null,
  };
}

function walkChain(
  chain: RawEvolutionChainNode,
  chainId: number,
  parentId: number | null,
  out: Map<number, PokemonEvolution>,
) {
  const speciesId = extractIdFromUrl(chain.species.url);
  const existing = out.get(speciesId);
  if (!existing) {
    out.set(speciesId, {
      pokemonId: speciesId,
      chainId,
      evolvesFromId: parentId,
      triggers: chain.evolution_details.map(mapDetail),
    });
  }
  for (const next of chain.evolves_to) {
    walkChain(next, chainId, speciesId, out);
  }
}

async function main() {
  const pokemon = pokemonJson as Array<{ id: number; name: string }>;
  const seenChainIds = new Set<number>();
  const result = new Map<number, PokemonEvolution>();

  console.log(
    `Fetching species metadata for ${pokemon.length} Pokemon to discover evolution chains...`,
  );

  // First: fetch species for every pokemon to find evolution_chain URLs.
  const chainUrls = new Map<number, string>();
  let processed = 0;
  for (let i = 0; i < pokemon.length; i += BATCH_SIZE) {
    const batch = pokemon.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (p) => {
        try {
          const species = await fetchSpecies(p.id);
          return { id: p.id, url: species.evolution_chain?.url ?? null };
        } catch (err) {
          console.warn(
            `  species ${p.name} (${p.id}): ${(err as Error).message}`,
          );
          return { id: p.id, url: null };
        }
      }),
    );
    for (const r of results) {
      if (r.url) {
        const chainId = extractIdFromUrl(r.url);
        chainUrls.set(chainId, r.url);
      }
    }
    processed += batch.length;
    console.log(`  species ${processed}/${pokemon.length}`);
  }

  console.log(
    `\nFetching ${chainUrls.size} unique evolution chains...`,
  );
  const chainList = [...chainUrls.entries()];
  processed = 0;
  for (let i = 0; i < chainList.length; i += BATCH_SIZE) {
    const batch = chainList.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ([chainId, url]) => {
        try {
          const chain = await fetchEvolutionChain(url);
          return { chainId, chain };
        } catch (err) {
          console.warn(`  chain ${chainId}: ${(err as Error).message}`);
          return null;
        }
      }),
    );
    for (const entry of results) {
      if (!entry) continue;
      if (seenChainIds.has(entry.chainId)) continue;
      seenChainIds.add(entry.chainId);
      walkChain(entry.chain.chain, entry.chainId, null, result);
    }
    processed += batch.length;
    console.log(`  chains ${processed}/${chainList.length}`);
  }

  // Stable output keyed by pokemon id.
  const record: Record<string, PokemonEvolution> = {};
  for (const [id, evo] of [...result.entries()].sort(([a], [b]) => a - b)) {
    record[String(id)] = evo;
  }

  const outputPath = new URL(
    "../server/data/pokemon-evolutions.json",
    import.meta.url,
  );
  await Deno.writeTextFile(
    outputPath,
    JSON.stringify(record, null, 2) + "\n",
  );
  console.log(
    `\nDone. ${result.size} Pokemon evolution entries written to server/data/pokemon-evolutions.json`,
  );
}

main();
