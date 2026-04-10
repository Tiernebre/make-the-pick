import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconStar, IconStarFilled } from "@tabler/icons-react";
import type { DraftPoolItem, DraftState } from "@make-the-pick/shared";
import { useMemo, useState } from "react";
import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";
import { PoolItemNoteIcon } from "./PoolItemNoteIcon";
import { usePoolItemNotes } from "./use-pool-item-notes";
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from "./use-watchlist";

const POKEMON_TYPE_COLORS: Record<string, string> = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

const ALL_POKEMON_TYPES = Object.keys(POKEMON_TYPE_COLORS);

function getStatTotal(item: DraftPoolItem): number | null {
  const stats = item.metadata?.baseStats;
  if (!stats) return null;
  return (
    stats.hp +
    stats.attack +
    stats.defense +
    stats.specialAttack +
    stats.specialDefense +
    stats.speed
  );
}

export interface AvailablePoolTableProps {
  leagueId: string;
  draftState: DraftState;
  isMyTurn: boolean;
  onPick: (poolItemId: string) => Promise<void>;
  isPicking: boolean;
}

export function AvailablePoolTable({
  leagueId,
  draftState,
  isMyTurn,
  onPick,
  isPicking,
}: AvailablePoolTableProps) {
  const [pendingItem, setPendingItem] = useState<DraftPoolItem | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const watchlist = useWatchlist(leagueId);
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const poolItemNotes = usePoolItemNotes(leagueId);

  const watchlistedIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of watchlist.data ?? []) {
      set.add(item.draftPoolItemId);
    }
    return set;
  }, [watchlist.data]);

  const notesByItemId = useMemo(() => {
    const map = new Map<string, string>();
    for (const note of poolItemNotes.data ?? []) {
      map.set(note.draftPoolItemId, note.content);
    }
    return map;
  }, [poolItemNotes.data]);

  const availableItems = useMemo(() => {
    const availableSet = new Set(draftState.availableItemIds);
    return draftState.poolItems.filter((item) => availableSet.has(item.id));
  }, [draftState.availableItemIds, draftState.poolItems]);

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

  const columns = useMemo<MRT_ColumnDef<DraftPoolItem>[]>(
    () => [
      {
        id: "draft",
        header: "",
        size: 90,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        Cell: ({ row }) =>
          isMyTurn
            ? (
              <Button
                size="xs"
                variant="light"
                onClick={() => handleClickItem(row.original)}
                aria-label={`Draft ${row.original.name}`}
              >
                Draft
              </Button>
            )
            : null,
      },
      {
        id: "watchlist",
        header: "",
        size: 44,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        Cell: ({ row }) => {
          const isWatchlisted = watchlistedIds.has(row.original.id);
          return (
            <ActionIcon
              variant="subtle"
              color={isWatchlisted ? "yellow" : "gray"}
              aria-label={isWatchlisted
                ? `Remove ${row.original.name} from watchlist`
                : `Add ${row.original.name} to watchlist`}
              onClick={() => {
                if (isWatchlisted) {
                  removeFromWatchlist.mutate({
                    leagueId,
                    draftPoolItemId: row.original.id,
                  });
                } else {
                  addToWatchlist.mutate({
                    leagueId,
                    draftPoolItemId: row.original.id,
                  });
                }
              }}
            >
              {isWatchlisted
                ? <IconStarFilled size={18} />
                : <IconStar size={18} />}
            </ActionIcon>
          );
        },
      },
      {
        id: "note",
        header: "",
        size: 44,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        Cell: ({ row }) => (
          <PoolItemNoteIcon
            leagueId={leagueId}
            draftPoolItemId={row.original.id}
            existingContent={notesByItemId.get(row.original.id)}
          />
        ),
      },
      {
        accessorKey: "thumbnailUrl",
        header: "",
        size: 56,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <Avatar
            src={row.original.thumbnailUrl}
            alt={row.original.name}
            size="md"
            radius="sm"
          />
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        Cell: ({ renderedCellValue }) => (
          <span style={{ fontWeight: 500, textTransform: "capitalize" }}>
            {renderedCellValue}
          </span>
        ),
      },
      {
        id: "types",
        accessorFn: (row) => row.metadata?.types?.join(", ") ?? "",
        header: "Type",
        filterVariant: "multi-select",
        mantineFilterMultiSelectProps: {
          data: ALL_POKEMON_TYPES.map((type) => ({
            value: type,
            label: type.charAt(0).toUpperCase() + type.slice(1),
          })),
        },
        filterFn: (row, _columnId, filterValues: string[]) => {
          if (!filterValues || filterValues.length === 0) return true;
          const types = row.original.metadata?.types ?? [];
          return filterValues.some((filter) => types.includes(filter));
        },
        Cell: ({ row }) =>
          row.original.metadata
            ? (
              <Group gap={4}>
                {row.original.metadata.types.map((type) => (
                  <Badge
                    key={type}
                    size="md"
                    variant="light"
                    color={POKEMON_TYPE_COLORS[type] ?? "gray"}
                    tt="capitalize"
                  >
                    {type}
                  </Badge>
                ))}
              </Group>
            )
            : null,
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.hp ?? null,
        id: "hp",
        header: "HP",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.attack ?? null,
        id: "attack",
        header: "Attack",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.defense ?? null,
        id: "defense",
        header: "Defense",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.specialAttack ?? null,
        id: "specialAttack",
        header: "Sp. Atk",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.specialDefense ?? null,
        id: "specialDefense",
        header: "Sp. Def",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.speed ?? null,
        id: "speed",
        header: "Speed",
        grow: false,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => getStatTotal(row),
        id: "total",
        header: "Total",
        grow: false,
        filterVariant: "range",
        Cell: ({ cell }) => (
          <span style={{ fontWeight: 600 }}>
            {cell.getValue<number | null>() ?? "—"}
          </span>
        ),
      },
    ],
    [
      watchlistedIds,
      notesByItemId,
      leagueId,
      addToWatchlist,
      removeFromWatchlist,
      isMyTurn,
    ],
  );

  const table = useMantineReactTable({
    columns,
    data: availableItems,
    layoutMode: "grid",
    enableColumnResizing: true,
    enableGlobalFilter: true,
    enableStickyHeader: true,
    enableDensityToggle: true,
    initialState: {
      density: "xs",
      showColumnFilters: false,
      showGlobalFilter: true,
      sorting: [{ id: "total", desc: true }],
    },
    enablePagination: false,
    mantineTableContainerProps: { style: { maxHeight: "640px" } },
  });

  return (
    <Card withBorder shadow="sm" padding="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={4}>Available Pool</Title>
          <Text size="xs" c="dimmed">
            {availableItems.length} available
          </Text>
        </Group>
        {!isMyTurn && (
          <Text size="sm" c="dimmed">
            Waiting for your turn. You can still browse the pool.
          </Text>
        )}
        <MantineReactTable table={table} />
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
