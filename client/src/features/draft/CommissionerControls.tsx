import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { DraftPoolItem, DraftState } from "@make-the-pick/shared";
import {
  usePauseDraft,
  useResumeDraft,
  useUndoLastPick,
} from "./use-draft-commissioner";

export interface CommissionerControlsProps {
  draftState: DraftState;
  leagueId: string;
  players: Array<{ leaguePlayerId: string; name: string }>;
  poolItemsById: Record<string, DraftPoolItem>;
  isFastMode?: boolean;
  onToggleFastMode?: (enabled: boolean) => void;
}

export function CommissionerControls(
  {
    draftState,
    leagueId,
    players,
    poolItemsById,
    isFastMode,
    onToggleFastMode,
  }: CommissionerControlsProps,
) {
  const pause = usePauseDraft(leagueId);
  const resume = useResumeDraft(leagueId);
  const undo = useUndoLastPick(leagueId);
  const [undoOpened, { open: openUndo, close: closeUndo }] = useDisclosure(
    false,
  );

  const status = draftState.draft.status;
  const picks = draftState.picks;
  const lastPick = picks.length > 0 ? picks[picks.length - 1] : null;
  const canUndo = (status === "in_progress" || status === "paused" ||
    status === "complete") && picks.length > 0;
  const canPause = status === "in_progress";
  const canResume = status === "paused";

  const lastPickPlayerName = lastPick
    ? players.find((p) => p.leaguePlayerId === lastPick.leaguePlayerId)?.name ??
      "player"
    : "";
  const lastPickPokemonName = lastPick
    ? poolItemsById[lastPick.poolItemId]?.name ?? "pick"
    : "";

  function handleConfirmUndo() {
    undo.mutate({ leagueId });
    closeUndo();
  }

  return (
    <Stack gap="xs">
      <Group gap="xs">
        {canPause && (
          <Button
            size="xs"
            variant="light"
            color="yellow"
            onClick={() => pause.mutate({ leagueId })}
            loading={pause.isPending}
          >
            Pause
          </Button>
        )}
        {canResume && (
          <Button
            size="xs"
            variant="light"
            color="green"
            onClick={() => resume.mutate({ leagueId })}
            loading={resume.isPending}
          >
            Resume
          </Button>
        )}
        {canUndo && (
          <Button
            size="xs"
            variant="light"
            color="red"
            onClick={openUndo}
            loading={undo.isPending}
          >
            Undo Last Pick
          </Button>
        )}
      </Group>

      {pause.error && (
        <Alert color="red" title="Failed to pause draft">
          {pause.error.message}
        </Alert>
      )}
      {resume.error && (
        <Alert color="red" title="Failed to resume draft">
          {resume.error.message}
        </Alert>
      )}
      {undo.error && (
        <Alert color="red" title="Failed to undo pick">
          {undo.error.message}
        </Alert>
      )}

      {onToggleFastMode && (
        <Switch
          label="Fast mode (skip pick ceremonies)"
          checked={isFastMode ?? false}
          onChange={(e) => onToggleFastMode(e.currentTarget.checked)}
        />
      )}

      <Modal
        opened={undoOpened}
        onClose={closeUndo}
        title="Undo last pick"
        transitionProps={{ duration: 0 }}
      >
        <Stack gap="md">
          <Text>
            Undo{" "}
            <Text span fw={700}>
              {lastPickPlayerName}
            </Text>
            's pick of{" "}
            <Text span fw={700} tt="capitalize">
              {lastPickPokemonName}
            </Text>? This will return the Pokemon to the pool and rewind the
            current pick.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeUndo}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleConfirmUndo}
              loading={undo.isPending}
            >
              Confirm Undo
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
