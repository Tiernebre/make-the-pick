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

export function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);
  const draftPool = useDraftPool(id!);

  const isLoading = league.isLoading || draftPool.isLoading;

  const columns = useMemo<MRT_ColumnDef<DraftPoolItem>[]>(
    () => [
      {
        accessorKey: "thumbnailUrl",
        header: "",
        size: 70,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
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
        size: 180,
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
        size: 200,
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
        size: 120,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.attack ?? null,
        id: "attack",
        header: "ATK",
        size: 120,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.defense ?? null,
        id: "defense",
        header: "DEF",
        size: 120,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.specialAttack ?? null,
        id: "specialAttack",
        header: "SPA",
        size: 120,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.specialDefense ?? null,
        id: "specialDefense",
        header: "SPD",
        size: 120,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => row.metadata?.baseStats?.speed ?? null,
        id: "speed",
        header: "SPE",
        size: 120,
        filterVariant: "range",
      },
      {
        accessorFn: (row) => getStatTotal(row),
        id: "total",
        header: "Total",
        size: 120,
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
    enablePagination: false,
    initialState: {
      density: "xs",
      showColumnFilters: false,
      showGlobalFilter: true,
      sorting: [{ id: "total", desc: true }],
    },
    mantineTableContainerProps: { style: { maxHeight: "80vh" } },
    mantineTableProps: {
      striped: true,
      highlightOnHover: true,
      withColumnBorders: true,
    },
    state: {
      isLoading,
    },
  });

  return (
    <Container fluid px="xl" py="xl" pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Anchor component={Link} href={`/leagues/${id}`} mb="md" display="block">
        &larr; Back to League
      </Anchor>

      {league.data && (
        <>
          <Title order={1} mb="lg">
            {league.data.name} — Draft
          </Title>

          <Title order={3} mb="sm">
            Draft Pool ({draftPool.data?.items.length ?? 0} items)
          </Title>

          <MantineReactTable table={table} />
        </>
      )}
    </Container>
  );
}
