import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconTicket } from "@tabler/icons-react";
import { useMemo } from "react";
import { Link } from "wouter";
import { useSession } from "../../auth";
import { JoinLeagueModal } from "./JoinLeagueModal";
import { useLeagues } from "./use-leagues";

const STATUS_COLOR: Record<string, string> = {
  setup: "gray",
  drafting: "mint-green",
  competing: "blue",
  complete: "grape",
};

export function HomeDashboard() {
  const { data: session } = useSession();
  const leagues = useLeagues();
  const [joinOpened, joinHandlers] = useDisclosure(false);

  const userName = session?.user?.name ?? "Trainer";
  const data = useMemo(() => leagues.data ?? [], [leagues.data]);

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={1}>Welcome back, {userName.split(" ")[0]}</Title>
      </Group>

      <Group justify="space-between" mb="sm">
        <Title order={3}>Your leagues</Title>
        <Button
          component={Link}
          href="/leagues"
          variant="subtle"
          size="xs"
        >
          Browse all leagues
        </Button>
      </Group>

      {data.length === 0
        ? (
          <Paper withBorder radius="md" p="lg" mb="xl">
            <Text c="dimmed" ta="center">
              You haven't joined any leagues yet.
            </Text>
          </Paper>
        )
        : (
          <Paper withBorder radius="md" mb="xl">
            <Table
              aria-label="Your leagues"
              highlightOnHover
              verticalSpacing="sm"
              horizontalSpacing="md"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>League</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Players</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.map((league) => (
                  <Table.Tr key={league.id}>
                    <Table.Td>
                      <Text
                        component={Link}
                        href={`/leagues/${league.id}`}
                        fw={600}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        {league.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={STATUS_COLOR[league.status] ?? "gray"}
                        tt="capitalize"
                      >
                        {league.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" tt="capitalize">
                        {league.userRole ?? "member"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {league.playerCount ?? 0}/{league.maxPlayers ?? "—"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="sm">Quick actions</Title>
        <Stack gap="sm">
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
            Join by invite code
          </Button>
        </Stack>
      </Card>

      <JoinLeagueModal opened={joinOpened} onClose={joinHandlers.close} />
    </Container>
  );
}
