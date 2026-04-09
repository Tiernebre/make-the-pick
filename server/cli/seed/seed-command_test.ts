import { assertEquals } from "@std/assert";
import { parseArgs } from "./seed-command.ts";

Deno.test("parseArgs", async (t) => {
  await t.step("defaults to data command with 5 users and 2 leagues", () => {
    const result = parseArgs(["data"]);
    assertEquals(result, {
      command: "data",
      options: { users: 5, leagues: 2 },
    });
  });

  await t.step("parses --users and --leagues flags for data command", () => {
    const result = parseArgs(["data", "--users", "10", "--leagues", "3"]);
    assertEquals(result, {
      command: "data",
      options: { users: 10, leagues: 3 },
    });
  });

  await t.step("treats unknown subcommand args as data flags", () => {
    const result = parseArgs(["--users", "7"]);
    assertEquals(result, {
      command: "data",
      options: { users: 7, leagues: 2 },
    });
  });

  await t.step("parses league command with --league-id and --players", () => {
    const result = parseArgs([
      "league",
      "--league-id",
      "abc-123",
      "--players",
      "6",
    ]);
    assertEquals(result, {
      command: "league",
      options: { leagueId: "abc-123", players: 6 },
    });
  });

  await t.step("league command defaults players to 4", () => {
    const result = parseArgs(["league", "--league-id", "xyz"]);
    assertEquals(result, {
      command: "league",
      options: { leagueId: "xyz", players: 4 },
    });
  });
});
