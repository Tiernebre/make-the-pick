const POKEAPI_BASE = "https://pokeapi.co/api/v2";

interface PokeApiListResponse {
  results: Array<{ name: string; url: string }>;
}

interface PokeApiVersion {
  id: number;
  name: string;
  names: Array<{ name: string; language: { name: string } }>;
  version_group: { name: string; url: string };
}

interface PokeApiVersionGroup {
  name: string;
  pokedexes: Array<{ name: string; url: string }>;
  generation: { name: string; url: string };
  regions: Array<{ name: string }>;
}

interface PokeApiPokedex {
  name: string;
  pokemon_entries: Array<{
    entry_number: number;
    pokemon_species: { name: string; url: string };
  }>;
}

interface PokemonVersion {
  id: string;
  name: string;
  versionGroup: string;
  region: string;
  generation: number;
}

function extractIdFromUrl(url: string): number {
  const parts = url.replace(/\/$/, "").split("/");
  return Number(parts[parts.length - 1]);
}

function generationNameToNumber(name: string): number {
  const romanMap: Record<string, number> = {
    "generation-i": 1,
    "generation-ii": 2,
    "generation-iii": 3,
    "generation-iv": 4,
    "generation-v": 5,
    "generation-vi": 6,
    "generation-vii": 7,
    "generation-viii": 8,
    "generation-ix": 9,
  };
  return romanMap[name] ?? 0;
}

function capitalize(s: string): string {
  return s
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

async function main() {
  // 1. Fetch all versions
  console.log("Fetching version list...");
  const versionListRes = await fetchWithRetry(
    `${POKEAPI_BASE}/version?limit=100`,
  );
  const versionList: PokeApiListResponse = await versionListRes.json();

  // 2. Fetch each version's details
  console.log(
    `Found ${versionList.results.length} versions. Fetching details...`,
  );
  const versions: PokemonVersion[] = [];
  const versionGroupCache = new Map<string, PokeApiVersionGroup>();

  for (const entry of versionList.results) {
    const versionRes = await fetchWithRetry(entry.url);
    const version: PokeApiVersion = await versionRes.json();

    // Get English name
    const englishName = version.names.find((n) =>
      n.language.name === "en"
    )?.name ??
      capitalize(version.name);

    // Fetch version group if not cached
    const vgName = version.version_group.name;
    if (!versionGroupCache.has(vgName)) {
      const vgRes = await fetchWithRetry(version.version_group.url);
      const vg: PokeApiVersionGroup = await vgRes.json();
      versionGroupCache.set(vgName, vg);
    }

    const vg = versionGroupCache.get(vgName)!;
    const region = vg.regions[0]?.name ?? "unknown";
    const generation = generationNameToNumber(vg.generation.name);

    versions.push({
      id: version.name,
      name: englishName,
      versionGroup: vgName,
      region: capitalize(region),
      generation,
    });

    console.log(
      `  ${version.name} -> ${vgName} (${
        capitalize(region)
      }, gen ${generation})`,
    );
  }

  // 3. Fetch regional pokedexes for each version group
  console.log("\nFetching regional pokedexes...");
  const regionalPokedexes: Record<string, number[]> = {};

  for (const [vgName, vg] of versionGroupCache) {
    if (vg.pokedexes.length === 0) {
      console.log(`  ${vgName}: no pokedexes listed, skipping`);
      continue;
    }

    const allSpeciesIds = new Set<number>();

    for (const pokedexRef of vg.pokedexes) {
      const pokedexRes = await fetchWithRetry(pokedexRef.url);
      const pokedex: PokeApiPokedex = await pokedexRes.json();

      for (const entry of pokedex.pokemon_entries) {
        const speciesId = extractIdFromUrl(entry.pokemon_species.url);
        allSpeciesIds.add(speciesId);
      }

      console.log(
        `  ${vgName} / ${pokedex.name}: ${pokedex.pokemon_entries.length} entries`,
      );
    }

    regionalPokedexes[vgName] = [...allSpeciesIds].sort((a, b) => a - b);
    console.log(
      `  ${vgName} total unique species: ${allSpeciesIds.size}`,
    );
  }

  // 4. Write output files
  const dataDir = new URL(
    "../packages/shared/data/",
    import.meta.url,
  );

  const versionsPath = new URL("pokemon-versions.json", dataDir);
  await Deno.writeTextFile(
    versionsPath,
    JSON.stringify(versions, null, 2) + "\n",
  );
  console.log(
    `\nWrote ${versions.length} versions to packages/shared/data/pokemon-versions.json`,
  );

  const pokedexesPath = new URL("regional-pokedexes.json", dataDir);
  await Deno.writeTextFile(
    pokedexesPath,
    JSON.stringify(regionalPokedexes, null, 2) + "\n",
  );
  console.log(
    `Wrote ${
      Object.keys(regionalPokedexes).length
    } regional pokedexes to packages/shared/data/regional-pokedexes.json`,
  );
}

main();
