import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";

interface LeaveLeagueModalProps {
  opened: boolean;
  onClose: () => void;
  leagueName: string;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  onConfirm: () => void;
}

export function LeaveLeagueModal({
  opened,
  onClose,
  leagueName,
  isPending,
  isError,
  errorMessage,
  onConfirm,
}: LeaveLeagueModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Leave league">
      <Stack gap="md">
        <Text>
          Are you sure you want to leave{" "}
          <Text span fw={700}>{leagueName}</Text>? An NPC trainer will take your
          spot (including any picks you've made).
        </Text>
        {isError && (
          <Alert color="red" title="Failed to leave">
            {errorMessage}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button color="red" loading={isPending} onClick={onConfirm}>
            Leave
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
