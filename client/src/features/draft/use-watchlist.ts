import { trpc } from "../../trpc";

export function useWatchlist(leagueId: string) {
  return trpc.watchlist.list.useQuery({ leagueId });
}

export function useAddToWatchlist() {
  const utils = trpc.useUtils();
  return trpc.watchlist.add.useMutation({
    onSuccess: (_data, variables) => {
      utils.watchlist.list.invalidate({ leagueId: variables.leagueId });
    },
  });
}

export function useRemoveFromWatchlist() {
  const utils = trpc.useUtils();
  return trpc.watchlist.remove.useMutation({
    onSuccess: (_data, variables) => {
      utils.watchlist.list.invalidate({ leagueId: variables.leagueId });
    },
  });
}

export function useReorderWatchlist() {
  const utils = trpc.useUtils();
  return trpc.watchlist.reorder.useMutation({
    onSuccess: (_data, variables) => {
      utils.watchlist.list.invalidate({ leagueId: variables.leagueId });
    },
  });
}
