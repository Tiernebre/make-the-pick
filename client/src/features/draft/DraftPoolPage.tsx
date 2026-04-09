import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Container,
  Grid,
  Group,
  LoadingOverlay,
  Title,
} from "@mantine/core";
import { WatchlistPanel } from "./WatchlistPanel";
import { PoolItemNoteIcon } from "./PoolItemNoteIcon";
import { IconStar, IconStarFilled } from "@tabler/icons-react";
import type { DraftPoolItem } from "@make-the-pick/shared";
import { Link, useParams } from "wouter";
import { useLeague } from "../league/use-leagues";
import { useDraftPool } from "./use-draft";
import { usePoolItemNotes } from "./use-pool-item-notes";
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from "./use-watchlist";
import { useMemo } from "react";
import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";

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

const ALL_POKEMON_TYPES = Object.keys(POKEMON_TYPE_COLORS);

export function DraftPoolPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);
  const draftPool = useDraftPool(id!);
  const watchlist = useWatchlist(id!);
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const poolItemNotes = usePoolItemNotes(id!);

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

  const isLoading = league.isLoading || draftPool.isLoading;

  const columns = useMemo<MRT_ColumnDef<DraftPoolItem>[]>(
    () => [
      {
        id: "watchlist",
        header: "",
        size: 50,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        Cell: ({ row }) => {
          const isWatchlisted = watchlistedIds.has(row.original.id);
          return (
            <ActionIcon
              variant="subtle"
              color={isWatchlisted ? "yellow" : "gray"}
              onClick={() => {
                if (isWatchlisted) {
                  removeFromWatchlist.mutate({
                    leagueId: id!,
                    draftPoolItemId: row.original.id,
                  });
                } else {
                  addToWatchlist.mutate({
                    leagueId: id!,
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
        size: 50,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        Cell: ({ row }) => (
          <PoolItemNoteIcon
            leagueId={id!}
            draftPoolItemId={row.original.id}
            existingContent={notesByItemId.get(row.original.id)}
          />
        ),
      },
      {
        accessorKey: "thumbnailUrl",
        header: "",
        size: 60,
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
    [watchlistedIds, notesByItemId, id, addToWatchlist, removeFromWatchlist],
  );

  const table = useMantineReactTable({
    columns,
    data: draftPool.data?.items ?? [],
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
    state: {
      isLoading,
    },
  });

  return (
    <Container size={1800} py="xl" pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Anchor
        component={Link}
        href={`/leagues/${id}`}
        mb="md"
        display="block"
      >
        &larr; Back to League
      </Anchor>

      {league.data && (
        <>
          <Title order={1} mb="lg">
            {league.data.name} — Draft Pool
          </Title>

          <Grid>
            <Grid.Col span={{ base: 12, lg: 9 }}>
              <MantineReactTable table={table} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, lg: 3 }}>
              <WatchlistPanel
                leagueId={id!}
                poolItems={draftPool.data?.items ?? []}
              />
            </Grid.Col>
          </Grid>
        </>
      )}
    </Container>
  );
}
