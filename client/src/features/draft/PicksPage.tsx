import {
  Anchor,
  Avatar,
  Badge,
  Card,
  Container,
  Group,
  LoadingOverlay,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";
import { useMemo } from "react";
import { Link, useParams } from "wouter";
import type { DraftPoolItem } from "@make-the-pick/shared";
import { useLeague } from "../league/use-leagues";
import { AllRostersPanel } from "./AllRostersPanel";
import { useDraft } from "./use-draft";
import { roundForPick } from "./snake";

interface PickRow {
  id: string;
  pickNumber: number;
  round: number;
  playerName: string;
  pokemonName: string;
  types: string[];
  thumbnailUrl: string | null;
  autoPicked: boolean;
}

export function PicksPage() {
  const { id } = useParams<{ id: string }>();
  const leagueId = id!;
  const league = useLeague(leagueId);
  const draft = useDraft(leagueId);

  const isLoading = league.isLoading || draft.isLoading;
  const status = league.data?.status;
  const picksAvailable = status === "competing" || status === "complete";

  const draftState = draft.data;

  const poolItemsById = useMemo(() => {
    const map: Record<string, DraftPoolItem> = {};
    for (const item of draftState?.poolItems ?? []) {
      map[item.id] = item;
    }
    return map;
  }, [draftState]);

  const pickRows = useMemo<PickRow[]>(() => {
    if (!draftState) return [];
    const playerNameById = new Map(
      draftState.players.map((p) => [p.id, p.name]),
    );
    const playersCount = draftState.draft.pickOrder.length;
    return [...draftState.picks]
      .sort((a, b) => a.pickNumber - b.pickNumber)
      .map((pick) => {
        const item = poolItemsById[pick.poolItemId];
        return {
          id: pick.id,
          pickNumber: pick.pickNumber + 1,
          round: roundForPick(pick.pickNumber, playersCount) + 1,
          playerName: playerNameById.get(pick.leaguePlayerId) ?? "—",
          pokemonName: item?.name ?? "—",
          types: item?.metadata?.types ?? [],
          thumbnailUrl: item?.thumbnailUrl ?? null,
          autoPicked: pick.autoPicked,
        };
      });
  }, [draftState, poolItemsById]);

  const columns = useMemo<MRT_ColumnDef<PickRow>[]>(
    () => [
      {
        accessorKey: "pickNumber",
        header: "Pick",
        size: 70,
      },
      {
        accessorKey: "round",
        header: "Round",
        size: 80,
      },
      {
        accessorKey: "playerName",
        header: "Team",
      },
      {
        id: "pokemon",
        header: "Pokémon",
        accessorFn: (row) => row.pokemonName,
        Cell: ({ row }) => (
          <Group gap="xs" wrap="nowrap">
            <Avatar
              src={row.original.thumbnailUrl}
              alt={row.original.pokemonName}
              size="sm"
              radius="sm"
            />
            <Text size="sm" fw={500} tt="capitalize">
              {row.original.pokemonName}
            </Text>
          </Group>
        ),
      },
      {
        id: "types",
        header: "Types",
        accessorFn: (row) => row.types.join(", "),
        Cell: ({ row }) => (
          <Group gap={4}>
            {row.original.types.map((t) => (
              <Badge key={t} size="xs" variant="light" tt="capitalize">
                {t}
              </Badge>
            ))}
          </Group>
        ),
      },
      {
        accessorKey: "autoPicked",
        header: "Auto",
        size: 70,
        Cell: ({ row }) =>
          row.original.autoPicked
            ? (
              <Badge size="xs" color="orange" variant="light">
                AUTO
              </Badge>
            )
            : null,
      },
    ],
    [],
  );

  const table = useMantineReactTable({
    columns,
    data: pickRows,
    layoutMode: "grid",
    enableColumnResizing: true,
    enableGlobalFilter: true,
    enableStickyHeader: true,
    enableDensityToggle: true,
    initialState: {
      density: "xs",
      showGlobalFilter: true,
      sorting: [{ id: "pickNumber", desc: false }],
    },
    enablePagination: false,
    mantineTableContainerProps: { style: { maxHeight: "640px" } },
  });

  return (
    <Container size={1400} py="xl" pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Anchor
        component={Link}
        href={`/leagues/${leagueId}`}
        mb="md"
        display="block"
      >
        &larr; Back to League
      </Anchor>

      {league.data && (
        <Title order={1} mb="lg">
          {league.data.name} — Picks
        </Title>
      )}

      {!picksAvailable && !isLoading && (
        <Card withBorder shadow="sm" padding="lg" radius="md">
          <Stack gap="xs">
            <Title order={3}>No picks yet</Title>
            <Text c="dimmed">
              Picks will be available once the draft is complete.
            </Text>
          </Stack>
        </Card>
      )}

      {picksAvailable && draftState && (
        <Tabs defaultValue="all" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="all">All Picks</Tabs.Tab>
            <Tabs.Tab value="by-team">By Team</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="all" pt="md">
            <MantineReactTable table={table} />
          </Tabs.Panel>
          <Tabs.Panel value="by-team" pt="md">
            <AllRostersPanel
              draftState={draftState}
              poolItemsById={poolItemsById}
            />
          </Tabs.Panel>
        </Tabs>
      )}
    </Container>
  );
}
