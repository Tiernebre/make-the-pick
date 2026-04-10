import {
  Avatar,
  Badge,
  Card,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { DraftPick, DraftPoolItem } from "@make-the-pick/shared";

export interface RosterStripProps {
  picks: DraftPick[];
  poolItemsById: Record<string, DraftPoolItem>;
}

export function RosterStrip({ picks, poolItemsById }: RosterStripProps) {
  const ordered = [...picks].sort((a, b) => a.pickNumber - b.pickNumber);

  return (
    <Card withBorder shadow="sm" padding="md" radius="md">
      <Title order={5} mb="sm">
        Your Roster
      </Title>
      {ordered.length === 0
        ? (
          <Text size="sm" c="dimmed">
            No picks yet — your drafted Pokemon will appear here.
          </Text>
        )
        : (
          <ScrollArea scrollbarSize={8} offsetScrollbars>
            <Group gap="sm" wrap="nowrap" align="flex-start">
              {ordered.map((pick) => {
                const item = poolItemsById[pick.poolItemId];
                if (!item) return null;
                return (
                  <Card
                    key={pick.id}
                    withBorder
                    padding="xs"
                    radius="sm"
                    style={{ minWidth: 140 }}
                  >
                    <Stack gap={4} align="center">
                      <Avatar
                        src={item.thumbnailUrl}
                        alt={item.name}
                        size="md"
                        radius="sm"
                      />
                      <Text size="sm" fw={500} tt="capitalize">
                        {item.name}
                      </Text>
                      {item.metadata && (
                        <Group gap={4} justify="center">
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
                  </Card>
                );
              })}
            </Group>
          </ScrollArea>
        )}
    </Card>
  );
}
