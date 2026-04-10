import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  LoadingOverlay,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconTicket, IconTrophy } from "@tabler/icons-react";
import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";
import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { JoinLeagueModal } from "./JoinLeagueModal";
import { useLeagues } from "./use-leagues";

type LeagueRow = NonNullable<ReturnType<typeof useLeagues>["data"]>[number];

const STATUS_COLOR: Record<string, string> = {
  setup: "gray",
  drafting: "mint-green",
  competing: "blue",
  complete: "grape",
};

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function nextActionFor(league: LeagueRow): string {
  switch (league.status) {
    case "setup":
      return "Waiting to start";
    case "drafting":
      return "Draft in progress";
    case "competing":
      return "Season active";
    case "complete":
      return "Season complete";
    default:
      return "";
  }
}

export function LeagueListPage() {
  const leagues = useLeagues();
  const [, navigate] = useLocation();
  const [joinOpened, joinHandlers] = useDisclosure(false);

  const data = useMemo(() => leagues.data ?? [], [leagues.data]);

  const columns = useMemo<MRT_ColumnDef<LeagueRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        Cell: ({ row }) => (
          <Text fw={600} size="sm">
            {row.original.name}
          </Text>
        ),
      },
      {
        accessorKey: "sportType",
        header: "Game",
        Cell: ({ row }) => (
          <Text size="sm" c="dimmed" tt="capitalize">
            {row.original.sportType ?? "—"}
          </Text>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ row }) => (
          <Badge
            color={STATUS_COLOR[row.original.status] ?? "gray"}
            variant="light"
            tt="capitalize"
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "players",
        header: "Players",
        accessorFn: (row) =>
          `${row.playerCount ?? 0} / ${row.maxPlayers ?? "—"}`,
        Cell: ({ row }) => (
          <Text size="sm">
            {row.original.playerCount ?? 0} / {row.original.maxPlayers ?? "—"}
          </Text>
        ),
      },
      {
        accessorKey: "userRole",
        header: "Your role",
        Cell: ({ row }) => (
          <Text size="sm" tt="capitalize">
            {row.original.userRole ?? "member"}
          </Text>
        ),
      },
      {
        id: "nextAction",
        header: "Next action",
        accessorFn: (row) => nextActionFor(row),
        Cell: ({ row }) => (
          <Text size="sm" c="dimmed">
            {nextActionFor(row.original)}
          </Text>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        Cell: ({ row }) => (
          <Text size="sm" c="dimmed">
            {formatRelativeDate(String(row.original.createdAt))}
          </Text>
        ),
      },
    ],
    [],
  );

  const table = useMantineReactTable({
    columns,
    data,
    enableColumnResizing: false,
    enablePagination: false,
    enableTopToolbar: true,
    enableBottomToolbar: false,
    enableColumnActions: false,
    enableDensityToggle: false,
    enableHiding: false,
    enableFullScreenToggle: false,
    enableGlobalFilter: true,
    initialState: {
      density: "xs",
      showGlobalFilter: true,
    },
    state: {
      isLoading: leagues.isLoading,
    },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => navigate(`/leagues/${row.original.id}`),
      style: { cursor: "pointer" },
    }),
  });

  const isEmpty = !leagues.isLoading && data.length === 0;

  return (
    <Container size="lg" py="xl" pos="relative">
      <LoadingOverlay visible={leagues.isLoading} />
      <Group justify="space-between" mb="lg">
        <Title order={1}>My Leagues</Title>
        <Group>
          <Button
            component={Link}
            href="/leagues/new"
            leftSection={<IconPlus size={16} />}
          >
            Create League
          </Button>
          <Button
            variant="outline"
            leftSection={<IconTicket size={16} />}
            onClick={joinHandlers.open}
          >
            Join League
          </Button>
        </Group>
      </Group>

      {isEmpty
        ? (
          <Paper p="xl" radius="md" withBorder ta="center">
            <Stack align="center" gap="xs">
              <Box c="mint-green">
                <IconTrophy size={42} />
              </Box>
              <Title order={3}>No leagues yet</Title>
              <Text c="dimmed" maw={420}>
                Your adventure starts here. Create a league to invite friends,
                or join one with an invite code.
              </Text>
              <Group mt="sm">
                <Button component={Link} href="/leagues/new">
                  Create your first league
                </Button>
                <Button variant="outline" onClick={joinHandlers.open}>
                  Join with invite code
                </Button>
              </Group>
            </Stack>
          </Paper>
        )
        : <MantineReactTable table={table} />}

      <JoinLeagueModal opened={joinOpened} onClose={joinHandlers.close} />
    </Container>
  );
}
