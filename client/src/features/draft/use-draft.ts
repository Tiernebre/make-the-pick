import { trpc } from "../../trpc";

export function useDraftPool(leagueId: string) {
  return trpc.draftPool.getByLeagueId.useQuery({ leagueId });
}
