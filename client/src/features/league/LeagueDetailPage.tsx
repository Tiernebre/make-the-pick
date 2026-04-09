import {
  ActionIcon,
  Anchor,
  Badge,
  Card,
  Container,
  CopyButton,
  Group,
  LoadingOverlay,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { Link, useParams } from "wouter";
import { useLeague } from "./use-leagues";

export function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);

  return (
    <Container size="sm" py="xl" pos="relative">
      <LoadingOverlay visible={league.isLoading} />

      <Anchor component={Link} href="/" mb="md" display="block">
        &larr; Back to Leagues
      </Anchor>

      {league.data && (
        <>
          <Title order={1} mb="lg">
            {league.data.name}
          </Title>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group mb="sm">
              <Text fw={500}>Status</Text>
              <Badge variant="light">{league.data.status}</Badge>
            </Group>

            <Group mb="sm">
              <Text fw={500}>Invite Code</Text>
              <Group gap="xs">
                <Text ff="monospace">{league.data.inviteCode}</Text>
                <CopyButton value={league.data.inviteCode}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "Copied" : "Copy"}>
                      <ActionIcon
                        variant="subtle"
                        color={copied ? "teal" : "gray"}
                        onClick={copy}
                      >
                        {copied ? "✓" : "⎘"}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Group>

            <Group>
              <Text fw={500}>Created</Text>
              <Text c="dimmed">
                {new Date(league.data.createdAt).toLocaleDateString()}
              </Text>
            </Group>
          </Card>
        </>
      )}
    </Container>
  );
}
