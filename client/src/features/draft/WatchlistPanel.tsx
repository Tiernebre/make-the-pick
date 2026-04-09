import {
  ActionIcon,
  Avatar,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconStarFilled,
} from "@tabler/icons-react";
import type { DraftPoolItem, WatchlistItem } from "@make-the-pick/shared";
import { useMemo } from "react";
import { usePoolItemNotes } from "./use-pool-item-notes";
import {
  useRemoveFromWatchlist,
  useReorderWatchlist,
  useWatchlist,
} from "./use-watchlist";

interface WatchlistPanelProps {
  leagueId: string;
  poolItems: DraftPoolItem[];
}

export function WatchlistPanel({ leagueId, poolItems }: WatchlistPanelProps) {
  const watchlist = useWatchlist(leagueId);
  const removeFromWatchlist = useRemoveFromWatchlist();
  const reorderWatchlist = useReorderWatchlist();
  const poolItemNotes = usePoolItemNotes(leagueId);

  const poolItemMap = new Map(poolItems.map((item) => [item.id, item]));

  const notesByItemId = useMemo(() => {
    const map = new Map<string, string>();
    for (const note of poolItemNotes.data ?? []) {
      map.set(note.draftPoolItemId, note.content);
    }
    return map;
  }, [poolItemNotes.data]);

  const items = watchlist.data ?? [];

  function moveItem(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    reorderWatchlist.mutate({
      leagueId,
      itemIds: reordered.map((item) => item.id),
    });
  }

  return (
    <Card withBorder p="md">
      <Title order={4} mb="sm">
        Watchlist ({items.length})
      </Title>
      {items.length === 0
        ? (
          <Text size="sm" c="dimmed">
            Click the star icon on any player to add them to your watchlist.
          </Text>
        )
        : (
          <Stack gap="xs">
            {items.map((item: WatchlistItem, index: number) => {
              const poolItem = poolItemMap.get(item.draftPoolItemId);
              if (!poolItem) return null;

              const note = notesByItemId.get(item.draftPoolItemId);

              return (
                <Group key={item.id} gap="xs" wrap="nowrap" align="flex-start">
                  <Text size="sm" c="dimmed" w={20} ta="right" mt={2}>
                    {index + 1}
                  </Text>
                  <Avatar
                    src={poolItem.thumbnailUrl}
                    alt={poolItem.name}
                    size="sm"
                    radius="sm"
                    mt={2}
                  />
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Text size="sm" fw={500} tt="capitalize">
                      {poolItem.name}
                    </Text>
                    {note && (
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {note}
                      </Text>
                    )}
                  </Stack>
                  <Group gap={2} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      size="xs"
                      disabled={index === 0}
                      onClick={() =>
                        moveItem(index, "up")}
                    >
                      <IconArrowUp size={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      size="xs"
                      disabled={index === items.length - 1}
                      onClick={() =>
                        moveItem(index, "down")}
                    >
                      <IconArrowDown size={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="yellow"
                      size="xs"
                      onClick={() =>
                        removeFromWatchlist.mutate({
                          leagueId,
                          draftPoolItemId: item.draftPoolItemId,
                        })}
                    >
                      <IconStarFilled size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              );
            })}
          </Stack>
        )}
    </Card>
  );
}
