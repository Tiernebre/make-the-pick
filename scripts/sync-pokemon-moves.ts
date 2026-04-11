import type { PokemonMovesEntry } from "../packages/shared/schemas/pokemon-moves.ts";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const BATCH_SIZE = 25;

interface RawListResult {
  name: string;
  url: string;
}

interface RawMoveVersionGroupDetail {
  level_learned_at: number;
  move_learn_method: { name: string; url: string };
  version_group: { name: string; url: string };
  order: number;
}

interface RawMove {
  move: { name: string; url: string };
  version_group_details: RawMoveVersionGroupDetail[];
}

interface RawDetail {
  id: number;
  moves: RawMove[];
}

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

function extractLevelUpMoves(
  detail: RawDetail,
): PokemonMovesEntry {
  const movesByVersion: Record<string, Array<{ name: string; level: number }>> =
    {};

  for (const move of detail.moves) {
    for (const vgd of move.version_group_details) {
      if (vgd.move_learn_method.name !== "level-up") continue;

      const versionGroup = vgd.version_group.name;
      if (!movesByVersion[versionGroup]) {
        movesByVersion[versionGroup] = [];
      }

      movesByVersion[versionGroup].push({
        name: move.move.name,
        level: vgd.level_learned_at,
      });
    }
  }

  // Sort moves within each version group by level
  for (const key of Object.keys(movesByVersion)) {
    movesByVersion[key].sort((a, b) => a.level - b.level);
  }

  return {
    pokemonId: detail.id,
    moves: movesByVersion,
  };
}

async function main() {
  console.log("Fetching Pokemon list from PokeAPI...");
  const list = await fetchPokemonList();
  const total = list.length;
  console.log(`Found ${total} Pokemon.`);

  const allMoves: PokemonMovesEntry[] = [];

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (entry) => {
        const id = extractIdFromUrl(entry.url);
        const detail = await fetchPokemonDetail(id);
        return extractLevelUpMoves(detail);
      }),
    );

    allMoves.push(...results);
    console.log(
      `Fetched ${Math.min(i + BATCH_SIZE, total)}/${total} Pokemon moves...`,
    );
  }

  allMoves.sort((a, b) => a.pokemonId - b.pokemonId);

  const outputPath = new URL(
    "../server/data/pokemon-moves.json",
    import.meta.url,
  );
  await Deno.mkdir(new URL(".", outputPath), { recursive: true });
  await Deno.writeTextFile(
    outputPath,
    JSON.stringify(allMoves, null, 2) + "\n",
  );

  console.log(
    `Done. ${allMoves.length} Pokemon moves written to server/data/pokemon-moves.json`,
  );
}

main();
