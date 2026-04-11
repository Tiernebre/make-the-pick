import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { Link } from "wouter";

interface LeagueRulesCardProps {
  leagueId: string;
  leagueStatus: string;
  sportType?: string | null;
  maxPlayers?: number | null;
  rulesConfig: unknown;
  gameVersionName?: string;
  isCommissioner: boolean;
}

export function LeagueRulesCard({
  leagueId,
  leagueStatus,
  sportType,
  maxPlayers,
  rulesConfig,
  gameVersionName,
  isCommissioner,
}: LeagueRulesCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Title order={4}>Rules</Title>
        <Button
          component={Link}
          href={`/leagues/${leagueId}/settings`}
          size="xs"
          variant="subtle"
          leftSection={<IconSettings size={14} />}
        >
          {isCommissioner && leagueStatus === "setup" ? "Configure" : "View"}
        </Button>
      </Group>
      {(() => {
        if (!rulesConfig || typeof rulesConfig !== "object") {
          return (
            <Text size="sm" c="dimmed">
              Not configured yet.
            </Text>
          );
        }
        const rules = rulesConfig as {
          draftFormat?: string;
          numberOfRounds?: number;
          pickTimeLimitSeconds?: number | null;
          poolSizeMultiplier?: number;
          gameVersion?: string;
          excludeLegendaries?: boolean;
          excludeStarters?: boolean;
          excludeTradeEvolutions?: boolean;
        };
        const exclusions = [
          rules.excludeLegendaries && "Legendaries",
          rules.excludeStarters && "Starters",
          rules.excludeTradeEvolutions && "Trade evolutions",
        ].filter((v): v is string => typeof v === "string");
        return (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Format</Text>
              <Text size="sm" tt="capitalize">
                {rules.draftFormat ?? "—"}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Rounds</Text>
              <Text size="sm">{rules.numberOfRounds ?? "—"}</Text>
            </Group>
            {maxPlayers && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Max players</Text>
                <Text size="sm">{maxPlayers}</Text>
              </Group>
            )}
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Pick timer</Text>
              <Text size="sm">
                {rules.pickTimeLimitSeconds
                  ? `${rules.pickTimeLimitSeconds}s`
                  : "No limit"}
              </Text>
            </Group>
            {sportType === "pokemon" && (
              <>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Game version</Text>
                  <Text size="sm">
                    {gameVersionName ?? "All Pokemon"}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Pool multiplier</Text>
                  <Text size="sm">
                    {rules.poolSizeMultiplier ?? 2}x
                  </Text>
                </Group>
                <Group
                  justify="space-between"
                  align="flex-start"
                  wrap="nowrap"
                >
                  <Text size="sm" c="dimmed">Exclusions</Text>
                  <Text size="sm" ta="right">
                    {exclusions.length > 0 ? exclusions.join(", ") : "None"}
                  </Text>
                </Group>
              </>
            )}
          </Stack>
        );
      })()}
    </Card>
  );
}
