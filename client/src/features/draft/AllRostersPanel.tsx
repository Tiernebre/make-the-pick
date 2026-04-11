import {
  Avatar,
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  type DraftPoolItem,
  type DraftState,
  npcStrategyColor,
  parseNpcStrategy,
} from "@make-the-pick/shared";
import { useMemo } from "react";
import { getPoolItemDisplay } from "./pool-item-display";

export interface AllRostersPanelProps {
  draftState: DraftState;
  poolItemsById: Record<string, DraftPoolItem>;
}

export function AllRostersPanel({
  draftState,
  poolItemsById,
}: AllRostersPanelProps) {
  const picksByPlayer = useMemo(() => {
    const map = new Map<string, typeof draftState.picks>();
    for (const player of draftState.players) {
      map.set(player.id, []);
    }
    for (const pick of draftState.picks) {
      const list = map.get(pick.leaguePlayerId);
      if (list) list.push(pick);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.pickNumber - b.pickNumber);
    }
    return map;
  }, [draftState.players, draftState.picks]);

  return (
    <Stack gap="md">
      <Title order={4}>Rosters</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {draftState.players.map((player) => {
          const picks = picksByPlayer.get(player.id) ?? [];
          const strategy = parseNpcStrategy(player.npcStrategy ?? null);
          return (
            <Card key={player.id} withBorder padding="md" radius="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text fw={600}>{player.name}</Text>
                    {strategy && (
                      <Badge
                        variant="outline"
                        color={npcStrategyColor(strategy)}
                        size="xs"
                        title={strategy.description}
                      >
                        {strategy.label}
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {picks.length} pick{picks.length === 1 ? "" : "s"}
                  </Text>
                </Group>
                {picks.length === 0
                  ? (
                    <Text size="sm" c="dimmed">
                      No picks yet.
                    </Text>
                  )
                  : (
                    <Stack gap="xs">
                      {picks.map((pick) => {
                        const item = poolItemsById[pick.poolItemId];
                        if (!item) return null;
                        const display = getPoolItemDisplay(item);
                        return (
                          <Group key={pick.id} gap="xs" wrap="nowrap">
                            <Avatar
                              src={item.thumbnailUrl}
                              alt={item.name}
                              size="sm"
                              radius="sm"
                            />
                            <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                              <Text size="sm" fw={500} tt="capitalize" truncate>
                                {item.name}
                              </Text>
                              {display && (
                                <Group gap={4}>
                                  {display.types.map((t) => (
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
                        );
                      })}
                    </Stack>
                  )}
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
