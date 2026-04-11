import {
  Alert,
  Badge,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { npcStrategyColor, parseNpcStrategy } from "@make-the-pick/shared";
import { NpcAvatar } from "../NpcAvatar";

interface NpcOption {
  id: string;
  name: string;
  image?: string | null;
  npcStrategy?: string | null;
}

interface ChooseNpcModalProps {
  opened: boolean;
  onClose: () => void;
  npcs?: NpcOption[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  addNpcPending: boolean;
  addNpcError: boolean;
  addNpcErrorMessage?: string;
  onChooseNpc: (npcUserId: string) => void;
}

export function ChooseNpcModal({
  opened,
  onClose,
  npcs,
  isLoading,
  isError,
  errorMessage,
  addNpcPending,
  addNpcError,
  addNpcErrorMessage,
  onChooseNpc,
}: ChooseNpcModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Choose an NPC trainer"
    >
      <Stack gap="sm">
        {isLoading && (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        )}
        {isError && (
          <Alert color="red" title="Failed to load NPCs">
            {errorMessage}
          </Alert>
        )}
        {npcs && npcs.length === 0 && (
          <Text c="dimmed" size="sm">
            No NPC trainers available — all have already joined.
          </Text>
        )}
        {npcs?.map((npc) => {
          const strategy = parseNpcStrategy(npc.npcStrategy ?? null);
          return (
            <UnstyledButton
              key={npc.id}
              disabled={addNpcPending}
              onClick={() => onChooseNpc(npc.id)}
              p="sm"
              style={{
                borderRadius: "var(--mantine-radius-sm)",
                border: "1px solid var(--mantine-color-default-border)",
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm">
                  <NpcAvatar
                    name={npc.name}
                    image={npc.image ?? null}
                    radius="xl"
                    size="sm"
                  />
                  <Text size="sm">{npc.name}</Text>
                </Group>
                {strategy && (
                  <Tooltip label={strategy.description} withinPortal>
                    <Badge
                      variant="outline"
                      color={npcStrategyColor(strategy)}
                      size="xs"
                    >
                      {strategy.label}
                    </Badge>
                  </Tooltip>
                )}
              </Group>
            </UnstyledButton>
          );
        })}
        {addNpcError && (
          <Alert color="red" title="Failed to add NPC">
            {addNpcErrorMessage}
          </Alert>
        )}
      </Stack>
    </Modal>
  );
}
