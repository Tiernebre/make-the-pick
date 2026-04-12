import {
  Alert,
  Anchor,
  Button,
  Card,
  Container,
  Grid,
  Group,
  LoadingOverlay,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { useSession } from "../../auth";
import { usePageTitle } from "../../hooks/use-page-title";
import { useLeague, useLeaguePlayers } from "../league/use-leagues";
import { AllRostersPanel } from "./AllRostersPanel";
import { AvailablePoolTable } from "./AvailablePoolTable";
import { CeremonySettings } from "./CeremonySettings";
import { CeremonyTicker } from "./CeremonyTicker";
import { CommissionerControls } from "./CommissionerControls";
import { DraftBoard } from "./DraftBoard";
import { DraftHeader } from "./DraftHeader";
import { PausedOverlay } from "./PausedOverlay";
import { WatchlistPanel } from "./WatchlistPanel";
import { useDraft, useMakePick, useStartDraft } from "./use-draft";
import { useSetFastMode } from "./use-draft-commissioner";
import { useDraftCeremony } from "./use-draft-ceremony";
import { useDraftEvents } from "./use-draft-events";
import { leaguePlayerForPick } from "./snake.ts";

export function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const leagueId = id!;
  const league = useLeague(leagueId);
  usePageTitle(league.data ? `Draft · ${league.data.name}` : undefined);
  const leaguePlayers = useLeaguePlayers(leagueId);
  const draft = useDraft(leagueId);
  const makePick = useMakePick(leagueId);
  const startDraft = useStartDraft(leagueId);
  const { data: session } = useSession();

  const myLeaguePlayer = useMemo(
    () =>
      leaguePlayers.data?.find((p) => p.userId === session?.user?.id) ?? null,
    [leaguePlayers.data, session?.user?.id],
  );
  const isCommissioner = myLeaguePlayer?.role === "commissioner";

  const rulesConfig = (league.data?.rulesConfig ?? null) as
    | { numberOfRounds?: number }
    | null;
  const totalRounds = rulesConfig?.numberOfRounds ?? 6;

  const draftState = draft.data;

  const isDraftLive = !!draftState &&
    (draftState.draft.status === "in_progress" ||
      draftState.draft.status === "paused");

  const serverFastMode = draftState?.draft.fastMode ?? false;
  const ceremony = useDraftCeremony(serverFastMode);
  const setFastMode = useSetFastMode(leagueId);

  useDraftEvents(leagueId, {
    enabled: isDraftLive,
    onEvent: (event) => {
      if (event.type !== "draft:pick_made") return;
      const pick = event.data;
      ceremony.show({
        id: pick.id,
        playerName: pick.playerName,
        pokemonName: pick.itemName,
        pickNumber: pick.pickNumber,
        round: pick.round,
      });
    },
  });

  const currentTurnPlayerId = draftState
    ? leaguePlayerForPick(
      draftState.draft.currentPick,
      draftState.draft.pickOrder,
    )
    : null;
  const currentTurnPlayer = draftState?.players.find(
    (p) => p.id === currentTurnPlayerId,
  ) ?? null;
  const isMyTurn = !!(myLeaguePlayer && currentTurnPlayerId &&
    myLeaguePlayer.id === currentTurnPlayerId);

  const poolItemsById = useMemo(() => {
    const map: Record<string, NonNullable<typeof draftState>["poolItems"][0]> =
      {};
    for (const item of draftState?.poolItems ?? []) {
      map[item.id] = item;
    }
    return map;
  }, [draftState]);

  async function handlePick(poolItemId: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      makePick.mutate(
        { leagueId, poolItemId },
        {
          onSuccess: () => resolve(),
          onError: (err) => reject(err),
        },
      );
    });
  }

  const isLoading = league.isLoading || draft.isLoading ||
    leaguePlayers.isLoading;
  const draftStatus = draftState?.draft.status;
  const isPending = draftStatus === "pending";

  const commissionerPlayerList = useMemo(
    () =>
      (draftState?.players ?? []).map((p) => ({
        leaguePlayerId: p.id,
        name: p.name,
      })),
    [draftState],
  );

  return (
    <Container size={1800} py="xl" pos="relative">
      <LoadingOverlay visible={isLoading} />
      {draftState && (
        <PausedOverlay
          status={draftState.draft.status}
          isCommissioner={isCommissioner}
          leagueId={leagueId}
        />
      )}
      <CeremonyTicker
        current={ceremony.current}
        onDismiss={ceremony.skip}
      />

      <Anchor
        component={Link}
        href={`/leagues/${leagueId}`}
        mb="md"
        display="block"
      >
        &larr; Back to League
      </Anchor>

      {league.data && (
        <Title order={1} mb="lg">
          {league.data.name} — Draft
        </Title>
      )}

      {draft.error && (
        <Alert color="red" title="Failed to load draft" mb="md">
          {draft.error.message}
        </Alert>
      )}

      {draftState && isPending && (
        <Card withBorder shadow="sm" padding="lg" radius="md">
          <Stack gap="md" align="flex-start">
            <Title order={3}>Draft has not started</Title>
            <Text c="dimmed">
              Waiting for the commissioner to start the draft.
            </Text>
            {isCommissioner && (
              <Button
                onClick={() => startDraft.mutate({ leagueId })}
                loading={startDraft.isPending}
              >
                Start Draft
              </Button>
            )}
            {startDraft.error && (
              <Alert color="red" title="Failed to start draft">
                {startDraft.error.message}
              </Alert>
            )}
          </Stack>
        </Card>
      )}

      {draftState && !isPending && (
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <DraftHeader
              draftState={draftState}
              totalRounds={totalRounds}
              currentTurnPlayerName={currentTurnPlayer?.name ?? null}
            />
            <CeremonySettings
              isMuted={ceremony.isMuted}
              isFastMode={serverFastMode}
              onToggleMute={ceremony.toggleMute}
              onToggleFastMode={isCommissioner
                ? (enabled) =>
                  setFastMode.mutate({ leagueId, fastMode: enabled })
                : undefined}
            />
          </Group>
          {isCommissioner && (
            <CommissionerControls
              draftState={draftState}
              leagueId={leagueId}
              players={commissionerPlayerList}
              poolItemsById={poolItemsById}
            />
          )}
          <Grid>
            <Grid.Col span={{ base: 12, lg: 9 }}>
              <AvailablePoolTable
                leagueId={leagueId}
                draftState={draftState}
                isMyTurn={isMyTurn}
                onPick={handlePick}
                isPicking={makePick.isPending}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, lg: 3 }}>
              <WatchlistPanel
                leagueId={leagueId}
                poolItems={draftState.poolItems}
                title="Queue"
                emptyMessage="Star players from the pool to queue them up. The top of your queue auto-picks if your timer runs out."
                onQuickDraft={handlePick}
                quickDraftEnabled={isMyTurn}
                isPicking={makePick.isPending}
              />
            </Grid.Col>
          </Grid>

          <Tabs defaultValue="results" keepMounted={false}>
            <Tabs.List>
              <Tabs.Tab value="results">Draft Results</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="results" pt="md">
              <Stack gap="md">
                <DraftBoard
                  draftState={draftState}
                  totalRounds={totalRounds}
                  poolItemsById={poolItemsById}
                />
                <AllRostersPanel
                  draftState={draftState}
                  poolItemsById={poolItemsById}
                />
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      )}
    </Container>
  );
}
