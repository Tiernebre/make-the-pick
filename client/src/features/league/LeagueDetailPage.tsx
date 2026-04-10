import {
  ActionIcon,
  Alert,
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
  Switch,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useSession } from "../../auth";
import { usePokemonVersions } from "../pokemon-version/use-pokemon-versions";
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
  const [gameVersion, setGameVersion] = useState<string | null>(null);
  const [poolSizeMultiplier, setPoolSizeMultiplier] = useState<number | string>(
    2,
  );
  const [excludeLegendaries, setExcludeLegendaries] = useState(false);
  const [excludeStarters, setExcludeStarters] = useState(false);
  const [excludeTradeEvolutions, setExcludeTradeEvolutions] = useState(false);
  const pokemonVersions = usePokemonVersions();

  useEffect(() => {
    if (league.data) {
      if (league.data.sportType) setSportType(league.data.sportType);
      if (league.data.maxPlayers) setMaxPlayers(league.data.maxPlayers);
      const rules = league.data.rulesConfig as {
        draftFormat?: string;
        numberOfRounds?: number;
        pickTimeLimitSeconds?: number | null;
        poolSizeMultiplier?: number;
        gameVersion?: string;
        excludeLegendaries?: boolean;
        excludeStarters?: boolean;
        excludeTradeEvolutions?: boolean;
      } | null;
      if (rules) {
        if (rules.draftFormat) setDraftFormat(rules.draftFormat);
        if (rules.numberOfRounds) setNumberOfRounds(rules.numberOfRounds);
        if (rules.pickTimeLimitSeconds) {
          setPickTimeLimitSeconds(rules.pickTimeLimitSeconds);
        }
        if (rules.gameVersion) {
          setGameVersion(rules.gameVersion);
        }
        if (rules.poolSizeMultiplier) {
          setPoolSizeMultiplier(rules.poolSizeMultiplier);
        }
        setExcludeLegendaries(rules.excludeLegendaries ?? false);
        setExcludeStarters(rules.excludeStarters ?? false);
        setExcludeTradeEvolutions(rules.excludeTradeEvolutions ?? false);
      }
    }
  }, [league.data]);

  const isCommissioner = players.data?.some(
    (p) => p.userId === session?.user?.id && p.role === "commissioner",
  );

  type SettingsState = {
    sportType: string | null;
    draftFormat: string | null;
    numberOfRounds: number | string;
    pickTimeLimitSeconds: number | string;
    maxPlayers: number | string;
    poolSizeMultiplier: number | string;
    gameVersion: string | null;
    excludeLegendaries: boolean;
    excludeStarters: boolean;
    excludeTradeEvolutions: boolean;
  };

  const currentSettings: SettingsState = {
    sportType,
    draftFormat,
    numberOfRounds,
    pickTimeLimitSeconds,
    maxPlayers,
    poolSizeMultiplier,
    gameVersion,
    excludeLegendaries,
    excludeStarters,
    excludeTradeEvolutions,
  };

  const isSettingsStateValid = (s: SettingsState) =>
    !!s.sportType && !!s.draftFormat &&
    Number(s.numberOfRounds) >= 1 && Number(s.maxPlayers) >= 2 &&
    Number(s.poolSizeMultiplier) >= 1.5 && Number(s.poolSizeMultiplier) <= 3;

  const saveSettings = (s: SettingsState) => {
    if (!isSettingsStateValid(s)) return;
    updateSettings.mutate({
      leagueId: id!,
      sportType: s.sportType as "pokemon",
      maxPlayers: Number(s.maxPlayers),
      rulesConfig: {
        draftFormat: s.draftFormat as "snake" | "linear",
        numberOfRounds: Number(s.numberOfRounds),
        pickTimeLimitSeconds: s.pickTimeLimitSeconds
          ? Number(s.pickTimeLimitSeconds)
          : null,
        poolSizeMultiplier: Number(s.poolSizeMultiplier),
        ...(s.gameVersion ? { gameVersion: s.gameVersion } : {}),
        excludeLegendaries: s.excludeLegendaries,
        excludeStarters: s.excludeStarters,
        excludeTradeEvolutions: s.excludeTradeEvolutions,
      },
    });
  };

  const saveCurrentSettings = () => saveSettings(currentSettings);

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
                    onChange={(value) => {
                      setSportType(value);
                      saveSettings({ ...currentSettings, sportType: value });
                    }}
                    required
                  />
                  {sportType === "pokemon" && (
                    <>
                      <Select
                        label="Game Version"
                        description="Optionally limit the draft pool to a specific game's regional dex"
                        placeholder="All Pokemon"
                        data={Object.entries(
                          (pokemonVersions.data ?? []).reduce<
                            Record<
                              string,
                              { value: string; label: string }[]
                            >
                          >((acc, v) => {
                            const group = `Generation ${v.generation}`;
                            if (!acc[group]) acc[group] = [];
                            acc[group].push({
                              value: v.id,
                              label: `${v.name} (${v.region})`,
                            });
                            return acc;
                          }, {}),
                        ).map(([group, items]) => ({ group, items }))}
                        value={gameVersion}
                        onChange={(value) => {
                          setGameVersion(value);
                          saveSettings({
                            ...currentSettings,
                            gameVersion: value,
                          });
                        }}
                        clearable
                        searchable
                      />
                      <Switch
                        label="Exclude Legendaries"
                        description="Remove legendary and mythical Pokemon from the draft pool"
                        checked={excludeLegendaries}
                        onChange={(event) => {
                          const next = event.currentTarget.checked;
                          setExcludeLegendaries(next);
                          saveSettings({
                            ...currentSettings,
                            excludeLegendaries: next,
                          });
                        }}
                      />
                      <Switch
                        label="Exclude Starters"
                        description="Remove starter Pokemon and their evolutions from the draft pool"
                        checked={excludeStarters}
                        onChange={(event) => {
                          const next = event.currentTarget.checked;
                          setExcludeStarters(next);
                          saveSettings({
                            ...currentSettings,
                            excludeStarters: next,
                          });
                        }}
                      />
                      <Switch
                        label="Exclude Trade Evolutions"
                        description="Remove Pokemon that can only be obtained through trade evolution (e.g. Golem, Gengar, Alakazam)"
                        checked={excludeTradeEvolutions}
                        onChange={(event) => {
                          const next = event.currentTarget.checked;
                          setExcludeTradeEvolutions(next);
                          saveSettings({
                            ...currentSettings,
                            excludeTradeEvolutions: next,
                          });
                        }}
                      />
                    </>
                  )}
                  <Select
                    label="Draft Format"
                    data={[
                      { value: "snake", label: "Snake" },
                      { value: "linear", label: "Linear" },
                    ]}
                    value={draftFormat}
                    onChange={(value) => {
                      setDraftFormat(value);
                      saveSettings({ ...currentSettings, draftFormat: value });
                    }}
                    required
                  />
                  <NumberInput
                    label="Number of Rounds"
                    min={1}
                    value={numberOfRounds}
                    onChange={setNumberOfRounds}
                    onBlur={saveCurrentSettings}
                    required
                  />
                  <NumberInput
                    label="Pick Time Limit (seconds)"
                    description="Leave empty for no time limit"
                    min={1}
                    value={pickTimeLimitSeconds}
                    onChange={setPickTimeLimitSeconds}
                    onBlur={saveCurrentSettings}
                  />
                  <NumberInput
                    label="Draft Pool Size Multiplier"
                    description="Pool size = rounds × players × multiplier"
                    min={1.5}
                    max={3}
                    step={0.5}
                    decimalScale={1}
                    value={poolSizeMultiplier}
                    onChange={setPoolSizeMultiplier}
                    onBlur={saveCurrentSettings}
                    required
                  />
                  <NumberInput
                    label="Max Players"
                    min={2}
                    value={maxPlayers}
                    onChange={setMaxPlayers}
                    onBlur={saveCurrentSettings}
                    required
                  />
                  {updateSettings.isPending && (
                    <Text c="dimmed" size="sm">Saving...</Text>
                  )}
                  {updateSettings.isError && (
                    <Text c="red" size="sm">
                      Failed to save: {updateSettings.error.message}
                    </Text>
                  )}
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
                      {(league.data.rulesConfig as { gameVersion?: string })
                        .gameVersion && (
                        <Group>
                          <Text fw={500}>Game Version</Text>
                          <Badge variant="light">
                            {(
                              league.data.rulesConfig as {
                                gameVersion: string;
                              }
                            ).gameVersion}
                          </Badge>
                        </Group>
                      )}
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
                      <Group>
                        <Text fw={500}>Draft Pool Multiplier</Text>
                        <Text c="dimmed">
                          {(
                            league.data.rulesConfig as {
                              poolSizeMultiplier?: number;
                            }
                          ).poolSizeMultiplier ?? 2}x
                        </Text>
                      </Group>
                      {(league.data.rulesConfig as {
                        excludeLegendaries?: boolean;
                      }).excludeLegendaries && (
                        <Group>
                          <Text fw={500}>Legendaries</Text>
                          <Badge variant="light" color="red">Excluded</Badge>
                        </Group>
                      )}
                      {(league.data.rulesConfig as {
                        excludeStarters?: boolean;
                      }).excludeStarters && (
                        <Group>
                          <Text fw={500}>Starters</Text>
                          <Badge variant="light" color="red">Excluded</Badge>
                        </Group>
                      )}
                      {(league.data.rulesConfig as {
                        excludeTradeEvolutions?: boolean;
                      }).excludeTradeEvolutions && (
                        <Group>
                          <Text fw={500}>Trade Evolutions</Text>
                          <Badge variant="light" color="red">Excluded</Badge>
                        </Group>
                      )}
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

          <Group mt="lg">
            {league.data.status === "drafting" && (
              <>
                <Button
                  component={Link}
                  href={`/leagues/${league.data.id}/draft`}
                  variant="filled"
                >
                  Go to Draft
                </Button>
                <Button
                  component={Link}
                  href={`/leagues/${league.data.id}/draft/pool`}
                  variant="light"
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
              >
                Advance to {nextStatus.charAt(0).toUpperCase() +
                  nextStatus.slice(1)}
              </Button>
            )}

            {isCommissioner && (
              <Button
                color="red"
                variant="light"
                onClick={openDelete}
              >
                Delete League
              </Button>
            )}
          </Group>

          <Modal
            opened={advanceOpened}
            onClose={closeAdvance}
            title="Advance League Status"
          >
            <Stack gap="md">
              <Text>
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
