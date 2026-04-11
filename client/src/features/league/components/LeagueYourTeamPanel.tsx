import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { TrainerCard } from "../TrainerCard";

interface LeagueYourTeamPanelProps {
  leagueName: string;
  currentUserPlayer?: {
    name: string;
    image: string | null;
    role: string;
  } | null;
}

export function LeagueYourTeamPanel({
  leagueName,
  currentUserPlayer,
}: LeagueYourTeamPanelProps) {
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <IconSparkles
          size={18}
          color="var(--mantine-color-mint-green-6)"
        />
        <Title order={3}>Your team</Title>
      </Group>
      {currentUserPlayer
        ? (
          <TrainerCard
            name={currentUserPlayer.name}
            image={currentUserPlayer.image}
            role={currentUserPlayer.role}
            subtitle={leagueName}
          />
        )
        : (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text c="dimmed" size="sm">
              Join this league to see your trainer card here.
            </Text>
          </Card>
        )}
      <Text c="dimmed" size="xs" pl={4}>
        No picks yet. Your roster will slide in once the draft begins.
      </Text>
    </Stack>
  );
}
