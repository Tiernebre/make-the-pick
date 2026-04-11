import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";

interface RemovePlayerModalProps {
  playerToRemove: { userId: string; name: string } | null;
  onClose: () => void;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  onConfirm: (player: { userId: string; name: string }) => void;
}

export function RemovePlayerModal({
  playerToRemove,
  onClose,
  isPending,
  isError,
  errorMessage,
  onConfirm,
}: RemovePlayerModalProps) {
  return (
    <Modal
      opened={playerToRemove !== null}
      onClose={onClose}
      title="Remove player"
    >
      <Stack gap="md">
        <Text>
          Are you sure you want to remove{" "}
          <Text span fw={700}>{playerToRemove?.name}</Text>{" "}
          from the league? They can rejoin with the invite code.
        </Text>
        {isError && (
          <Alert color="red" title="Failed to remove">
            {errorMessage}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="red"
            loading={isPending}
            onClick={() => {
              if (!playerToRemove) return;
              onConfirm(playerToRemove);
            }}
          >
            Remove
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
