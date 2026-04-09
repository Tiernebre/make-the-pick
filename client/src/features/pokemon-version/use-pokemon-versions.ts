import { trpc } from "../../trpc";

export function usePokemonVersions() {
  return trpc.pokemonVersion.list.useQuery();
}
