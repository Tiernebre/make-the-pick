import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { CommissionerControls } from "./CommissionerControls";
import { makeDraftState, makePick, makePoolItem } from "./fixtures";
import type { DraftPoolItem } from "@make-the-pick/shared";

const {
  mockUsePauseDraft,
  mockUseResumeDraft,
  mockUseUndoLastPick,
  mockPauseMutate,
  mockResumeMutate,
  mockUndoMutate,
} = vi.hoisted(() => ({
  mockUsePauseDraft: vi.fn(),
  mockUseResumeDraft: vi.fn(),
  mockUseUndoLastPick: vi.fn(),
  mockPauseMutate: vi.fn(),
  mockResumeMutate: vi.fn(),
  mockUndoMutate: vi.fn(),
}));

vi.mock("./use-draft-commissioner", () => ({
  usePauseDraft: mockUsePauseDraft,
  useResumeDraft: mockUseResumeDraft,
  useUndoLastPick: mockUseUndoLastPick,
}));

const leagueId = "league-1";
const players = [
  { leaguePlayerId: "p1", name: "Alice" },
  { leaguePlayerId: "p2", name: "Bob" },
];

function poolMap(items: DraftPoolItem[]): Record<string, DraftPoolItem> {
  const map: Record<string, DraftPoolItem> = {};
  for (const i of items) map[i.id] = i;
  return map;
}

function setupDefaultMocks() {
  mockUsePauseDraft.mockReturnValue({
    mutate: mockPauseMutate,
    isPending: false,
    error: null,
  });
  mockUseResumeDraft.mockReturnValue({
    mutate: mockResumeMutate,
    isPending: false,
    error: null,
  });
  mockUseUndoLastPick.mockReturnValue({
    mutate: mockUndoMutate,
    isPending: false,
    error: null,
  });
}

function renderControls(
  overrides: Partial<Parameters<typeof CommissionerControls>[0]> = {},
) {
  const poolItems = [
    makePoolItem("item-1", "bulbasaur", ["grass"]),
    makePoolItem("item-2", "charmander", ["fire"]),
  ];
  const draftState = makeDraftState({ poolItems });
  return render(
    <MantineProvider>
      <CommissionerControls
        draftState={draftState}
        leagueId={leagueId}
        players={players}
        poolItemsById={poolMap(poolItems)}
        {...overrides}
      />
    </MantineProvider>,
  );
}

describe("CommissionerControls", () => {
  beforeEach(() => {
    setupDefaultMocks();
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the Pause button when the draft is in progress", () => {
    renderControls();
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^resume$/i })).toBeNull();
  });

  it("shows the Resume button when the draft is paused", () => {
    const draftState = makeDraftState({ status: "paused" });
    renderControls({ draftState });
    expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^pause$/i })).toBeNull();
  });

  it("shows neither Pause nor Resume nor Undo when the draft is pending", () => {
    const draftState = makeDraftState({ status: "pending" });
    renderControls({ draftState });
    expect(screen.queryByRole("button", { name: /pause/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /resume/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /undo/i })).toBeNull();
  });

  it("hides the Undo button when there are no picks", () => {
    renderControls();
    expect(screen.queryByRole("button", { name: /undo/i })).toBeNull();
  });

  it("shows the Undo button when there is at least one pick", () => {
    const poolItems = [makePoolItem("item-1", "bulbasaur", ["grass"])];
    const draftState = makeDraftState({
      poolItems,
      picks: [makePick("item-1", "p1", 0)],
    });
    renderControls({
      draftState,
      poolItemsById: poolMap(poolItems),
    });
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
  });

  it("opens a confirmation modal with the player and pokemon name when Undo is clicked", () => {
    const poolItems = [makePoolItem("item-1", "bulbasaur", ["grass"])];
    const draftState = makeDraftState({
      poolItems,
      picks: [makePick("item-1", "p1", 0)],
    });
    renderControls({
      draftState,
      poolItemsById: poolMap(poolItems),
    });
    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/bulbasaur/i)).toBeInTheDocument();
  });

  it("calls the undo mutation with the leagueId when confirmed", () => {
    const poolItems = [makePoolItem("item-1", "bulbasaur", ["grass"])];
    const draftState = makeDraftState({
      poolItems,
      picks: [makePick("item-1", "p1", 0)],
    });
    renderControls({
      draftState,
      poolItemsById: poolMap(poolItems),
    });
    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirm undo$/i }));
    expect(mockUndoMutate).toHaveBeenCalledWith({ leagueId });
  });

  it("does NOT call the undo mutation when canceled", () => {
    const poolItems = [makePoolItem("item-1", "bulbasaur", ["grass"])];
    const draftState = makeDraftState({
      poolItems,
      picks: [makePick("item-1", "p1", 0)],
    });
    renderControls({
      draftState,
      poolItemsById: poolMap(poolItems),
    });
    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(mockUndoMutate).not.toHaveBeenCalled();
  });

  it("calls the pause mutation when Pause is clicked", () => {
    renderControls();
    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(mockPauseMutate).toHaveBeenCalledWith({ leagueId });
  });

  it("calls the resume mutation when Resume is clicked", () => {
    const draftState = makeDraftState({ status: "paused" });
    renderControls({ draftState });
    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    expect(mockResumeMutate).toHaveBeenCalledWith({ leagueId });
  });

  it("disables and shows loading state on the pause button while pending", () => {
    mockUsePauseDraft.mockReturnValue({
      mutate: mockPauseMutate,
      isPending: true,
      error: null,
    });
    renderControls();
    const btn = screen.getByRole("button", { name: /pause/i });
    expect(btn.hasAttribute("data-loading")).toBe(true);
  });

  it("shows an error message when the pause mutation errors", () => {
    mockUsePauseDraft.mockReturnValue({
      mutate: mockPauseMutate,
      isPending: false,
      error: { message: "Boom" },
    });
    renderControls();
    expect(screen.getByText(/Boom/)).toBeInTheDocument();
  });
});
