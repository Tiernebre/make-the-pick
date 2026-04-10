import {
  Button,
  Card,
  Container,
  Group,
  LoadingOverlay,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, useLocation } from "wouter";
import { useLeagues } from "./use-leagues";
import { JoinLeagueModal } from "./JoinLeagueModal";

export function LeagueListPage() {
  const leagues = useLeagues();
  const [, navigate] = useLocation();
  const [joinOpened, joinHandlers] = useDisclosure(false);

  return (
    <Container size="sm" py="xl" pos="relative">
      <LoadingOverlay visible={leagues.isLoading} />
      <Group justify="space-between" mb="lg">
        <Title order={1}>My Leagues</Title>
        <Group>
          <Button component={Link} href="/leagues/new">Create League</Button>
          <Button variant="outline" onClick={joinHandlers.open}>
            Join League
          </Button>
        </Group>
      </Group>

      {!leagues.isLoading && leagues.data?.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          You haven't joined any leagues yet.
        </Text>
      )}

      <Stack>
        {leagues.data?.map((league) => (
          <Card
            key={league.id}
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/leagues/${league.id}`)}
          >
            <Text fw={500}>{league.name}</Text>
            <Text size="sm" c="dimmed">
              Status: {league.status}
            </Text>
          </Card>
        ))}
      </Stack>

      <JoinLeagueModal opened={joinOpened} onClose={joinHandlers.close} />
    </Container>
  );
}
