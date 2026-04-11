import {
  Anchor,
  Badge,
  Card,
  Container,
  Group,
  LoadingOverlay,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useSession } from "../../auth";
import { usePageTitle } from "../../hooks/use-page-title";
import { usePokemonVersions } from "../pokemon-version/use-pokemon-versions";
import {
  useLeague,
  useLeaguePlayers,
  useUpdateLeagueSettings,
} from "./use-leagues";

export function LeagueSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);
  usePageTitle(league.data ? `Settings · ${league.data.name}` : undefined);
  const players = useLeaguePlayers(id!);
  const { data: session } = useSession();
  const updateSettings = useUpdateLeagueSettings();
  const pokemonVersions = usePokemonVersions();

  const [sportType, setSportType] = useState<string | null>(null);
  const [draftFormat, setDraftFormat] = useState<string | null>("snake");
  const [draftMode, setDraftMode] = useState<string | null>("individual");
  const [numberOfRounds, setNumberOfRounds] = useState<number | string>("");
  const [pickTimeLimitSeconds, setPickTimeLimitSeconds] = useState<
    number | string
  >("");
  const [maxPlayers, setMaxPlayers] = useState<number | string>("");
  const [gameVersion, setGameVersion] = useState<string | null>(null);
  const [poolSizeMultiplier, setPoolSizeMultiplier] = useState<
    number | string
  >(2);
  const [excludeLegendaries, setExcludeLegendaries] = useState(false);
  const [excludeStarters, setExcludeStarters] = useState(false);
  const [excludeTradeEvolutions, setExcludeTradeEvolutions] = useState(false);

  useEffect(() => {
    if (league.data) {
      if (league.data.sportType) setSportType(league.data.sportType);
      if (league.data.maxPlayers) setMaxPlayers(league.data.maxPlayers);
      const rules = league.data.rulesConfig as {
        draftFormat?: string;
        draftMode?: string;
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
        if (rules.draftMode) setDraftMode(rules.draftMode);
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
  const isEditable = isCommissioner && league.data?.status === "setup";

  type SettingsState = {
    sportType: string | null;
    draftFormat: string | null;
    draftMode: string | null;
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
    draftMode,
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
    !!s.sportType && !!s.draftFormat && !!s.draftMode &&
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
        draftMode: s.draftMode as "individual" | "species",
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

  return (
    <Container size="sm" py={{ base: "md", sm: "xl" }} pos="relative">
      <LoadingOverlay visible={league.isLoading} />

      <Anchor component={Link} href={`/leagues/${id}`} mb="md" display="block">
        &larr; Back to League
      </Anchor>

      {league.data && (
        <>
          <Title order={1} mb="lg">
            League Settings
          </Title>
          <Text c="dimmed" mb="lg">
            {league.data.name}
          </Text>

          {isEditable
            ? (
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
                      saveSettings({
                        ...currentSettings,
                        draftFormat: value,
                      });
                    }}
                    required
                  />
                  <Select
                    label="Draft Mode"
                    description="Individual drafts single Pokemon. Species drafts whole evolution lines at once."
                    data={[
                      { value: "individual", label: "Individual" },
                      { value: "species", label: "Species" },
                    ]}
                    value={draftMode}
                    onChange={(value) => {
                      setDraftMode(value);
                      saveSettings({
                        ...currentSettings,
                        draftMode: value,
                      });
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
            )
            : (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="xs">
                  {!isCommissioner && (
                    <Text c="dimmed" size="sm" mb="xs">
                      Only the commissioner can change settings.
                    </Text>
                  )}
                  {isCommissioner && league.data.status !== "setup" && (
                    <Text c="dimmed" size="sm" mb="xs">
                      Settings are locked once the league leaves setup.
                    </Text>
                  )}
                  {league.data.sportType && (
                    <Group>
                      <Text fw={500}>Sport Type</Text>
                      <Badge variant="light">{league.data.sportType}</Badge>
                    </Group>
                  )}
                  {league.data.rulesConfig &&
                    typeof league.data.rulesConfig === "object" && (
                    <>
                      {(league.data.rulesConfig as { gameVersion?: string })
                        .gameVersion && (
                        <Group>
                          <Text fw={500}>Game Version</Text>
                          <Badge variant="light">
                            {(league.data
                              .rulesConfig as { gameVersion: string })
                              .gameVersion}
                          </Badge>
                        </Group>
                      )}
                      <Group>
                        <Text fw={500}>Draft Format</Text>
                        <Badge variant="light">
                          {(league.data
                            .rulesConfig as { draftFormat: string })
                            .draftFormat}
                        </Badge>
                      </Group>
                      <Group>
                        <Text fw={500}>Draft Mode</Text>
                        <Badge variant="light">
                          {(league.data
                            .rulesConfig as { draftMode?: string })
                            .draftMode ?? "individual"}
                        </Badge>
                      </Group>
                      <Group>
                        <Text fw={500}>Rounds</Text>
                        <Text c="dimmed">
                          {(league.data
                            .rulesConfig as { numberOfRounds: number })
                            .numberOfRounds}
                        </Text>
                      </Group>
                      <Group>
                        <Text fw={500}>Pick Time Limit</Text>
                        <Text c="dimmed">
                          {(league.data.rulesConfig as {
                              pickTimeLimitSeconds: number | null;
                            }).pickTimeLimitSeconds
                            ? `${
                              (league.data.rulesConfig as {
                                pickTimeLimitSeconds: number;
                              }).pickTimeLimitSeconds
                            }s`
                            : "No limit"}
                        </Text>
                      </Group>
                      <Group>
                        <Text fw={500}>Draft Pool Multiplier</Text>
                        <Text c="dimmed">
                          {(league.data.rulesConfig as {
                            poolSizeMultiplier?: number;
                          }).poolSizeMultiplier ?? 2}x
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
            )}
        </>
      )}
    </Container>
  );
}
