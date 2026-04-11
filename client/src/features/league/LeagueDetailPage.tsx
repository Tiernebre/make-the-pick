import {
  Anchor,
  Button,
  Card,
  Container,
  Grid,
  Group,
  LoadingOverlay,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useSession } from "../../auth";
import { AllRostersPanel } from "../draft/AllRostersPanel";
import { useDraft } from "../draft/use-draft";
import { usePokemonVersions } from "../pokemon-version/use-pokemon-versions";
import { AdvanceLeagueModal } from "./components/AdvanceLeagueModal";
import { ChooseNpcModal } from "./components/ChooseNpcModal";
import { DeleteLeagueModal } from "./components/DeleteLeagueModal";
import { LeagueHeader } from "./components/LeagueHeader";
import { LeagueInfoCard } from "./components/LeagueInfoCard";
import { LeaguePlayersCard } from "./components/LeaguePlayersCard";
import { LeagueRulesCard } from "./components/LeagueRulesCard";
import { LeagueYourTeamPanel } from "./components/LeagueYourTeamPanel";
import { RemovePlayerModal } from "./components/RemovePlayerModal";
import {
  useAddNpcPlayer,
  useAdvanceLeagueStatus,
  useAvailableNpcs,
  useDeleteLeague,
  useLeague,
  useLeaguePlayers,
  useRemoveLeaguePlayer,
} from "./use-leagues";

const NEXT_STATUS: Record<string, string | null> = {
  setup: "pooling",
  pooling: "scouting",
  scouting: "drafting",
  drafting: "competing",
  competing: "complete",
  complete: null,
};

export function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const league = useLeague(id!);
  const pokemonVersions = usePokemonVersions();
  const gameVersionName = useMemo(() => {
    const rules = league.data?.rulesConfig as
      | { gameVersion?: string }
      | undefined;
    if (!rules?.gameVersion) return undefined;
    const match = pokemonVersions.data?.find((v) => v.id === rules.gameVersion);
    return match?.name ?? rules.gameVersion;
  }, [league.data?.rulesConfig, pokemonVersions.data]);
  const players = useLeaguePlayers(id!);
  const draft = useDraft(id!, {
    enabled: league.data?.status === "competing",
  });
  const { data: session } = useSession();
  const deleteLeague = useDeleteLeague();
  const advanceStatus = useAdvanceLeagueStatus();
  const addNpcPlayer = useAddNpcPlayer();
  const removePlayer = useRemoveLeaguePlayer();
  const [, navigate] = useLocation();
  const [playerToRemove, setPlayerToRemove] = useState<
    { userId: string; name: string } | null
  >(null);

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

  const atMaxPlayers = !!league.data?.maxPlayers &&
    (players.data?.length ?? 0) >= league.data.maxPlayers;

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
    <Container size="lg" py={{ base: "md", sm: "xl" }} pos="relative">
      <LoadingOverlay visible={league.isLoading} />

      <Anchor component={Link} href="/leagues" mb="md" display="block">
        &larr; Back to Leagues
      </Anchor>

      {league.data && (
        <>
          <LeagueHeader
            league={league.data}
            isCommissioner={!!isCommissioner}
            nextStatus={nextStatus}
            setupPrerequisitesMet={setupPrerequisitesMet}
            onAdvanceClick={() => {
              advanceStatus.reset();
              openAdvance();
            }}
          />

          <Grid gutter="lg">
            {/* Left column (~2/3) */}
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Stack gap="lg">
                <LeagueYourTeamPanel
                  leagueName={league.data.name}
                  currentUserPlayer={currentUserPlayer}
                />

                <LeaguePlayersCard
                  leagueId={id!}
                  leagueStatus={league.data.status}
                  maxPlayers={league.data.maxPlayers}
                  players={players.data ?? []}
                  isCommissioner={!!isCommissioner}
                  atMaxPlayers={atMaxPlayers}
                  addNpcPending={addNpcPlayer.isPending}
                  onAddRandomNpc={() => addNpcPlayer.mutate({ leagueId: id! })}
                  onOpenChooseNpc={openChooseNpc}
                  onRemovePlayer={(player) => {
                    removePlayer.reset();
                    setPlayerToRemove(player);
                  }}
                />
              </Stack>
            </Grid.Col>

            {/* Right column (~1/3) */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="lg">
                <LeagueInfoCard
                  inviteCode={league.data.inviteCode}
                  createdAt={league.data.createdAt}
                />

                <LeagueRulesCard
                  leagueId={league.data.id}
                  leagueStatus={league.data.status}
                  sportType={league.data.sportType}
                  maxPlayers={league.data.maxPlayers}
                  rulesConfig={league.data.rulesConfig}
                  gameVersionName={gameVersionName}
                  isCommissioner={!!isCommissioner}
                />
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

          <AdvanceLeagueModal
            opened={advanceOpened}
            onClose={closeAdvance}
            leagueName={league.data.name}
            nextStatus={nextStatus}
            isPending={advanceStatus.isPending}
            isError={advanceStatus.isError}
            errorMessage={advanceStatus.error?.message}
            onConfirm={handleAdvance}
          />

          <ChooseNpcModal
            opened={chooseNpcOpened}
            onClose={closeChooseNpc}
            npcs={availableNpcs.data}
            isLoading={availableNpcs.isLoading}
            isError={availableNpcs.isError}
            errorMessage={availableNpcs.error?.message}
            addNpcPending={addNpcPlayer.isPending}
            addNpcError={addNpcPlayer.isError}
            addNpcErrorMessage={addNpcPlayer.error?.message}
            onChooseNpc={(npcUserId) => {
              addNpcPlayer.mutate(
                { leagueId: id!, npcUserId },
                { onSuccess: () => closeChooseNpc() },
              );
            }}
          />

          <RemovePlayerModal
            playerToRemove={playerToRemove}
            onClose={() => setPlayerToRemove(null)}
            isPending={removePlayer.isPending}
            isError={removePlayer.isError}
            errorMessage={removePlayer.error?.message}
            onConfirm={(player) => {
              removePlayer.mutate(
                {
                  leagueId: id!,
                  playerUserId: player.userId,
                },
                { onSuccess: () => setPlayerToRemove(null) },
              );
            }}
          />

          <DeleteLeagueModal
            opened={deleteOpened}
            onClose={closeDelete}
            leagueName={league.data.name}
            isPending={deleteLeague.isPending}
            onConfirm={handleDelete}
          />
        </>
      )}
    </Container>
  );
}
