import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { LeagueDetailPage } from "./LeagueDetailPage";

const {
  mockUseLeague,
  mockUseLeaguePlayers,
  mockUseDeleteLeague,
  mockDeleteMutate,
  mockUseUpdateLeagueSettings,
  mockUseAdvanceLeagueStatus,
  mockAdvanceMutate,
} = vi.hoisted(
  () => ({
    mockUseLeague: vi.fn(),
    mockUseLeaguePlayers: vi.fn(),
    mockUseDeleteLeague: vi.fn(),
    mockDeleteMutate: vi.fn(),
    mockUseUpdateLeagueSettings: vi.fn(),
    mockUseAdvanceLeagueStatus: vi.fn(),
    mockAdvanceMutate: vi.fn(),
  }),
);

vi.mock("./use-leagues", () => ({
  useLeague: mockUseLeague,
  useLeaguePlayers: mockUseLeaguePlayers,
  useDeleteLeague: mockUseDeleteLeague,
  useUpdateLeagueSettings: mockUseUpdateLeagueSettings,
  useAdvanceLeagueStatus: mockUseAdvanceLeagueStatus,
}));

vi.mock("../pokemon-version/use-pokemon-versions", () => ({
  usePokemonVersions: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../auth", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    useParams: () => ({ id: "league-1" }),
    useLocation: () => ["/leagues/league-1", vi.fn()],
  };
});

const mockLeague = {
  id: "league-1",
  name: "Test League",
  status: "setup",
  inviteCode: "ABC123XY",
  createdBy: "user-1",
  rulesConfig: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function renderPage() {
  return render(
    <MantineProvider>
      <LeagueDetailPage />
    </MantineProvider>,
  );
}

describe("LeagueDetailPage", () => {
  beforeEach(() => {
    mockUseLeaguePlayers.mockReturnValue({ data: [], isLoading: false });
    mockUseDeleteLeague.mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });
    mockUseUpdateLeagueSettings.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseAdvanceLeagueStatus.mockReturnValue({
      mutate: mockAdvanceMutate,
      isPending: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows loading overlay when data is loading", () => {
    mockUseLeague.mockReturnValue({ data: undefined, isLoading: true });
    renderPage();
    expect(
      document.querySelector(
        "[data-mantine-loading-overlay],.mantine-LoadingOverlay-root",
      ),
    ).toBeInTheDocument();
  });

  it("renders the league name as a title", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    expect(screen.getByText("Test League")).toBeInTheDocument();
  });

  it("displays the league status", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    expect(screen.getByText(/setup/i)).toBeInTheDocument();
  });

  it("displays the invite code", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    expect(screen.getByText("ABC123XY")).toBeInTheDocument();
  });

  it("has a back link to the leagues list", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    const backLink = screen.getByRole("link", { name: /back to leagues/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("calls useLeague with the id from route params", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    expect(mockUseLeague).toHaveBeenCalledWith("league-1");
  });

  it("shows delete button when user is the commissioner", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.getByRole("button", { name: /delete league/i }),
    ).toBeInTheDocument();
  });

  it("does not show delete button when user is not the commissioner", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /delete league/i }),
    ).not.toBeInTheDocument();
  });

  it("shows advance button when commissioner and league has a next status", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: null,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.getByRole("button", { name: /advance to drafting/i }),
    ).toBeInTheDocument();
  });

  it("does not show advance button when user is not commissioner", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        sportType: "pokemon",
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: null,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /advance to/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show advance button when league is complete", () => {
    mockUseLeague.mockReturnValue({
      data: { ...mockLeague, status: "complete" },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /advance to/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a link to the draft page when league status is drafting", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        status: "drafting",
        sportType: "pokemon",
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: null,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    const draftLink = screen.getByRole("link", { name: /go to draft/i });
    expect(draftLink).toBeInTheDocument();
    expect(draftLink).toHaveAttribute("href", "/leagues/league-1/draft");
  });

  it("does not show draft link when league status is setup", () => {
    mockUseLeague.mockReturnValue({
      data: mockLeague,
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("link", { name: /go to draft/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show advance button when setup settings are not configured", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        status: "setup",
        sportType: null,
        rulesConfig: null,
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /advance to/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show advance button when maxPlayers is missing", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        status: "setup",
        sportType: "pokemon",
        maxPlayers: null,
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: null,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /advance to/i }),
    ).not.toBeInTheDocument();
  });

  it("does not render a Save Settings button", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: null,
          poolSizeMultiplier: 2,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /save settings/i }),
    ).not.toBeInTheDocument();
  });
});
