import { trpc } from "../../trpc";

export function useDraftPool(leagueId: string) {
  return trpc.draftPool.getByLeagueId.useQuery({ leagueId });
}

export function useDraft(leagueId: string) {
  return trpc.draft.getState.useQuery({ leagueId });
}

export function useMakePick(leagueId: string) {
  const utils = trpc.useUtils();
  return trpc.draft.makePick.useMutation({
    onSuccess: () => {
      utils.draft.getState.invalidate({ leagueId });
    },
  });
}

export function useStartDraft(leagueId: string) {
  const utils = trpc.useUtils();
  return trpc.draft.startDraft.useMutation({
    onSuccess: () => {
      utils.draft.getState.invalidate({ leagueId });
    },
  });
}
