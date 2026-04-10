import { Avatar, Card, Group, ScrollArea, Stack, Text } from "@mantine/core";
import type {
  DraftPick,
  DraftPoolItem,
  DraftState,
} from "@make-the-pick/shared";
import { useMemo } from "react";

export interface DraftBoardProps {
  draftState: DraftState;
  totalRounds: number;
  poolItemsById: Record<string, DraftPoolItem>;
}

interface BoardCell {
  round: number;
  /** Visual column (0 = left). Columns are fixed to pickOrder. */
  columnIndex: number;
  leaguePlayerId: string;
  playerName: string;
  /** Pick number (0-indexed, global) landing in this cell under snake order. */
  pickNumber: number;
  pick: DraftPick | undefined;
}

function buildGrid(
  draftState: DraftState,
  totalRounds: number,
): BoardCell[][] {
  const pickOrder = draftState.draft.pickOrder;
  const playersCount = pickOrder.length;
  const playerNameById = new Map(
    draftState.players.map((p) => [p.id, p.name]),
  );
  const picksByNumber = new Map(
    draftState.picks.map((p) => [p.pickNumber, p]),
  );

  const rows: BoardCell[][] = [];
  for (let round = 0; round < totalRounds; round++) {
    const reversed = round % 2 === 1;
    const row: BoardCell[] = [];
    for (let columnIndex = 0; columnIndex < playersCount; columnIndex++) {
      // In snake, odd rounds walk pickOrder right-to-left, but the visual
      // column for a player stays fixed. So if columnIndex = 0 (Alice) and
      // reversed, Alice's pick is the LAST pick of this round.
      const positionInRound = reversed
        ? playersCount - 1 - columnIndex
        : columnIndex;
      const pickNumber = round * playersCount + positionInRound;
      const leaguePlayerId = pickOrder[columnIndex] ?? "";
      row.push({
        round,
        columnIndex,
        leaguePlayerId,
        playerName: playerNameById.get(leaguePlayerId) ?? "—",
        pickNumber,
        pick: picksByNumber.get(pickNumber),
      });
    }
    rows.push(row);
  }
  return rows;
}

export function DraftBoard(
  { draftState, totalRounds, poolItemsById }: DraftBoardProps,
) {
  const grid = useMemo(
    () => buildGrid(draftState, totalRounds),
    [draftState, totalRounds],
  );
  const playersCount = draftState.draft.pickOrder.length;
  const currentPick = draftState.draft.currentPick;
  const playerNameById = new Map(
    draftState.players.map((p) => [p.id, p.name]),
  );

  return (
    <Card withBorder shadow="sm" padding="md" radius="md">
      <ScrollArea scrollbarSize={8} offsetScrollbars type="auto">
        <Stack gap="xs" style={{ minWidth: Math.max(320, playersCount * 160) }}>
          {/* Column header row */}
          <Group gap="xs" wrap="nowrap" style={{ paddingLeft: 80 }}>
            {draftState.draft.pickOrder.map((playerId) => (
              <Text
                key={playerId}
                fw={600}
                size="sm"
                ta="center"
                style={{ flex: 1, minWidth: 140 }}
              >
                {playerNameById.get(playerId) ?? "—"}
              </Text>
            ))}
          </Group>

          {grid.map((row, roundIdx) => (
            <Group
              key={`round-${roundIdx}`}
              gap="xs"
              wrap="nowrap"
              data-round={roundIdx}
            >
              <Text
                size="xs"
                c="dimmed"
                style={{ width: 72, textAlign: "right" }}
              >
                Round {roundIdx + 1} {roundIdx % 2 === 1 ? "\u2190" : "\u2192"}
              </Text>
              {row.map((cell) => {
                const isCurrent = cell.pickNumber === currentPick &&
                  !cell.pick;
                const item = cell.pick
                  ? poolItemsById[cell.pick.poolItemId]
                  : undefined;
                return (
                  <Card
                    key={`${roundIdx}-${cell.columnIndex}`}
                    withBorder
                    padding="xs"
                    radius="sm"
                    data-cell
                    data-current-pick={isCurrent ? "true" : undefined}
                    style={{
                      flex: 1,
                      minWidth: 140,
                      minHeight: 72,
                      backgroundColor: isCurrent
                        ? "var(--mantine-color-mint-green-light, #e6fff2)"
                        : undefined,
                      borderColor: isCurrent
                        ? "var(--mantine-color-mint-green-filled, #21c76e)"
                        : undefined,
                    }}
                  >
                    {item
                      ? (
                        <Group gap="xs" wrap="nowrap" align="center">
                          <Avatar
                            src={item.thumbnailUrl}
                            alt={item.name}
                            size="sm"
                            radius="sm"
                          />
                          <Stack gap={0} style={{ minWidth: 0 }}>
                            <Text size="xs" c="dimmed">
                              Pick {cell.pickNumber + 1}
                            </Text>
                            <Text size="sm" fw={500} tt="capitalize" truncate>
                              {item.name}
                            </Text>
                          </Stack>
                        </Group>
                      )
                      : (
                        <Stack gap={0}>
                          <Text size="xs" c="dimmed">
                            Pick {cell.pickNumber + 1}
                          </Text>
                          <Text size="sm" c="dimmed" truncate>
                            {cell.playerName}
                          </Text>
                        </Stack>
                      )}
                  </Card>
                );
              })}
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Card>
  );
}
