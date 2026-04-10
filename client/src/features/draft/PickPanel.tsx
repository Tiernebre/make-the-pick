import {
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo, useState } from "react";
import type { DraftPoolItem, DraftState } from "@make-the-pick/shared";

export interface PickPanelProps {
  draftState: DraftState;
  poolItems: DraftPoolItem[];
  isMyTurn: boolean;
  onPick: (poolItemId: string) => Promise<void>;
  isPicking: boolean;
}

export function PickPanel(
  { draftState, poolItems, isMyTurn, onPick, isPicking }: PickPanelProps,
) {
  const [search, setSearch] = useState("");
  const [pendingItem, setPendingItem] = useState<DraftPoolItem | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const availableSet = useMemo(
    () => new Set(draftState.availableItemIds),
    [draftState.availableItemIds],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return poolItems
      .filter((item) => availableSet.has(item.id))
      .filter((item) =>
        query === "" ? true : item.name.toLowerCase().includes(query)
      );
  }, [poolItems, availableSet, search]);

  function handleClickItem(item: DraftPoolItem) {
    setPendingItem(item);
    open();
  }

  async function handleConfirm() {
    if (!pendingItem) return;
    await onPick(pendingItem.id);
    close();
    setPendingItem(null);
  }

  function handleCancel() {
    close();
    setPendingItem(null);
  }

  return (
    <Card withBorder shadow="sm" padding="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={4}>Available Pool</Title>
          <Text size="xs" c="dimmed">
            {filteredItems.length} available
          </Text>
        </Group>

        {!isMyTurn && (
          <Text size="sm" c="dimmed">
            Waiting for your turn. You can still browse the pool.
          </Text>
        )}

        <TextInput
          placeholder="Search by name..."
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />

        <ScrollArea h={480} scrollbarSize={8} offsetScrollbars>
          <Stack gap="xs">
            {filteredItems.length === 0
              ? (
                <Text size="sm" c="dimmed">
                  No available Pokemon match that search.
                </Text>
              )
              : filteredItems.map((item) => (
                <Card
                  key={item.id}
                  withBorder
                  padding="xs"
                  radius="sm"
                >
                  <Group gap="xs" justify="space-between" wrap="nowrap">
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                      <Avatar
                        src={item.thumbnailUrl}
                        alt={item.name}
                        size="sm"
                        radius="sm"
                      />
                      <Stack gap={0} style={{ minWidth: 0 }}>
                        <Text size="sm" fw={500} tt="capitalize" truncate>
                          {item.name}
                        </Text>
                        {item.metadata && (
                          <Group gap={4}>
                            {item.metadata.types.map((t) => (
                              <Badge
                                key={t}
                                size="xs"
                                variant="light"
                                tt="capitalize"
                              >
                                {t}
                              </Badge>
                            ))}
                          </Group>
                        )}
                      </Stack>
                    </Group>
                    {isMyTurn && (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => handleClickItem(item)}
                        aria-label={`Draft ${item.name}`}
                      >
                        Draft
                      </Button>
                    )}
                  </Group>
                </Card>
              ))}
          </Stack>
        </ScrollArea>
      </Stack>

      <Modal
        opened={opened}
        onClose={handleCancel}
        title="Confirm Pick"
        transitionProps={{ duration: 0 }}
      >
        {pendingItem && (
          <Stack gap="md">
            <Text>
              Draft{" "}
              <Text span fw={700} tt="capitalize">
                {pendingItem.name}
              </Text>
              ? This cannot be undone.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} loading={isPicking}>
                Confirm
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Card>
  );
}
