export interface SnakeTurnResult {
  leaguePlayerId: string;
  round: number;
  positionInRound: number;
}

export function resolveSnakeTurn(
  pickOrder: string[],
  currentPick: number,
): SnakeTurnResult {
  const n = pickOrder.length;
  const round = Math.floor(currentPick / n);
  const positionInRound = currentPick % n;

  const isReversed = round % 2 === 1;
  const playerIndex = isReversed ? n - 1 - positionInRound : positionInRound;

  return {
    leaguePlayerId: pickOrder[playerIndex],
    round,
    positionInRound,
  };
}

export interface BoardPick {
  pickNumber: number;
  leaguePlayerId: string;
  poolItemId: string;
}

export function buildDraftBoard(
  pickOrder: string[],
  picks: BoardPick[],
  totalRounds: number,
): (BoardPick | null)[][] {
  const board: (BoardPick | null)[][] = Array.from(
    { length: totalRounds },
    () => Array.from({ length: pickOrder.length }, () => null),
  );

  for (const pick of picks) {
    const { round } = resolveSnakeTurn(pickOrder, pick.pickNumber);
    const playerIndex = pickOrder.indexOf(pick.leaguePlayerId);
    if (playerIndex !== -1 && round < totalRounds) {
      board[round][playerIndex] = pick;
    }
  }

  return board;
}
