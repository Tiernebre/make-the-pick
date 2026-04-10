import type {
  DraftState,
  MakePickInput,
  StartDraftInput,
} from "@make-the-pick/shared";
import { trpc } from "../../trpc";

export function useDraftPool(leagueId: string) {
  return trpc.draftPool.getByLeagueId.useQuery({ leagueId });
}

// TODO(draft-server): the `trpc.draft.*` namespace is provided by the draft
// router being built in parallel on `feat/draft-core-pick-loop-server`. Until
// that PR merges and the AppRouter type picks it up, we access it behind a
// local `DraftApi` interface via a cast, so the type error is isolated to one
// place in this file.
interface DraftQueryLike {
  data: DraftState | undefined;
  isLoading: boolean;
  error: { message: string } | null;
  refetch: () => void;
}

interface DraftMutationLike<Input> {
  mutate: (
    input: Input,
    options?: { onSuccess?: () => void; onError?: (err: unknown) => void },
  ) => void;
  mutateAsync: (input: Input) => Promise<unknown>;
  isPending: boolean;
  error: { message: string } | null;
}

interface DraftApi {
  draft: {
    getState: {
      useQuery: (input: { leagueId: string }) => DraftQueryLike;
    };
    makePick: {
      useMutation: (opts?: {
        onSuccess?: () => void;
      }) => DraftMutationLike<MakePickInput>;
    };
    startDraft: {
      useMutation: (opts?: {
        onSuccess?: () => void;
      }) => DraftMutationLike<StartDraftInput>;
    };
  };
}

interface DraftUtilsLike {
  draft: {
    getState: {
      invalidate: (input: { leagueId: string }) => void;
    };
  };
}

const draftApi = trpc as unknown as DraftApi;

export function useDraft(leagueId: string): DraftQueryLike {
  return draftApi.draft.getState.useQuery({ leagueId });
}

export function useMakePick(
  leagueId: string,
): DraftMutationLike<MakePickInput> {
  // deno-lint-ignore no-explicit-any
  const utils = (trpc as any).useUtils() as DraftUtilsLike;
  return draftApi.draft.makePick.useMutation({
    onSuccess: () => {
      utils.draft.getState.invalidate({ leagueId });
    },
  });
}

export function useStartDraft(
  leagueId: string,
): DraftMutationLike<StartDraftInput> {
  // deno-lint-ignore no-explicit-any
  const utils = (trpc as any).useUtils() as DraftUtilsLike;
  return draftApi.draft.startDraft.useMutation({
    onSuccess: () => {
      utils.draft.getState.invalidate({ leagueId });
    },
  });
}
