import { trpc } from "../../trpc";

// TODO(draft-commissioner): remove this cast once the parallel server PR
// `feat/draft-commissioner-controls` lands. At that point `trpc.draft` will
// have `pause`, `resume`, and `undoLastPick` procedures generated from the
// shared AppRouter type and we can call them directly without the interface
// escape hatch below.
interface CommissionerMutation {
  useMutation: (opts?: {
    onSuccess?: () => void;
  }) => {
    mutate: (input: { leagueId: string }) => void;
    mutateAsync: (input: { leagueId: string }) => Promise<unknown>;
    isPending: boolean;
    error: { message: string } | null;
    reset: () => void;
  };
}

interface CommissionerApi {
  pause: CommissionerMutation;
  resume: CommissionerMutation;
  undoLastPick: CommissionerMutation;
}

// deno-lint-ignore no-explicit-any
const commissionerApi = (trpc.draft as any) as CommissionerApi;

export function usePauseDraft(leagueId: string) {
  const utils = trpc.useUtils();
  return commissionerApi.pause.useMutation({
    onSuccess: () => {
      utils.draft.getState.invalidate({ leagueId });
    },
  });
}

export function useResumeDraft(leagueId: string) {
  const utils = trpc.useUtils();
  return commissionerApi.resume.useMutation({
    onSuccess: () => {
      utils.draft.getState.invalidate({ leagueId });
    },
  });
}

export function useUndoLastPick(leagueId: string) {
  const utils = trpc.useUtils();
  return commissionerApi.undoLastPick.useMutation({
    onSuccess: () => {
      utils.draft.getState.invalidate({ leagueId });
    },
  });
}
