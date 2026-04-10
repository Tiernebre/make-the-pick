import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { LeagueListPage } from "./LeagueListPage";

const { mockUseLeagues, mockUseJoinLeague } = vi.hoisted(() => ({
  mockUseLeagues: vi.fn(),
  mockUseJoinLeague: vi.fn(),
}));

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock("./use-leagues", () => ({
  useLeagues: mockUseLeagues,
  useJoinLeague: mockUseJoinLeague,
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return { ...actual, useLocation: () => ["/", mockNavigate] };
});

function renderPage() {
  return render(
    <MantineProvider>
      <LeagueListPage />
    </MantineProvider>,
  );
}

const mockLeagues = [
  {
    id: "1",
    name: "Johto Classic",
    status: "drafting",
    inviteCode: "ABC123XY",
    createdBy: "user1",
    sportType: "pokemon",
    maxPlayers: 8,
    rulesConfig: null,
    playerCount: 4,
    userRole: "commissioner" as const,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Kanto Rumble",
    status: "setup",
    inviteCode: "DEF456ZZ",
    createdBy: "user2",
    sportType: "pokemon",
    maxPlayers: 6,
    rulesConfig: null,
    playerCount: 2,
    userRole: "member" as const,
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  },
];

function setupMocks(
  overrides: { data?: typeof mockLeagues; isLoading?: boolean } = {},
) {
  mockUseLeagues.mockReturnValue({
    data: overrides.data ?? [],
    isLoading: overrides.isLoading ?? false,
  });
  mockUseJoinLeague.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
}

describe("LeagueListPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the page title", () => {
    setupMocks();
    renderPage();
    expect(screen.getByText("My Leagues")).toBeInTheDocument();
  });

  it("shows a warm empty state when there are no leagues", () => {
    setupMocks({ data: [] });
    renderPage();
    expect(
      screen.getByText(/your adventure starts here/i),
    ).toBeInTheDocument();
  });

  it("renders a row per league in the table", () => {
    setupMocks({ data: mockLeagues });
    renderPage();
    expect(screen.getByText("Johto Classic")).toBeInTheDocument();
    expect(screen.getByText("Kanto Rumble")).toBeInTheDocument();
  });

  it("renders a status badge for each league", () => {
    setupMocks({ data: mockLeagues });
    renderPage();
    expect(screen.getByText(/drafting/i)).toBeInTheDocument();
    expect(screen.getAllByText(/setup/i).length).toBeGreaterThan(0);
  });

  it("renders player count like 4 / 8", () => {
    setupMocks({ data: mockLeagues });
    renderPage();
    expect(screen.getByText("4 / 8")).toBeInTheDocument();
    expect(screen.getByText("2 / 6")).toBeInTheDocument();
  });

  it("renders the user's role for each league", () => {
    setupMocks({ data: mockLeagues });
    renderPage();
    expect(screen.getByText(/commissioner/i)).toBeInTheDocument();
    expect(screen.getByText(/^member$/i)).toBeInTheDocument();
  });

  it("has a Create League link pointing to /leagues/new", () => {
    setupMocks();
    renderPage();
    const link = screen.getByRole("link", { name: /create league/i });
    expect(link).toHaveAttribute("href", "/leagues/new");
  });

  it("has a Join League button that opens the modal", () => {
    setupMocks();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /join league/i }));
    expect(document.body).toHaveAttribute("data-scroll-locked");
  });

  it("navigates to a league detail when its row is clicked", () => {
    setupMocks({ data: mockLeagues });
    renderPage();
    fireEvent.click(screen.getByText("Johto Classic"));
    expect(mockNavigate).toHaveBeenCalledWith("/leagues/1");
  });
});
