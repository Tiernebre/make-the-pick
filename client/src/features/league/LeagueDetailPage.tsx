import {
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  CopyButton,
  Grid,
  Group,
  Loader,
  LoadingOverlay,
  Menu,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconSettings,
  IconSparkles,
} from "@tabler/icons-react";
import { parseNpcStrategy } from "@make-the-pick/shared";
import { useMemo } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useSession } from "../../auth";
import { AllRostersPanel } from "../draft/AllRostersPanel";
import { useDraft } from "../draft/use-draft";
import { LifecycleStepper } from "./LifecycleStepper";
import { TrainerCard } from "./TrainerCard";
import {
  useAddNpcPlayer,
  useAdvanceLeagueStatus,
  useAvailableNpcs,
  useDeleteLeague,
  useLeague,
  useLeaguePlayers,
} from "./use-leagues";

const NEXT_STATUS: Record<string, string | null> = {
  setup: "pooling",
  pooling: "scouting",
  scouting: "drafting",
  drafting: "competing",
  competing: "complete",
  complete: null,
};

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);
  const players = useLeaguePlayers(id!);
  const draft = useDraft(id!, {
    enabled: league.data?.status === "competing",
  });
  const { data: session } = useSession();
  const deleteLeague = useDeleteLeague();
  const advanceStatus = useAdvanceLeagueStatus();
  const addNpcPlayer = useAddNpcPlayer();
  const [, navigate] = useLocation();

  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [advanceOpened, { open: openAdvance, close: closeAdvance }] =
    useDisclosure(false);
  const [chooseNpcOpened, { open: openChooseNpc, close: closeChooseNpc }] =
    useDisclosure(false);
  const availableNpcs = useAvailableNpcs(id!, chooseNpcOpened);

  const isCommissioner = players.data?.some(
    (p) => p.userId === session?.user?.id && p.role === "commissioner",
  );

  const nextStatus = league.data ? NEXT_STATUS[league.data.status] : null;

  const persistedSettingsValid = (() => {
    if (!league.data?.sportType || !league.data?.rulesConfig) return false;
    if (!league.data.maxPlayers || league.data.maxPlayers < 2) return false;
    const rules = league.data.rulesConfig as {
      draftFormat?: string;
      numberOfRounds?: number;
    };
    return !!rules.draftFormat && !!rules.numberOfRounds &&
      rules.numberOfRounds >= 1;
  })();

  const setupPrerequisitesMet = league.data?.status !== "setup" ||
    persistedSettingsValid;

  const handleDelete = () => {
    deleteLeague.mutate(
      { id: id! },
      { onSuccess: () => navigate("/leagues") },
    );
  };

  const handleAdvance = () => {
    advanceStatus.mutate(
      { leagueId: id! },
      { onSuccess: () => closeAdvance() },
    );
  };

  const currentUserPlayer = players.data?.find(
    (p) => p.userId === session?.user?.id,
  );

  const poolItemsById = useMemo(() => {
    const map: Record<
      string,
      NonNullable<typeof draft.data>["poolItems"][number]
    > = {};
    for (const item of draft.data?.poolItems ?? []) {
      map[item.id] = item;
    }
    return map;
  }, [draft.data]);

  return (
    <Container size="lg" py="xl" pos="relative">
      <LoadingOverlay visible={league.isLoading} />

      <Anchor component={Link} href="/leagues" mb="md" display="block">
        &larr; Back to Leagues
      </Anchor>

      {league.data && (
        <>
          <Paper withBorder radius="md" p="lg" mb="lg">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Stack gap="xs" style={{ flex: 1, minWidth: 260 }}>
                <Title order={1}>{league.data.name}</Title>
                {league.data.sportType && (
                  <Group gap="xs">
                    <Badge color="mint-green" variant="light" tt="capitalize">
                      {league.data.sportType}
                    </Badge>
                  </Group>
                )}
                <Box mt="xs">
                  <LifecycleStepper currentPhase={league.data.status} />
                </Box>
              </Stack>

              <Group gap="sm">
                {league.data.status === "drafting" && (
                  <>
                    <Button
                      component={Link}
                      href={`/leagues/${league.data.id}/draft`}
                      size="md"
                    >
                      Go to Draft
                    </Button>
                    <Button
                      component={Link}
                      href={`/leagues/${league.data.id}/draft/pool`}
                      variant="light"
                      size="md"
                    >
                      View Draft Pool
                    </Button>
                  </>
                )}
                {isCommissioner && nextStatus && setupPrerequisitesMet && (
                  <Button
                    onClick={() => {
                      advanceStatus.reset();
                      openAdvance();
                    }}
                    size="md"
                  >
                    Advance to {capitalize(nextStatus)}
                  </Button>
                )}
              </Group>
            </Group>
          </Paper>

          <Grid gutter="lg">
            {/* Left column (~2/3) */}
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Stack gap="lg">
                {/* Your team panel */}
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
                        subtitle={league.data.name}
                      />
                    )
                    : (
                      <Card
                        shadow="sm"
                        padding="lg"
                        radius="md"
                        withBorder
                      >
                        <Text c="dimmed" size="sm">
                          Join this league to see your trainer card here.
                        </Text>
                      </Card>
                    )}
                  <Text c="dimmed" size="xs" pl={4}>
                    No picks yet. Your roster will slide in once the draft
                    begins.
                  </Text>
                </Stack>

                {/* Players / who's in */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between" mb="sm">
                    <Title order={3}>
                      {league.data.status === "setup"
                        ? "Who's in"
                        : league.data.status === "drafting"
                        ? "Players"
                        : "Standings"}
                    </Title>
                    {league.data.maxPlayers && (
                      <Text size="sm" c="dimmed">
                        {players.data?.length ?? 0} / {league.data.maxPlayers}
                      </Text>
                    )}
                  </Group>
                  <Stack gap="sm">
                    {players.data?.map((player) => {
                      const strategy = parseNpcStrategy(
                        player.npcStrategy ?? null,
                      );
                      return (
                        <Group key={player.id} justify="space-between">
                          <Group gap="sm">
                            <Avatar
                              src={player.image}
                              alt={player.name}
                              radius="xl"
                              size="sm"
                              color="mint-green"
                            >
                              {player.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </Avatar>
                            <Text size="sm">{player.name}</Text>
                            {player.isNpc && (
                              <Badge variant="light" color="grape" size="xs">
                                NPC
                              </Badge>
                            )}
                            {strategy && (
                              <Tooltip label={strategy.description}>
                                <Badge
                                  variant="outline"
                                  color="grape"
                                  size="xs"
                                >
                                  {strategy.label}
                                </Badge>
                              </Tooltip>
                            )}
                          </Group>
                          <Badge variant="light" size="sm" tt="capitalize">
                            {player.role}
                          </Badge>
                        </Group>
                      );
                    })}
                    {(!players.data || players.data.length === 0) && (
                      <Text c="dimmed" size="sm">
                        No players yet.
                      </Text>
                    )}
                    {isCommissioner && league.data.status === "setup" && (
                      <Group gap={0} wrap="nowrap">
                        <Button
                          variant="light"
                          size="xs"
                          loading={addNpcPlayer.isPending}
                          onClick={() =>
                            addNpcPlayer.mutate({ leagueId: id! })}
                          style={{
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                          }}
                        >
                          + Add random NPC
                        </Button>
                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon
                              variant="light"
                              size={30}
                              aria-label="More NPC options"
                              style={{
                                borderTopLeftRadius: 0,
                                borderBottomLeftRadius: 0,
                                borderLeft:
                                  "1px solid var(--mantine-color-default-border)",
                              }}
                            >
                              <IconChevronDown size={14} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item onClick={openChooseNpc}>
                              Choose specific NPC…
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    )}
                  </Stack>
                </Card>
              </Stack>
            </Grid.Col>

            {/* Right column (~1/3) */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="lg">
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={4} mb="sm">League info</Title>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" fw={500}>Invite code</Text>
                      <Group gap={4}>
                        <Text ff="monospace" size="sm">
                          {league.data.inviteCode}
                        </Text>
                        <CopyButton value={league.data.inviteCode}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? "Copied" : "Copy"}>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                color={copied ? "teal" : "gray"}
                                onClick={copy}
                                aria-label="Copy invite code"
                              >
                                {copied ? "✓" : "⎘"}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                    </Group>
                    <Stack gap={4}>
                      <Text size="sm" fw={500}>Share link</Text>
                      <Group gap={4} wrap="nowrap">
                        <Text
                          ff="monospace"
                          size="xs"
                          c="dimmed"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {`${globalThis.location.origin}/join/${league.data.inviteCode}`}
                        </Text>
                        <CopyButton
                          value={`${globalThis.location.origin}/join/${league.data.inviteCode}`}
                        >
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? "Copied" : "Copy"}>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                color={copied ? "teal" : "gray"}
                                onClick={copy}
                                aria-label="Copy invite link"
                              >
                                {copied ? "✓" : "⎘"}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                    </Stack>
                    <Group justify="space-between">
                      <Text size="sm" fw={500}>Created</Text>
                      <Text size="sm" c="dimmed">
                        {new Date(league.data.createdAt).toLocaleDateString()}
                      </Text>
                    </Group>
                  </Stack>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between" mb="sm">
                    <Title order={4}>Rules</Title>
                    <Button
                      component={Link}
                      href={`/leagues/${league.data.id}/settings`}
                      size="xs"
                      variant="subtle"
                      leftSection={<IconSettings size={14} />}
                    >
                      {isCommissioner && league.data.status === "setup"
                        ? "Configure"
                        : "View"}
                    </Button>
                  </Group>
                  {(() => {
                    if (
                      !league.data.rulesConfig ||
                      typeof league.data.rulesConfig !== "object"
                    ) {
                      return (
                        <Text size="sm" c="dimmed">
                          Not configured yet.
                        </Text>
                      );
                    }
                    const rules = league.data.rulesConfig as {
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
                        {league.data.maxPlayers && (
                          <Group justify="space-between">
                            <Text size="sm" c="dimmed">Max players</Text>
                            <Text size="sm">{league.data.maxPlayers}</Text>
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
                        {league.data.sportType === "pokemon" && (
                          <>
                            <Group justify="space-between">
                              <Text size="sm" c="dimmed">Game version</Text>
                              <Text size="sm">
                                {rules.gameVersion ?? "All Pokemon"}
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
                                {exclusions.length > 0
                                  ? exclusions.join(", ")
                                  : "None"}
                              </Text>
                            </Group>
                          </>
                        )}
                      </Stack>
                    );
                  })()}
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>

          {league.data.status === "competing" && draft.data && (
            <Card shadow="sm" padding="lg" radius="md" withBorder mt="lg">
              <AllRostersPanel
                draftState={draft.data}
                poolItemsById={poolItemsById}
              />
            </Card>
          )}

          {isCommissioner && (
            <Group justify="flex-end" mt="xl">
              <Button
                color="red"
                variant="subtle"
                size="xs"
                onClick={openDelete}
              >
                Delete league
              </Button>
            </Group>
          )}

          <Modal
            opened={advanceOpened}
            onClose={closeAdvance}
            title="Advance League Status"
          >
            <Stack gap="md">
              <Text>
                Are you sure you want to advance{" "}
                <Text span fw={700}>{league.data.name}</Text> to{" "}
                <Text span fw={700}>{nextStatus}</Text>? This action cannot be
                undone.
              </Text>
              {advanceStatus.isError && (
                <Alert color="red" title="Failed to advance">
                  {advanceStatus.error.message}
                </Alert>
              )}
              <Group justify="flex-end">
                <Button variant="default" onClick={closeAdvance}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAdvance}
                  loading={advanceStatus.isPending}
                >
                  Advance
                </Button>
              </Group>
            </Stack>
          </Modal>

          <Modal
            opened={chooseNpcOpened}
            onClose={closeChooseNpc}
            title="Choose an NPC trainer"
          >
            <Stack gap="sm">
              {availableNpcs.isLoading && (
                <Group justify="center" py="md">
                  <Loader size="sm" />
                </Group>
              )}
              {availableNpcs.isError && (
                <Alert color="red" title="Failed to load NPCs">
                  {availableNpcs.error.message}
                </Alert>
              )}
              {availableNpcs.data && availableNpcs.data.length === 0 && (
                <Text c="dimmed" size="sm">
                  No NPC trainers available — all have already joined.
                </Text>
              )}
              {availableNpcs.data?.map((npc) => {
                const strategy = parseNpcStrategy(npc.npcStrategy ?? null);
                return (
                  <UnstyledButton
                    key={npc.id}
                    disabled={addNpcPlayer.isPending}
                    onClick={() => {
                      addNpcPlayer.mutate(
                        { leagueId: id!, npcUserId: npc.id },
                        { onSuccess: () => closeChooseNpc() },
                      );
                    }}
                    p="sm"
                    style={{
                      borderRadius: "var(--mantine-radius-sm)",
                      border: "1px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm">
                        <Avatar radius="xl" size="sm" color="mint-green">
                          {npc.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </Avatar>
                        <Text size="sm">{npc.name}</Text>
                      </Group>
                      {strategy && (
                        <Tooltip label={strategy.description} withinPortal>
                          <Badge
                            variant="outline"
                            color="grape"
                            size="xs"
                          >
                            {strategy.label}
                          </Badge>
                        </Tooltip>
                      )}
                    </Group>
                  </UnstyledButton>
                );
              })}
              {addNpcPlayer.isError && (
                <Alert color="red" title="Failed to add NPC">
                  {addNpcPlayer.error.message}
                </Alert>
              )}
            </Stack>
          </Modal>

          <Modal
            opened={deleteOpened}
            onClose={closeDelete}
            title="Delete League"
          >
            <Text mb="lg">
              Are you sure you want to delete{" "}
              <Text span fw={700}>{league.data.name}</Text>? This action cannot
              be undone.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDelete}>
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleDelete}
                loading={deleteLeague.isPending}
              >
                Delete
              </Button>
            </Group>
          </Modal>
        </>
      )}
    </Container>
  );
}
