import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { DraftPage } from "./DraftPage";
import { makeDraftState, makePlayer } from "./fixtures";

const {
  mockUseLeague,
  mockUseLeaguePlayers,
  mockUseDraft,
  mockUseMakePick,
  mockUseStartDraft,
  mockStartDraftMutate,
  mockMakePickMutate,
  mockUseDraftEvents,
} = vi.hoisted(() => ({
  mockUseLeague: vi.fn(),
  mockUseLeaguePlayers: vi.fn(),
  mockUseDraft: vi.fn(),
  mockUseMakePick: vi.fn(),
  mockUseStartDraft: vi.fn(),
  mockStartDraftMutate: vi.fn(),
  mockMakePickMutate: vi.fn(),
  mockUseDraftEvents: vi.fn(),
}));

vi.mock("../league/use-leagues", () => ({
  useLeague: mockUseLeague,
  useLeaguePlayers: mockUseLeaguePlayers,
}));

vi.mock("./use-draft", () => ({
  useDraft: mockUseDraft,
  useMakePick: mockUseMakePick,
  useStartDraft: mockUseStartDraft,
}));

vi.mock("./use-draft-events", () => ({
  useDraftEvents: mockUseDraftEvents,
}));

vi.mock("../../auth", () => ({
  useSession: () => ({ data: { user: { id: "user-p1" } } }),
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    useParams: () => ({ id: "league-1" }),
  };
});

const mockLeague = {
  id: "league-1",
  name: "Test League",
  status: "drafting",
  inviteCode: "ABC123XY",
  sportType: "pokemon",
  rulesConfig: {
    draftFormat: "snake",
    numberOfRounds: 3,
    pickTimeLimitSeconds: null,
  },
  createdAt: "2026-01-01T00:00:00Z",
};

const commissionerPlayer = {
  id: "p1",
  userId: "user-p1",
  name: "Alice",
  image: null,
  role: "commissioner" as const,
  joinedAt: "2026-01-01T00:00:00Z",
};

const memberPlayer = {
  id: "p2",
  userId: "user-p2",
  name: "Bob",
  image: null,
  role: "member" as const,
  joinedAt: "2026-01-01T00:00:00Z",
};

function renderPage() {
  return render(
    <MantineProvider>
      <DraftPage />
    </MantineProvider>,
  );
}

describe("DraftPage", () => {
  beforeEach(() => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [commissionerPlayer, memberPlayer],
      isLoading: false,
    });
    mockUseDraft.mockReturnValue({
      data: makeDraftState({
        players: [
          makePlayer("p1", "Alice", {
            userId: "user-p1",
            role: "commissioner",
          }),
          makePlayer("p2", "Bob", { userId: "user-p2" }),
        ],
        currentPick: 0,
      }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseMakePick.mockReturnValue({
      mutate: mockMakePickMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    });
    mockUseStartDraft.mockReturnValue({
      mutate: mockStartDraftMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    });
    mockUseDraftEvents.mockReturnValue({ status: "idle" });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows loading overlay when league is loading", () => {
    mockUseLeague.mockReturnValue({ data: undefined, isLoading: true });
    mockUseDraft.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(
      document.querySelector(
        "[data-mantine-loading-overlay],.mantine-LoadingOverlay-root",
      ),
    ).toBeInTheDocument();
  });

  it("shows the league name in the title", () => {
    renderPage();
    expect(screen.getByText("Test League — Draft")).toBeInTheDocument();
  });

  it("has a back link to the league detail page", () => {
    renderPage();
    const backLink = screen.getByRole("link", { name: /back to league/i });
    expect(backLink).toHaveAttribute("href", "/leagues/league-1");
  });

  it("renders the draft board, pick panel, and header when draft is in progress", () => {
    renderPage();
    expect(screen.getByText(/round 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/available pool/i)).toBeInTheDocument();
  });

  it("shows the pick timer in the header when the draft state has a deadline", () => {
    mockUseDraft.mockReturnValue({
      data: makeDraftState({
        players: [
          makePlayer("p1", "Alice", {
            userId: "user-p1",
            role: "commissioner",
          }),
          makePlayer("p2", "Bob", { userId: "user-p2" }),
        ],
        currentPick: 0,
        currentTurnDeadline: new Date(Date.now() + 45_000).toISOString(),
      }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByTestId("pick-timer")).toBeInTheDocument();
  });

  it("shows waiting message when draft status is pending", () => {
    mockUseDraft.mockReturnValue({
      data: makeDraftState({
        status: "pending",
        players: [
          makePlayer("p1", "Alice", {
            userId: "user-p1",
            role: "commissioner",
          }),
          makePlayer("p2", "Bob", { userId: "user-p2" }),
        ],
      }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/draft has not started/i)).toBeInTheDocument();
    expect(
      screen.getByText(/waiting for the commissioner/i),
    ).toBeInTheDocument();
  });

  it("shows Start Draft button when pending and user is commissioner", () => {
    mockUseDraft.mockReturnValue({
      data: makeDraftState({ status: "pending" }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(
      screen.getByRole("button", { name: /start draft/i }),
    ).toBeInTheDocument();
  });

  it("subscribes to live draft events with the league id when the draft is in progress", () => {
    renderPage();
    expect(mockUseDraftEvents).toHaveBeenCalled();
    const [calledLeagueId, calledOpts] = mockUseDraftEvents.mock.calls[0];
    expect(calledLeagueId).toBe("league-1");
    expect(calledOpts).toMatchObject({ enabled: true });
  });

  it("does not enable the draft events subscription when the draft is pending", () => {
    mockUseDraft.mockReturnValue({
      data: makeDraftState({ status: "pending" }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    const lastCall =
      mockUseDraftEvents.mock.calls[mockUseDraftEvents.mock.calls.length - 1];
    expect(lastCall[0]).toBe("league-1");
    expect(lastCall[1]).toMatchObject({ enabled: false });
  });

  it("does not show Start Draft button when pending and user is not commissioner", () => {
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        { ...commissionerPlayer, userId: "user-someone-else" },
        { ...memberPlayer, userId: "user-p1" },
      ],
      isLoading: false,
    });
    mockUseDraft.mockReturnValue({
      data: makeDraftState({ status: "pending" }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /start draft/i }),
    ).not.toBeInTheDocument();
  });
});
