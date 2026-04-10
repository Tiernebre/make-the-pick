/**
 * Shared snake-draft helpers used by the client draft room.
 *
 * The server owns the authoritative pick order, but the client needs the same
 * arithmetic to (a) render the board grid with rows = rounds and (b) know
 * whose turn is up without a round-trip.
 *
 * All functions treat `currentPick` as a 0-indexed pick counter (0 = first
 * pick of round 0) and `pickOrder` as the array of leaguePlayerIds in first-
 * round order.
 */

export function roundForPick(pickNumber: number, playersCount: number): number {
  if (playersCount <= 0) return 0;
  return Math.floor(pickNumber / playersCount);
}

export function slotForPick(
  pickNumber: number,
  playersCount: number,
): number {
  if (playersCount <= 0) return 0;
  const positionInRound = pickNumber % playersCount;
  const round = roundForPick(pickNumber, playersCount);
  // In snake, even rounds go in pick order, odd rounds go reversed.
  return round % 2 === 0 ? positionInRound : playersCount - 1 - positionInRound;
}

export function leaguePlayerForPick(
  pickNumber: number,
  pickOrder: string[],
): string | null {
  if (pickOrder.length === 0) return null;
  const slot = slotForPick(pickNumber, pickOrder.length);
  return pickOrder[slot] ?? null;
}
