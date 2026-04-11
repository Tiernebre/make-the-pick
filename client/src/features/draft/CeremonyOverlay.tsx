import { Button, Group, Modal, Stack, Text, Title } from "@mantine/core";
import type { Ceremony } from "./use-draft-ceremony";

export interface CeremonyOverlayProps {
  current: Ceremony | null;
  isMuted: boolean;
  onSkip: () => void;
  onToggleMute: () => void;
}

export function CeremonyOverlay(
  { current, isMuted, onSkip, onToggleMute }: CeremonyOverlayProps,
) {
  if (!current) return null;

  return (
    <Modal
      opened
      onClose={onSkip}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape
      centered
      size="lg"
      transitionProps={{ duration: 200 }}
      title={null}
      overlayProps={{ backgroundOpacity: 0.85, blur: 4 }}
    >
      <Stack gap="lg" align="center" py="xl">
        <Title order={1} ta="center" style={{ letterSpacing: "0.05em" }}>
          THE PICK IS IN
        </Title>
        <Text size="lg" c="dimmed">
          Round {current.round} · Pick {current.pickNumber + 1}
        </Text>
        <Stack gap={4} align="center">
          <Text size="xl" fw={700}>
            {current.playerName}
          </Text>
          <Text size="sm" c="dimmed">selects</Text>
          <Title order={2} tt="capitalize">
            {current.pokemonName}
          </Title>
        </Stack>
        <Group>
          <Button variant="subtle" onClick={onToggleMute}>
            {isMuted ? "Unmute" : "Mute"}
          </Button>
          <Button variant="default" onClick={onSkip}>
            Skip
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
