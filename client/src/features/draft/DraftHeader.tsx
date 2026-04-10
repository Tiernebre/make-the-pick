import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import type { DraftState } from "@make-the-pick/shared";
import { roundForPick } from "./snake.ts";

export interface DraftHeaderProps {
  draftState: DraftState;
  totalRounds: number;
  currentTurnPlayerName: string | null;
}

export function DraftHeader(
  { draftState, totalRounds, currentTurnPlayerName }: DraftHeaderProps,
) {
  const playersCount = draftState.draft.pickOrder.length;
  const totalPicks = playersCount * totalRounds;
  const currentPick = draftState.draft.currentPick;
  const currentRound = roundForPick(currentPick, playersCount);
  const displayRound = Math.min(currentRound + 1, totalRounds);
  const displayPick = Math.min(currentPick + 1, totalPicks);
  const format = draftState.draft.format;
  const status = draftState.draft.status;

  return (
    <Card withBorder shadow="sm" padding="md" radius="md">
      <Group justify="space-between" wrap="wrap" gap="md">
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Round
          </Text>
          <Text fw={600}>
            Round {displayRound} of {totalRounds}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Pick
          </Text>
          <Text fw={600}>
            Pick {displayPick} of {totalPicks}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Format
          </Text>
          <Badge variant="light" tt="capitalize">{format}</Badge>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase">
            On the clock
          </Text>
          <Title order={4}>
            {currentTurnPlayerName ?? "—"}
          </Title>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase">
            Status
          </Text>
          <Badge variant="outline">{status}</Badge>
        </Stack>
      </Group>
    </Card>
  );
}
