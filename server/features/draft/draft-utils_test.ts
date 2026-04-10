import { assertEquals } from "@std/assert";
import { buildDraftBoard, resolveSnakeTurn } from "./draft-utils.ts";

const PLAYERS = ["alice", "bob", "charlie"];

Deno.test("resolveSnakeTurn", async (t) => {
  await t.step("round 0 (forward) - first pick goes to first player", () => {
    const result = resolveSnakeTurn(PLAYERS, 0);
    assertEquals(result, {
      leaguePlayerId: "alice",
      round: 0,
      positionInRound: 0,
    });
  });

  await t.step("round 0 (forward) - second pick goes to second player", () => {
    const result = resolveSnakeTurn(PLAYERS, 1);
    assertEquals(result, {
      leaguePlayerId: "bob",
      round: 0,
      positionInRound: 1,
    });
  });

  await t.step("round 0 (forward) - last pick goes to last player", () => {
    const result = resolveSnakeTurn(PLAYERS, 2);
    assertEquals(result, {
      leaguePlayerId: "charlie",
      round: 0,
      positionInRound: 2,
    });
  });

  await t.step("round 1 (reverse) - first pick goes to last player", () => {
    const result = resolveSnakeTurn(PLAYERS, 3);
    assertEquals(result, {
      leaguePlayerId: "charlie",
      round: 1,
      positionInRound: 0,
    });
  });

  await t.step("round 1 (reverse) - second pick goes to second player", () => {
    const result = resolveSnakeTurn(PLAYERS, 4);
    assertEquals(result, {
      leaguePlayerId: "bob",
      round: 1,
      positionInRound: 1,
    });
  });

  await t.step("round 1 (reverse) - last pick goes to first player", () => {
    const result = resolveSnakeTurn(PLAYERS, 5);
    assertEquals(result, {
      leaguePlayerId: "alice",
      round: 1,
      positionInRound: 2,
    });
  });

  await t.step("round 2 (forward again) - picks forward", () => {
    const result = resolveSnakeTurn(PLAYERS, 6);
    assertEquals(result, {
      leaguePlayerId: "alice",
      round: 2,
      positionInRound: 0,
    });
  });

  await t.step("round 2 (forward) - last pick", () => {
    const result = resolveSnakeTurn(PLAYERS, 8);
    assertEquals(result, {
      leaguePlayerId: "charlie",
      round: 2,
      positionInRound: 2,
    });
  });

  await t.step("round 3 (reverse) - first pick", () => {
    const result = resolveSnakeTurn(PLAYERS, 9);
    assertEquals(result, {
      leaguePlayerId: "charlie",
      round: 3,
      positionInRound: 0,
    });
  });

  await t.step("2 players - alternates correctly", () => {
    const twoPlayers = ["x", "y"];
    assertEquals(resolveSnakeTurn(twoPlayers, 0), {
      leaguePlayerId: "x",
      round: 0,
      positionInRound: 0,
    });
    assertEquals(resolveSnakeTurn(twoPlayers, 1), {
      leaguePlayerId: "y",
      round: 0,
      positionInRound: 1,
    });
    assertEquals(resolveSnakeTurn(twoPlayers, 2), {
      leaguePlayerId: "y",
      round: 1,
      positionInRound: 0,
    });
    assertEquals(resolveSnakeTurn(twoPlayers, 3), {
      leaguePlayerId: "x",
      round: 1,
      positionInRound: 1,
    });
    assertEquals(resolveSnakeTurn(twoPlayers, 4), {
      leaguePlayerId: "x",
      round: 2,
      positionInRound: 0,
    });
  });

  await t.step("single player - always same player", () => {
    const onePlayer = ["solo"];
    assertEquals(resolveSnakeTurn(onePlayer, 0), {
      leaguePlayerId: "solo",
      round: 0,
      positionInRound: 0,
    });
    assertEquals(resolveSnakeTurn(onePlayer, 1), {
      leaguePlayerId: "solo",
      round: 1,
      positionInRound: 0,
    });
    assertEquals(resolveSnakeTurn(onePlayer, 5), {
      leaguePlayerId: "solo",
      round: 5,
      positionInRound: 0,
    });
  });

  await t.step("large pick number", () => {
    const result = resolveSnakeTurn(PLAYERS, 29);
    assertEquals(result.round, 9);
    assertEquals(result.positionInRound, 2);
    // Round 9 is odd, so reversed. Position 2 -> pickOrder[3-1-2] = pickOrder[0] = "alice"
    assertEquals(result.leaguePlayerId, "alice");
  });
});

Deno.test("buildDraftBoard", async (t) => {
  await t.step("maps picks into round x player grid", () => {
    const pickOrder = ["p1", "p2", "p3"];
    const picks = [
      { pickNumber: 0, leaguePlayerId: "p1", poolItemId: "item-a" },
      { pickNumber: 1, leaguePlayerId: "p2", poolItemId: "item-b" },
      { pickNumber: 2, leaguePlayerId: "p3", poolItemId: "item-c" },
      { pickNumber: 3, leaguePlayerId: "p3", poolItemId: "item-d" },
      { pickNumber: 4, leaguePlayerId: "p2", poolItemId: "item-e" },
    ];
    const board = buildDraftBoard(pickOrder, picks, 2);
    // board[round][playerIndex] = pick or null
    assertEquals(board.length, 2); // 2 rounds
    assertEquals(board[0].length, 3); // 3 players
    assertEquals(board[0][0]?.poolItemId, "item-a"); // round 0, p1
    assertEquals(board[0][1]?.poolItemId, "item-b"); // round 0, p2
    assertEquals(board[0][2]?.poolItemId, "item-c"); // round 0, p3
    // Round 1 (reversed): pick 3 = p3, pick 4 = p2
    // Board columns are always ordered by pickOrder (p1, p2, p3)
    assertEquals(board[1][2]?.poolItemId, "item-d"); // round 1, p3
    assertEquals(board[1][1]?.poolItemId, "item-e"); // round 1, p2
    assertEquals(board[1][0], null); // round 1, p1 hasn't picked yet
  });

  await t.step("returns empty board when no picks", () => {
    const board = buildDraftBoard(["p1", "p2"], [], 3);
    assertEquals(board.length, 3);
    assertEquals(board[0], [null, null]);
    assertEquals(board[1], [null, null]);
    assertEquals(board[2], [null, null]);
  });
});
