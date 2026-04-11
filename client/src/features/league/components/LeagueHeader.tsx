import {
  Badge,
  Box,
  Button,
  Flex,
  Group,
  Paper,
  Stack,
  Title,
} from "@mantine/core";
import { Link } from "wouter";
import { LifecycleStepper } from "../LifecycleStepper";

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

interface LeagueHeaderProps {
  league: {
    id: string;
    name: string;
    status: string;
    sportType?: string | null;
  };
  isCommissioner: boolean;
  nextStatus: string | null;
  setupPrerequisitesMet: boolean;
  onAdvanceClick: () => void;
}

export function LeagueHeader({
  league,
  isCommissioner,
  nextStatus,
  setupPrerequisitesMet,
  onAdvanceClick,
}: LeagueHeaderProps) {
  return (
    <Paper withBorder radius="md" p={{ base: "md", sm: "lg" }} mb="lg">
      <Flex
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        align={{ base: "stretch", sm: "flex-start" }}
        gap="md"
      >
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Title order={1} style={{ wordBreak: "break-word" }}>
            {league.name}
          </Title>
          {league.sportType && (
            <Group gap="xs">
              <Badge color="mint-green" variant="light" tt="capitalize">
                {league.sportType}
              </Badge>
            </Group>
          )}
          <Box mt="xs">
            <LifecycleStepper currentPhase={league.status} />
          </Box>
        </Stack>

        <Group gap="sm" wrap="wrap">
          {(league.status === "pooling" ||
            league.status === "scouting") && (
            <Button
              component={Link}
              href={`/leagues/${league.id}/draft/pool`}
              size="md"
              color={league.status === "pooling" ? "mint-green" : undefined}
              variant={league.status === "scouting" ? "light" : "filled"}
            >
              {league.status === "pooling"
                ? "Watch pool reveal"
                : "Scout the pool"}
            </Button>
          )}
          {league.status === "drafting" && (
            <>
              <Button
                component={Link}
                href={`/leagues/${league.id}/draft`}
                size="md"
              >
                Go to Draft
              </Button>
              <Button
                component={Link}
                href={`/leagues/${league.id}/draft/pool`}
                variant="light"
                size="md"
              >
                View Draft Pool
              </Button>
            </>
          )}
          {isCommissioner && nextStatus && setupPrerequisitesMet && (
            <Button onClick={onAdvanceClick} size="md">
              Advance to {capitalize(nextStatus)}
            </Button>
          )}
        </Group>
      </Flex>
    </Paper>
  );
}
