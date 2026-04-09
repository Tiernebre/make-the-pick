import { trpc } from "../../trpc";

export function usePoolItemNotes(leagueId: string) {
  return trpc.poolItemNote.list.useQuery({ leagueId });
}

export function useUpsertPoolItemNote() {
  const utils = trpc.useUtils();
  return trpc.poolItemNote.upsert.useMutation({
    onSuccess: (_data, variables) => {
      utils.poolItemNote.list.invalidate({ leagueId: variables.leagueId });
    },
  });
}

export function useDeletePoolItemNote() {
  const utils = trpc.useUtils();
  return trpc.poolItemNote.delete.useMutation({
    onSuccess: (_data, variables) => {
      utils.poolItemNote.list.invalidate({ leagueId: variables.leagueId });
    },
  });
}
