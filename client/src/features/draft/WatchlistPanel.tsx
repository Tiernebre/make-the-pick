import {
  ActionIcon,
  Avatar,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconGripVertical, IconStarFilled } from "@tabler/icons-react";
import type { DraftPoolItem, WatchlistItem } from "@make-the-pick/shared";
import { useMemo } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePoolItemNotes } from "./use-pool-item-notes";
import {
  useRemoveFromWatchlist,
  useReorderWatchlist,
  useWatchlist,
} from "./use-watchlist";

interface SortableWatchlistItemProps {
  item: WatchlistItem;
  index: number;
  poolItem: DraftPoolItem;
  note: string | undefined;
  leagueId: string;
  onRemove: (draftPoolItemId: string) => void;
  onQuickDraft?: (draftPoolItemId: string) => void;
  quickDraftDisabled?: boolean;
  isPicking?: boolean;
}

function SortableWatchlistItem({
  item,
  index,
  poolItem,
  note,
  onRemove,
  onQuickDraft,
  quickDraftDisabled,
  isPicking,
}: SortableWatchlistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Group
      ref={setNodeRef}
      style={style}
      gap="xs"
      wrap="nowrap"
      align="flex-start"
    >
      <ActionIcon
        variant="subtle"
        size="xs"
        style={{ cursor: "grab" }}
        mt={2}
        {...attributes}
        {...listeners}
      >
        <IconGripVertical size={14} />
      </ActionIcon>
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
      {onQuickDraft && (
        <Button
          size="compact-xs"
          variant="filled"
          color="blue"
          disabled={quickDraftDisabled}
          loading={isPicking}
          onClick={() => onQuickDraft(item.draftPoolItemId)}
        >
          Draft
        </Button>
      )}
      <ActionIcon
        variant="subtle"
        color="yellow"
        size="xs"
        onClick={() => onRemove(item.draftPoolItemId)}
      >
        <IconStarFilled size={14} />
      </ActionIcon>
    </Group>
  );
}

interface WatchlistPanelProps {
  leagueId: string;
  poolItems: DraftPoolItem[];
  /** Title shown at the top of the panel. Defaults to "Watchlist". */
  title?: string;
  /** Hint text shown when the list is empty. */
  emptyMessage?: string;
  /**
   * When provided, renders a quick-draft button on each row that calls
   * `onQuickDraft` with the pool item id. Use to turn the panel into a
   * draftable queue during a live draft.
   */
  onQuickDraft?: (poolItemId: string) => void | Promise<void>;
  /** Whether quick-draft buttons should be enabled (true on the user's turn). */
  quickDraftEnabled?: boolean;
  /** Whether a pick is currently in flight (renders the button as loading). */
  isPicking?: boolean;
}

export function WatchlistPanel({
  leagueId,
  poolItems,
  title = "Watchlist",
  emptyMessage =
    "Click the star icon on any player to add them to your watchlist.",
  onQuickDraft,
  quickDraftEnabled = false,
  isPicking = false,
}: WatchlistPanelProps) {
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    reorderWatchlist.mutate({
      leagueId,
      itemIds: reordered.map((item) => item.id),
    });
  }

  function handleRemove(draftPoolItemId: string) {
    removeFromWatchlist.mutate({ leagueId, draftPoolItemId });
  }

  return (
    <Card withBorder p="md">
      <Title order={4} mb="sm">
        {title} ({items.length})
      </Title>
      {items.length === 0
        ? (
          <Text size="sm" c="dimmed">
            {emptyMessage}
          </Text>
        )
        : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack gap="xs">
                {items.map((item: WatchlistItem, index: number) => {
                  const poolItem = poolItemMap.get(item.draftPoolItemId);
                  if (!poolItem) return null;

                  const note = notesByItemId.get(item.draftPoolItemId);

                  return (
                    <SortableWatchlistItem
                      key={item.id}
                      item={item}
                      index={index}
                      poolItem={poolItem}
                      note={note}
                      leagueId={leagueId}
                      onRemove={handleRemove}
                      onQuickDraft={onQuickDraft
                        ? (id) => {
                          void onQuickDraft(id);
                        }
                        : undefined}
                      quickDraftDisabled={!quickDraftEnabled}
                      isPicking={isPicking}
                    />
                  );
                })}
              </Stack>
            </SortableContext>
          </DndContext>
        )}
    </Card>
  );
}
