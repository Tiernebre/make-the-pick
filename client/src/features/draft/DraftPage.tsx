import {
  Alert,
  Anchor,
  Button,
  Card,
  Container,
  Grid,
  LoadingOverlay,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { useSession } from "../../auth";
import { useLeague, useLeaguePlayers } from "../league/use-leagues";
import { CommissionerControls } from "./CommissionerControls";
import { DraftBoard } from "./DraftBoard";
import { DraftHeader } from "./DraftHeader";
import { PausedOverlay } from "./PausedOverlay";
import { PickPanel } from "./PickPanel";
import { RosterStrip } from "./RosterStrip";
import { useDraft, useMakePick, useStartDraft } from "./use-draft";
import { useDraftEvents } from "./use-draft-events";
import { leaguePlayerForPick } from "./snake.ts";

export function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const leagueId = id!;
  const league = useLeague(leagueId);
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

  // Subscribe to live SSE updates for the draft room. The subscription is
  // only active once a draft snapshot has loaded — before that there's
  // nothing to keep in sync, and for pending drafts there are no live
  // events yet. The hook's query invalidation keeps `useDraft` reactive
  // without the page needing to handle individual events itself.
  const isDraftLive = !!draftState &&
    (draftState.draft.status === "in_progress" ||
      draftState.draft.status === "paused");
  useDraftEvents(leagueId, { enabled: isDraftLive });

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

  const myPicks = useMemo(
    () =>
      draftState?.picks.filter(
        (p) => p.leaguePlayerId === myLeaguePlayer?.id,
      ) ?? [],
    [draftState, myLeaguePlayer?.id],
  );

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
    <Container size="xl" py="xl" pos="relative">
      <LoadingOverlay visible={isLoading} />
      {draftState && (
        <PausedOverlay
          status={draftState.draft.status}
          isCommissioner={isCommissioner}
          leagueId={leagueId}
        />
      )}

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
          <DraftHeader
            draftState={draftState}
            totalRounds={totalRounds}
            currentTurnPlayerName={currentTurnPlayer?.name ?? null}
          />
          {isCommissioner && (
            <CommissionerControls
              draftState={draftState}
              leagueId={leagueId}
              players={commissionerPlayerList}
              poolItemsById={poolItemsById}
            />
          )}
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <DraftBoard
                draftState={draftState}
                totalRounds={totalRounds}
                poolItemsById={poolItemsById}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <PickPanel
                draftState={draftState}
                poolItems={draftState.poolItems}
                isMyTurn={isMyTurn}
                onPick={handlePick}
                isPicking={makePick.isPending}
              />
            </Grid.Col>
          </Grid>
          <RosterStrip picks={myPicks} poolItemsById={poolItemsById} />
        </Stack>
      )}
    </Container>
  );
}
