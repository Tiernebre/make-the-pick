import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Button,
  Card,
  Container,
  CopyButton,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useSession } from "../../auth";
import {
  useAdvanceLeagueStatus,
  useDeleteLeague,
  useLeague,
  useLeaguePlayers,
  useUpdateLeagueSettings,
} from "./use-leagues";

export function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);
  const players = useLeaguePlayers(id!);
  const { data: session } = useSession();
  const deleteLeague = useDeleteLeague();
  const updateSettings = useUpdateLeagueSettings();
  const advanceStatus = useAdvanceLeagueStatus();
  const [, navigate] = useLocation();
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [advanceOpened, { open: openAdvance, close: closeAdvance }] =
    useDisclosure(false);

  const [sportType, setSportType] = useState<string | null>(null);
  const [draftFormat, setDraftFormat] = useState<string | null>("snake");
  const [numberOfRounds, setNumberOfRounds] = useState<number | string>("");
  const [pickTimeLimitSeconds, setPickTimeLimitSeconds] = useState<
    number | string
  >("");
  const [maxPlayers, setMaxPlayers] = useState<number | string>("");
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (league.data) {
      if (league.data.sportType) setSportType(league.data.sportType);
      if (league.data.maxPlayers) setMaxPlayers(league.data.maxPlayers);
      const rules = league.data.rulesConfig as {
        draftFormat?: string;
        numberOfRounds?: number;
        pickTimeLimitSeconds?: number | null;
      } | null;
      if (rules) {
        if (rules.draftFormat) setDraftFormat(rules.draftFormat);
        if (rules.numberOfRounds) setNumberOfRounds(rules.numberOfRounds);
        if (rules.pickTimeLimitSeconds) {
          setPickTimeLimitSeconds(rules.pickTimeLimitSeconds);
        }
      }
    }
  }, [league.data]);

  const isCommissioner = players.data?.some(
    (p) => p.userId === session?.user?.id && p.role === "commissioner",
  );

  const handleSaveSettings = () => {
    if (
      !sportType || !draftFormat || !numberOfRounds || !maxPlayers
    ) {
      return;
    }
    setSettingsSaved(false);
    updateSettings.mutate(
      {
        leagueId: id!,
        sportType: sportType as "pokemon",
        maxPlayers: Number(maxPlayers),
        rulesConfig: {
          draftFormat: draftFormat as "snake" | "linear",
          numberOfRounds: Number(numberOfRounds),
          pickTimeLimitSeconds: pickTimeLimitSeconds
            ? Number(pickTimeLimitSeconds)
            : null,
        },
      },
      {
        onSuccess: () => {
          setSettingsSaved(true);
        },
      },
    );
  };

  const handleDelete = () => {
    deleteLeague.mutate(
      { id: id! },
      {
        onSuccess: () => {
          navigate("/");
        },
      },
    );
  };

  const NEXT_STATUS: Record<string, string | null> = {
    setup: "drafting",
    drafting: "competing",
    competing: "complete",
    complete: null,
  };

  const nextStatus = league.data ? NEXT_STATUS[league.data.status] : null;

  const setupPrerequisitesMet = league.data?.status !== "setup" ||
    (!!league.data?.sportType && !!league.data?.rulesConfig);

  const handleAdvance = () => {
    advanceStatus.mutate(
      { leagueId: id! },
      { onSuccess: () => closeAdvance() },
    );
  };

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

          {isCommissioner && league.data.status === "setup" && (
            <>
              <Title order={3} mt="xl" mb="sm">
                League Settings
              </Title>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Select
                    label="Sport Type"
                    data={[{ value: "pokemon", label: "Pokemon" }]}
                    value={sportType}
                    onChange={setSportType}
                    required
                  />
                  <Select
                    label="Draft Format"
                    data={[
                      { value: "snake", label: "Snake" },
                      { value: "linear", label: "Linear" },
                    ]}
                    value={draftFormat}
                    onChange={setDraftFormat}
                    required
                  />
                  <NumberInput
                    label="Number of Rounds"
                    min={1}
                    value={numberOfRounds}
                    onChange={setNumberOfRounds}
                    required
                  />
                  <NumberInput
                    label="Pick Time Limit (seconds)"
                    description="Leave empty for no time limit"
                    min={1}
                    value={pickTimeLimitSeconds}
                    onChange={setPickTimeLimitSeconds}
                  />
                  <NumberInput
                    label="Max Players"
                    min={2}
                    value={maxPlayers}
                    onChange={setMaxPlayers}
                    required
                  />
                  <Group>
                    <Button
                      onClick={handleSaveSettings}
                      loading={updateSettings.isPending}
                    >
                      Save Settings
                    </Button>
                    {settingsSaved && (
                      <Text c="teal" size="sm">Settings saved</Text>
                    )}
                  </Group>
                </Stack>
              </Card>
            </>
          )}

          {!isCommissioner && league.data.sportType && (
            <>
              <Title order={3} mt="xl" mb="sm">
                League Settings
              </Title>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="xs">
                  <Group>
                    <Text fw={500}>Sport Type</Text>
                    <Badge variant="light">{league.data.sportType}</Badge>
                  </Group>
                  {league.data.rulesConfig &&
                    typeof league.data.rulesConfig === "object" && (
                    <>
                      <Group>
                        <Text fw={500}>Draft Format</Text>
                        <Badge variant="light">
                          {(league.data.rulesConfig as { draftFormat: string })
                            .draftFormat}
                        </Badge>
                      </Group>
                      <Group>
                        <Text fw={500}>Rounds</Text>
                        <Text c="dimmed">
                          {(
                            league.data.rulesConfig as {
                              numberOfRounds: number;
                            }
                          ).numberOfRounds}
                        </Text>
                      </Group>
                      <Group>
                        <Text fw={500}>Pick Time Limit</Text>
                        <Text c="dimmed">
                          {(
                              league.data.rulesConfig as {
                                pickTimeLimitSeconds: number | null;
                              }
                            ).pickTimeLimitSeconds
                            ? `${
                              (
                                league.data.rulesConfig as {
                                  pickTimeLimitSeconds: number;
                                }
                              ).pickTimeLimitSeconds
                            }s`
                            : "No limit"}
                        </Text>
                      </Group>
                    </>
                  )}
                  {league.data.maxPlayers && (
                    <Group>
                      <Text fw={500}>Max Players</Text>
                      <Text c="dimmed">{league.data.maxPlayers}</Text>
                    </Group>
                  )}
                </Stack>
              </Card>
            </>
          )}

          <Title order={3} mt="xl" mb="sm">
            Players
          </Title>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="sm">
              {players.data?.map((player) => (
                <Group key={player.id} justify="space-between">
                  <Group gap="sm">
                    <Avatar
                      src={player.image}
                      alt={player.name}
                      radius="xl"
                      size="sm"
                      color="blue"
                    >
                      {player.name
                        .split(" ")
                        .map((n) =>
                          n[0]
                        )
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </Avatar>
                    <Text size="sm">{player.name}</Text>
                  </Group>
                  <Badge variant="light" size="sm">
                    {player.role}
                  </Badge>
                </Group>
              ))}
            </Stack>
          </Card>

          {league.data.status === "drafting" && (
            <Button
              component={Link}
              href={`/leagues/${league.data.id}/draft`}
              mt="lg"
              variant="filled"
            >
              Go to Draft
            </Button>
          )}

          {isCommissioner && nextStatus && setupPrerequisitesMet && (
            <Button mt="lg" onClick={openAdvance}>
              Advance to {nextStatus.charAt(0).toUpperCase() +
                nextStatus.slice(1)}
            </Button>
          )}

          {isCommissioner && (
            <Button
              color="red"
              variant="light"
              mt="lg"
              onClick={openDelete}
            >
              Delete League
            </Button>
          )}

          <Modal
            opened={advanceOpened}
            onClose={closeAdvance}
            title="Advance League Status"
          >
            <Text mb="lg">
              Are you sure you want to advance{" "}
              <Text span fw={700}>
                {league.data.name}
              </Text>{" "}
              to{" "}
              <Text span fw={700}>
                {nextStatus}
              </Text>
              ? This action cannot be undone.
            </Text>
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
          </Modal>

          <Modal
            opened={deleteOpened}
            onClose={closeDelete}
            title="Delete League"
          >
            <Text mb="lg">
              Are you sure you want to delete{" "}
              <Text span fw={700}>
                {league.data.name}
              </Text>
              ? This action cannot be undone.
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
