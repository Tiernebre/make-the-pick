import { Button, Group, Modal, Text } from "@mantine/core";

interface DeleteLeagueModalProps {
  opened: boolean;
  onClose: () => void;
  leagueName: string;
  isPending: boolean;
  onConfirm: () => void;
}

export function DeleteLeagueModal({
  opened,
  onClose,
  leagueName,
  isPending,
  onConfirm,
}: DeleteLeagueModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete League"
    >
      <Text mb="lg">
        Are you sure you want to delete{" "}
        <Text span fw={700}>{leagueName}</Text>? This action cannot be undone.
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button color="red" onClick={onConfirm} loading={isPending}>
          Delete
        </Button>
      </Group>
    </Modal>
  );
}
