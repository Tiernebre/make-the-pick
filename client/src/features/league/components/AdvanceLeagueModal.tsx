import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";

interface AdvanceLeagueModalProps {
  opened: boolean;
  onClose: () => void;
  leagueName: string;
  nextStatus: string | null;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  onConfirm: () => void;
}

export function AdvanceLeagueModal({
  opened,
  onClose,
  leagueName,
  nextStatus,
  isPending,
  isError,
  errorMessage,
  onConfirm,
}: AdvanceLeagueModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Advance League Status"
    >
      <Stack gap="md">
        <Text>
          Are you sure you want to advance{" "}
          <Text span fw={700}>{leagueName}</Text> to{" "}
          <Text span fw={700}>{nextStatus}</Text>? This action cannot be undone.
        </Text>
        {isError && (
          <Alert color="red" title="Failed to advance">
            {errorMessage}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={isPending}>
            Advance
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
