import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { LeagueSettingsPage } from "./LeagueSettingsPage";

const {
  mockUseLeague,
  mockUseLeaguePlayers,
  mockUseUpdateLeagueSettings,
} = vi.hoisted(() => ({
  mockUseLeague: vi.fn(),
  mockUseLeaguePlayers: vi.fn(),
  mockUseUpdateLeagueSettings: vi.fn(),
}));

vi.mock("./use-leagues", () => ({
  useLeague: mockUseLeague,
  useLeaguePlayers: mockUseLeaguePlayers,
  useUpdateLeagueSettings: mockUseUpdateLeagueSettings,
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
    useLocation: () => ["/leagues/league-1/settings", vi.fn()],
  };
});

const mockLeague = {
  id: "league-1",
  name: "Test League",
  status: "setup",
  inviteCode: "ABC123XY",
  createdBy: "user-1",
  sportType: null,
  maxPlayers: null,
  rulesConfig: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function renderPage() {
  return render(
    <MantineProvider>
      <LeagueSettingsPage />
    </MantineProvider>,
  );
}

describe("LeagueSettingsPage", () => {
  beforeEach(() => {
    mockUseUpdateLeagueSettings.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the page title", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({ data: [], isLoading: false });
    renderPage();
    expect(screen.getByText("League Settings")).toBeInTheDocument();
  });

  it("shows the league name as a subtitle", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({ data: [], isLoading: false });
    renderPage();
    expect(screen.getByText("Test League")).toBeInTheDocument();
  });

  it("links back to the league detail page", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({ data: [], isLoading: false });
    renderPage();
    const back = screen.getByRole("link", { name: /back to league/i });
    expect(back).toHaveAttribute("href", "/leagues/league-1");
  });

  it("renders editable form when user is commissioner during setup", () => {
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
    expect(screen.getByText(/sport type/i)).toBeInTheDocument();
    expect(screen.getByText(/draft format/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^draft mode/i }))
      .toBeInTheDocument();
    expect(screen.getByText(/number of rounds/i)).toBeInTheDocument();
    expect(screen.getByText(/max players/i)).toBeInTheDocument();
  });

  it("shows draft mode in the locked read-only view", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        status: "drafting",
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig: {
          draftFormat: "snake",
          draftMode: "species",
          numberOfRounds: 6,
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
    expect(screen.getByText(/^draft mode$/i)).toBeInTheDocument();
    expect(screen.getByText(/^species$/i)).toBeInTheDocument();
  });

  it("shows read-only view for non-commissioners", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 6,
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
    expect(screen.queryByLabelText(/sport type/i)).not.toBeInTheDocument();
    expect(screen.getByText(/only the commissioner/i)).toBeInTheDocument();
  });

  it("locks settings once the league leaves setup, even for commissioner", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        status: "drafting",
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 6,
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
    expect(screen.queryByLabelText(/draft format/i)).not.toBeInTheDocument();
    expect(screen.getByText(/settings are locked/i)).toBeInTheDocument();
  });
});
