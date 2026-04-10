import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronRight,
  IconCircleCheck,
  IconPlus,
  IconTicket,
  IconTrophy,
} from "@tabler/icons-react";
import { Link } from "wouter";
import { useSession } from "../../auth";
import { JoinLeagueModal } from "./JoinLeagueModal";

export function HomeDashboard() {
  const { data: session } = useSession();
  const [joinOpened, joinHandlers] = useDisclosure(false);

  const userName = session?.user?.name ?? "Trainer";

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={1}>Welcome back, {userName.split(" ")[0]}</Title>
      </Group>

      <Paper
        component={Link}
        href="/leagues"
        data-testid="leagues-banner"
        withBorder
        radius="md"
        p="lg"
        mb="xl"
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
        }}
      >
        <Group justify="space-between" wrap="nowrap" align="center">
          <Group gap="md" wrap="nowrap" align="center">
            <Box c="mint-green">
              <IconTrophy size={28} />
            </Box>
            <Stack gap={2}>
              <Title order={3}>Your leagues</Title>
              <Text c="dimmed" size="sm">
                Browse every league you've joined or commissioned.
              </Text>
            </Stack>
          </Group>
          <IconChevronRight size={24} />
        </Group>
      </Paper>

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
