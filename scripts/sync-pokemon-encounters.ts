import pokemonJson from "../packages/shared/data/pokemon.json" with {
  type: "json",
};
import pokemonVersionsJson from "../packages/shared/data/pokemon-versions.json" with {
  type: "json",
};

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const BATCH_SIZE = 25;
const MAX_ENCOUNTERS_PER_ENTRY = 10;

interface RawEncounterEntry {
  location_area: { name: string; url: string };
  version_details: Array<{
    max_chance: number;
    version: { name: string };
    encounter_details: Array<{
      chance: number;
      min_level: number;
      max_level: number;
      method: { name: string };
    }>;
  }>;
}

interface PokemonVersionJson {
  id: string;
  name: string;
  versionGroup: string;
  region: string;
  generation: number;
}

interface EncounterSummary {
  location: string;
  method: string;
  minLevel: number;
  maxLevel: number;
  chance: number;
}

interface PokemonEncounters {
  primary: { location: string; method: string } | null;
  encounters: EncounterSummary[];
}

type EncounterData = Record<
  string,
  Record<string, PokemonEncounters>
>;

function humanizeLocation(name: string): string {
  return name
    .replace(/-area$/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function humanizeMethod(name: string): string {
  return name
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

async function fetchEncounters(
  pokemonId: number,
): Promise<RawEncounterEntry[]> {
  const response = await fetchWithRetry(
    `${POKEAPI_BASE}/pokemon/${pokemonId}/encounters`,
  );
  return response.json();
}

function summarize(
  raw: RawEncounterEntry[],
  supportedVersions: Set<string>,
): Record<string, PokemonEncounters> {
  const byVersion = new Map<string, EncounterSummary[]>();

  for (const area of raw) {
    const locationName = humanizeLocation(area.location_area.name);
    for (const vd of area.version_details) {
      const versionName = vd.version.name;
      if (!supportedVersions.has(versionName)) continue;

      const list = byVersion.get(versionName) ?? [];

      // Dedup by (location, method) inside this area, take max level range + chance
      const methodBuckets = new Map<string, EncounterSummary>();
      for (const ed of vd.encounter_details) {
        const method = ed.method.name;
        const existing = methodBuckets.get(method);
        if (!existing) {
          methodBuckets.set(method, {
            location: locationName,
            method: humanizeMethod(method),
            minLevel: ed.min_level,
            maxLevel: ed.max_level,
            chance: ed.chance,
          });
        } else {
          existing.minLevel = Math.min(existing.minLevel, ed.min_level);
          existing.maxLevel = Math.max(existing.maxLevel, ed.max_level);
          existing.chance = Math.max(existing.chance, ed.chance);
        }
      }
      for (const summary of methodBuckets.values()) {
        list.push(summary);
      }
      byVersion.set(versionName, list);
    }
  }

  const result: Record<string, PokemonEncounters> = {};
  for (const [versionName, encounters] of byVersion) {
    // Sort: highest chance first, stable by location/method for determinism
    encounters.sort((a, b) =>
      b.chance - a.chance ||
      a.location.localeCompare(b.location) ||
      a.method.localeCompare(b.method)
    );
    const first = encounters[0];
    result[versionName] = {
      primary: first
        ? { location: first.location, method: first.method }
        : null,
      encounters: encounters.slice(0, MAX_ENCOUNTERS_PER_ENTRY),
    };
  }
  return result;
}

async function main() {
  const pokemon = pokemonJson as Array<{ id: number; name: string }>;
  const versions = pokemonVersionsJson as PokemonVersionJson[];
  const supportedVersions = new Set(versions.map((v) => v.id));

  console.log(
    `Fetching encounters for ${pokemon.length} Pokemon across ${supportedVersions.size} versions...`,
  );

  // versionName -> pokemonId -> PokemonEncounters
  const data: EncounterData = {};
  for (const v of supportedVersions) data[v] = {};

  let processed = 0;
  for (let i = 0; i < pokemon.length; i += BATCH_SIZE) {
    const batch = pokemon.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (p) => {
        try {
          const raw = await fetchEncounters(p.id);
          return {
            id: p.id,
            name: p.name,
            summary: summarize(raw, supportedVersions),
          };
        } catch (err) {
          console.warn(
            `  skipping ${p.name} (${p.id}): ${(err as Error).message}`,
          );
          return { id: p.id, name: p.name, summary: {} };
        }
      }),
    );
    for (const { id, summary } of results) {
      for (const [versionName, pokemonEnc] of Object.entries(summary)) {
        if (pokemonEnc.encounters.length > 0) {
          data[versionName][String(id)] = pokemonEnc;
        }
      }
    }
    processed += batch.length;
    console.log(`  processed ${processed}/${pokemon.length}`);
  }

  const outputPath = new URL(
    "../packages/shared/data/pokemon-encounters.json",
    import.meta.url,
  );
  await Deno.writeTextFile(
    outputPath,
    JSON.stringify(data, null, 2) + "\n",
  );

  const totalEntries = Object.values(data).reduce(
    (sum, v) => sum + Object.keys(v).length,
    0,
  );
  console.log(
    `\nDone. ${totalEntries} (version, pokemon) encounter entries written to packages/shared/data/pokemon-encounters.json`,
  );
}

main();
