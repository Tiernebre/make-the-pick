import {
  Anchor,
  Button,
  Card,
  Container,
  NumberInput,
  Select,
  Stack,
  Switch,
  TextInput,
  Title,
} from "@mantine/core";
import { type FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { usePokemonVersions } from "../pokemon-version/use-pokemon-versions";
import { useCreateLeague } from "./use-leagues";

export function CreateLeaguePage() {
  const [, navigate] = useLocation();
  const createLeague = useCreateLeague();
  const pokemonVersions = usePokemonVersions();

  const [name, setName] = useState("");
  const [sportType, setSportType] = useState<string | null>("pokemon");
  const [draftFormat, setDraftFormat] = useState<string | null>("snake");
  const [numberOfRounds, setNumberOfRounds] = useState<number | string>("");
  const [pickTimeLimitSeconds, setPickTimeLimitSeconds] = useState<
    number | string
  >("");
  const [maxPlayers, setMaxPlayers] = useState<number | string>("");
  const [poolSizeMultiplier, setPoolSizeMultiplier] = useState<number | string>(
    2,
  );
  const [gameVersion, setGameVersion] = useState<string | null>(null);
  const [excludeLegendaries, setExcludeLegendaries] = useState(false);
  const [excludeStarters, setExcludeStarters] = useState(false);
  const [excludeTradeEvolutions, setExcludeTradeEvolutions] = useState(false);
  const [nameError, setNameError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Name is required");
      return;
    }
    if (trimmed.length > 100) {
      setNameError("Name must be 100 characters or less");
      return;
    }
    if (
      !sportType || !draftFormat || !numberOfRounds || !maxPlayers
    ) {
      return;
    }
    setNameError("");

    createLeague.mutate(
      {
        name: trimmed,
        sportType: sportType as "pokemon",
        maxPlayers: Number(maxPlayers),
        rulesConfig: {
          draftFormat: draftFormat as "snake" | "linear",
          numberOfRounds: Number(numberOfRounds),
          pickTimeLimitSeconds: pickTimeLimitSeconds
            ? Number(pickTimeLimitSeconds)
            : null,
          poolSizeMultiplier: Number(poolSizeMultiplier),
          ...(gameVersion ? { gameVersion } : {}),
          excludeLegendaries,
          excludeStarters,
          excludeTradeEvolutions,
        },
      },
      {
        onSuccess: (league) => {
          navigate(`/leagues/${league.id}`);
        },
      },
    );
  };

  return (
    <Container size="sm" py={{ base: "md", sm: "xl" }}>
      <Anchor component={Link} href="/leagues" mb="md" display="block">
        &larr; Back to Leagues
      </Anchor>

      <Title order={1} mb="lg">
        Create League
      </Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="League Name"
              placeholder="Enter league name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              error={nameError}
              maxLength={100}
              required
            />
            <Select
              label="Sport Type"
              data={[{ value: "pokemon", label: "Pokemon" }]}
              value={sportType}
              onChange={setSportType}
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
                      Record<string, { value: string; label: string }[]>
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
                  onChange={setGameVersion}
                  clearable
                  searchable
                />
                <Switch
                  label="Exclude Legendaries"
                  description="Remove legendary and mythical Pokemon from the draft pool"
                  checked={excludeLegendaries}
                  onChange={(event) =>
                    setExcludeLegendaries(event.currentTarget.checked)}
                />
                <Switch
                  label="Exclude Starters"
                  description="Remove starter Pokemon and their evolutions from the draft pool"
                  checked={excludeStarters}
                  onChange={(event) =>
                    setExcludeStarters(event.currentTarget.checked)}
                />
                <Switch
                  label="Exclude Trade Evolutions"
                  description="Remove Pokemon that can only be obtained through trade evolution (e.g. Golem, Gengar, Alakazam)"
                  checked={excludeTradeEvolutions}
                  onChange={(event) =>
                    setExcludeTradeEvolutions(event.currentTarget.checked)}
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
              label="Draft Pool Size Multiplier"
              description="Pool size = rounds × players × multiplier"
              min={1.5}
              max={3}
              step={0.5}
              decimalScale={1}
              value={poolSizeMultiplier}
              onChange={setPoolSizeMultiplier}
              required
            />
            <NumberInput
              label="Max Players"
              min={2}
              value={maxPlayers}
              onChange={setMaxPlayers}
              required
            />
            <Button
              type="submit"
              mt="md"
              loading={createLeague.isPending}
            >
              {createLeague.isPending ? "Creating..." : "Create"}
            </Button>
          </Stack>
        </form>
      </Card>
    </Container>
  );
}
