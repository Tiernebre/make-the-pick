import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";
import { DraftHeader } from "./DraftHeader";
import { makeDraftState, makePlayer } from "./fixtures";

function renderHeader(props: Parameters<typeof DraftHeader>[0]) {
  return render(
    <MantineProvider>
      <DraftHeader {...props} />
    </MantineProvider>,
  );
}

describe("DraftHeader", () => {
  afterEach(() => cleanup());

  it("shows current round and total rounds (1-indexed)", () => {
    const draftState = makeDraftState({
      currentPick: 2, // round 1 (0-indexed) for 2 players
    });
    renderHeader({ draftState, totalRounds: 6, currentTurnPlayerName: "Bob" });
    expect(screen.getByText(/round 2 of 6/i)).toBeInTheDocument();
  });

  it("shows current pick number and total pick count (1-indexed)", () => {
    const draftState = makeDraftState({ currentPick: 3 });
    renderHeader({ draftState, totalRounds: 6, currentTurnPlayerName: "Bob" });
    // 2 players x 6 rounds = 12 picks, currentPick=3 -> pick 4
    expect(screen.getByText(/pick 4 of 12/i)).toBeInTheDocument();
  });

  it("shows draft format label", () => {
    const draftState = makeDraftState();
    renderHeader({ draftState, totalRounds: 6, currentTurnPlayerName: "Bob" });
    expect(screen.getByText(/snake/i)).toBeInTheDocument();
  });

  it("prominently shows whose turn it is", () => {
    const draftState = makeDraftState({
      players: [makePlayer("p1", "Alice"), makePlayer("p2", "Bob")],
    });
    renderHeader({
      draftState,
      totalRounds: 6,
      currentTurnPlayerName: "Bob",
    });
    expect(screen.getByText(/bob/i)).toBeInTheDocument();
  });

  it("shows draft status", () => {
    const draftState = makeDraftState({ status: "in_progress" });
    renderHeader({ draftState, totalRounds: 6, currentTurnPlayerName: "Bob" });
    expect(screen.getByText(/in_progress|in progress/i)).toBeInTheDocument();
  });

  it("shows a pick timer when the draft state has a current turn deadline", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const draftState = makeDraftState({ currentTurnDeadline: future });
    renderHeader({ draftState, totalRounds: 6, currentTurnPlayerName: "Bob" });
    expect(screen.getByTestId("pick-timer")).toBeInTheDocument();
  });

  it("does not show a pick timer when the draft state has no deadline", () => {
    const draftState = makeDraftState({ currentTurnDeadline: null });
    renderHeader({ draftState, totalRounds: 6, currentTurnPlayerName: "Bob" });
    expect(screen.queryByTestId("pick-timer")).toBeNull();
  });
});
