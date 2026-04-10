import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCircleCheck,
  IconPlus,
  IconSparkles,
  IconTicket,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { Link } from "wouter";
import { useSession } from "../../auth";
import { JoinLeagueModal } from "./JoinLeagueModal";
import { useLeagues } from "./use-leagues";

type LeagueRow = NonNullable<ReturnType<typeof useLeagues>["data"]>[number];

interface NextAction {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

function computeNextAction(
  leagues: LeagueRow[],
  userName: string,
): NextAction {
  const drafting = leagues.find((l) => l.status === "drafting");
  if (drafting) {
    return {
      title: `You're drafting in ${drafting.name}`,
      body: "Jump in — every pick counts.",
      ctaLabel: "Go to draft",
      ctaHref: `/leagues/${drafting.id}/draft`,
    };
  }

  const setup = leagues.find((l) => l.status === "setup");
  if (setup) {
    return {
      title: `${setup.name} is still in setup`,
      body:
        "Finish configuring the league and advance to drafting when you're ready.",
      ctaLabel: "Open league",
      ctaHref: `/leagues/${setup.id}`,
    };
  }

  const competing = leagues.find((l) => l.status === "competing");
  if (competing) {
    return {
      title: `${competing.name} season in progress`,
      body: "Check in on the standings.",
      ctaLabel: "View league",
      ctaHref: `/leagues/${competing.id}`,
    };
  }

  return {
    title: `Start your first league, ${userName.split(" ")[0]}`,
    body:
      "Gather your friends, pick a format, and get drafting. Your adventure starts here.",
    ctaLabel: "Create a league",
    ctaHref: "/leagues/new",
  };
}

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
  const nextAction = useMemo(
    () => computeNextAction(data, userName),
    [data, userName],
  );

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={1}>Welcome back, {userName.split(" ")[0]}</Title>
      </Group>

      <Paper
        data-testid="next-action-banner"
        withBorder
        radius="md"
        p="lg"
        mb="xl"
        style={{
          background:
            "linear-gradient(135deg, var(--mantine-color-mint-green-0), var(--mantine-color-body))",
        }}
      >
        <Group justify="space-between" wrap="wrap" align="center">
          <Group gap="md" wrap="nowrap" align="flex-start">
            <Box c="mint-green" mt={4}>
              <IconSparkles size={28} />
            </Box>
            <Stack gap={2}>
              <Text size="sm" c="dimmed" fw={500} tt="uppercase">
                Next up
              </Text>
              <Title order={3}>{nextAction.title}</Title>
              <Text c="dimmed">{nextAction.body}</Text>
            </Stack>
          </Group>
          <Button
            component={Link}
            href={nextAction.ctaHref}
            size="md"
          >
            {nextAction.ctaLabel}
          </Button>
        </Group>
      </Paper>

      <Group justify="space-between" mb="sm">
        <Title order={3}>Your active leagues</Title>
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
          <ScrollArea type="auto" mb="xl" data-testid="active-leagues-strip">
            <Group gap="md" wrap="nowrap" pb="sm">
              {data.map((league) => (
                <Card
                  key={league.id}
                  component={Link}
                  href={`/leagues/${league.id}`}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  miw={260}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text fw={600} truncate>{league.name}</Text>
                      <Badge
                        size="sm"
                        variant="light"
                        color={STATUS_COLOR[league.status] ?? "gray"}
                        tt="capitalize"
                      >
                        {league.status}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" tt="capitalize">
                      {league.userRole ?? "member"} ·{" "}
                      {league.playerCount ?? 0}/{league.maxPlayers ?? "—"}{" "}
                      players
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Group>
          </ScrollArea>
        )}

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="sm">Recent activity</Title>
            <Stack gap="xs">
              <Group gap="xs">
                <IconCircleCheck
                  size={16}
                  color="var(--mantine-color-mint-green-6)"
                />
                <Text size="sm" c="dimmed">
                  Activity feed will light up here once your leagues get
                  rolling.
                </Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="sm">Quick actions</Title>
            <Stack gap="sm">
              <Button
                component={Link}
                href="/leagues/new"
                leftSection={<IconPlus size={16} />}
                fullWidth
              >
                Create League
              </Button>
              <Button
                variant="outline"
                leftSection={<IconTicket size={16} />}
                onClick={joinHandlers.open}
                fullWidth
              >
                Join by invite code
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      <JoinLeagueModal opened={joinOpened} onClose={joinHandlers.close} />
    </Container>
  );
}
