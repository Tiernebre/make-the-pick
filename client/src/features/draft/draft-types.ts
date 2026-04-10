import type {
  DraftPick as SharedDraftPick,
  DraftState as SharedDraftState,
} from "@make-the-pick/shared";

/**
 * Local extensions of the shared draft types that add the pick-timer and
 * auto-pick fields. The authoritative fields are landing in a parallel server
 * PR (`feat/draft-pick-timer`) that adds `currentTurnDeadline` to the draft
 * snapshot and `autoPicked` to each pick.
 *
 * TODO(draft-pick-timer): once the shared schema PR merges, delete this file
 * and import `DraftState`/`DraftPick` directly from `@make-the-pick/shared`.
 */

export type DraftPick = SharedDraftPick & {
  autoPicked?: boolean;
};

export type DraftState = Omit<SharedDraftState, "draft" | "picks"> & {
  draft: SharedDraftState["draft"] & {
    currentTurnDeadline?: string | null;
  };
  picks: DraftPick[];
};
