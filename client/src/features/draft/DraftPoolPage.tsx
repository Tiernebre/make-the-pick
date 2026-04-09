import {
  Anchor,
  Avatar,
  Badge,
  Container,
  Group,
  LoadingOverlay,
  Title,
} from "@mantine/core";
import type { DraftPoolItem } from "@make-the-pick/shared";
import { Link, useParams } from "wouter";
import { useLeague } from "../league/use-leagues";
import { useDraftPool } from "./use-draft";
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

  const isLoading = league.isLoading || draftPool.isLoading;

  const columns = useMemo<MRT_ColumnDef<DraftPoolItem>[]>(
    () => [
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
        size: 80,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.attack ?? null,
        id: "attack",
        header: "Attack",
        size: 80,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.defense ?? null,
        id: "defense",
        header: "Defense",
        size: 80,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.specialAttack ?? null,
        id: "specialAttack",
        header: "Sp. Atk",
        size: 80,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.specialDefense ?? null,
        id: "specialDefense",
        header: "Sp. Def",
        size: 80,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.speed ?? null,
        id: "speed",
        header: "Speed",
        size: 80,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => getStatTotal(row),
        id: "total",
        header: "Total",
        size: 80,
        filterVariant: "range",
        Cell: ({ cell }) => (
          <span style={{ fontWeight: 600 }}>
            {cell.getValue<number | null>() ?? "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useMantineReactTable({
    columns,
    data: draftPool.data?.items ?? [],
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
    <Container size="xl" py="xl" pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Anchor
        component={Link}
        href={`/leagues/${id}/draft`}
        mb="md"
        display="block"
      >
        &larr; Back to Draft
      </Anchor>

      {league.data && (
        <>
          <Title order={1} mb="lg">
            {league.data.name} — Draft Pool
          </Title>

          <Title order={3} mb="sm">
            {draftPool.data?.items.length ?? 0} Pokémon
          </Title>

          <MantineReactTable table={table} />
        </>
      )}
    </Container>
  );
}
