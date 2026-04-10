import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";
import { DraftBoard } from "./DraftBoard";
import { makeDraftState, makePlayer, makePoolItem } from "./fixtures";
import type { DraftPick } from "./draft-types.ts";

function renderBoard(props: Parameters<typeof DraftBoard>[0]) {
  return render(
    <MantineProvider>
      <DraftBoard {...props} />
    </MantineProvider>,
  );
}

function pick(
  id: string,
  poolItemId: string,
  leaguePlayerId: string,
  pickNumber: number,
  autoPicked = false,
): DraftPick {
  return {
    id,
    draftId: "draft-1",
    leaguePlayerId,
    poolItemId,
    pickNumber,
    pickedAt: "2026-01-01T00:00:00Z",
    autoPicked,
  };
}

describe("DraftBoard", () => {
  afterEach(() => cleanup());

  const players = [
    makePlayer("p1", "Alice"),
    makePlayer("p2", "Bob"),
  ];
  const poolItemsById = {
    "item-1": makePoolItem("item-1", "bulbasaur"),
    "item-2": makePoolItem("item-2", "charmander"),
    "item-3": makePoolItem("item-3", "squirtle"),
    "item-4": makePoolItem("item-4", "pikachu"),
  };

  it("renders rows for each round and shows player column headers", () => {
    const draftState = makeDraftState({
      players,
      currentPick: 0,
      picks: [],
    });
    renderBoard({
      draftState,
      totalRounds: 3,
      poolItemsById,
    });
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/round 1/i)).toBeInTheDocument();
    expect(screen.getByText(/round 2/i)).toBeInTheDocument();
    expect(screen.getByText(/round 3/i)).toBeInTheDocument();
  });

  it("renders made picks in the correct cells", () => {
    const picks = [
      pick("pk-1", "item-1", "p1", 0), // Round 1, Alice
      pick("pk-2", "item-2", "p2", 1), // Round 1, Bob
    ];
    const draftState = makeDraftState({
      players,
      currentPick: 2,
      picks,
    });
    renderBoard({ draftState, totalRounds: 3, poolItemsById });

    expect(screen.getByText(/bulbasaur/i)).toBeInTheDocument();
    expect(screen.getByText(/charmander/i)).toBeInTheDocument();
  });

  it("highlights the current pick cell", () => {
    const draftState = makeDraftState({
      players,
      currentPick: 0,
      picks: [],
    });
    const { container } = renderBoard({
      draftState,
      totalRounds: 2,
      poolItemsById,
    });
    const currentCell = container.querySelector('[data-current-pick="true"]');
    expect(currentCell).not.toBeNull();
  });

  it("shows the upcoming player name in empty cells", () => {
    const draftState = makeDraftState({
      players,
      currentPick: 0,
      picks: [],
    });
    renderBoard({ draftState, totalRounds: 2, poolItemsById });
    // Alice appears as column header AND in at least one empty cell.
    const aliceHits = screen.getAllByText("Alice");
    expect(aliceHits.length).toBeGreaterThan(1);
  });

  it("shows an AUTO badge on cells for auto-picked picks", () => {
    const picks = [
      pick("pk-1", "item-1", "p1", 0, true), // auto-picked
      pick("pk-2", "item-2", "p2", 1, false), // normal
    ];
    const draftState = makeDraftState({
      players,
      currentPick: 2,
      picks,
    });
    const { container } = renderBoard({
      draftState,
      totalRounds: 2,
      poolItemsById,
    });

    const autoCell = container.querySelector(
      '[data-cell][data-auto-picked="true"]',
    );
    expect(autoCell).not.toBeNull();
    expect(within(autoCell as HTMLElement).getByText(/auto/i))
      .toBeInTheDocument();

    // Normal pick cell should not have the badge.
    const normalCells = container.querySelectorAll(
      '[data-cell]:not([data-auto-picked="true"])',
    );
    for (const cell of Array.from(normalCells)) {
      expect(within(cell as HTMLElement).queryByText(/^auto$/i)).toBeNull();
    }
  });

  it("reverses slot order on odd rounds (snake)", () => {
    // Pick 0 (round 0 slot 0) -> Alice; Pick 2 (round 1 slot 1 reversed -> Alice)
    const picks = [
      pick("pk-1", "item-1", "p1", 0),
      pick("pk-2", "item-2", "p2", 1),
      pick("pk-3", "item-3", "p2", 2), // snake back to Bob in round 2
      pick("pk-4", "item-4", "p1", 3),
    ];
    const draftState = makeDraftState({
      players,
      currentPick: 4,
      picks,
    });
    const { container } = renderBoard({
      draftState,
      totalRounds: 2,
      poolItemsById,
    });
    // Row 2, first visual column should be Bob (squirtle), last should be Alice (pikachu)
    const row2 = container.querySelector('[data-round="1"]');
    expect(row2).not.toBeNull();
    const cells = row2!.querySelectorAll("[data-cell]");
    expect(cells.length).toBe(2);
    // Columns are fixed: col0=Alice, col1=Bob.
    // Snake round 2: Bob picks first (pick 2, squirtle) then Alice (pick 3, pikachu)
    // so Alice's column shows pikachu, Bob's shows squirtle.
    expect(within(cells[0] as HTMLElement).getByText(/pikachu/i))
      .toBeInTheDocument();
    expect(within(cells[1] as HTMLElement).getByText(/squirtle/i))
      .toBeInTheDocument();
  });
});
