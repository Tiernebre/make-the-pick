import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { LeagueListPage } from "./LeagueListPage";

const { mockUseLeagues, mockUseCreateLeague, mockUseJoinLeague } = vi.hoisted(
  () => ({
    mockUseLeagues: vi.fn(),
    mockUseCreateLeague: vi.fn(),
    mockUseJoinLeague: vi.fn(),
  }),
);

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock("./use-leagues", () => ({
  useLeagues: mockUseLeagues,
  useCreateLeague: mockUseCreateLeague,
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
    name: "League One",
    status: "setup",
    inviteCode: "ABC123XY",
    createdBy: "user1",
    rulesConfig: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "League Two",
    status: "setup",
    inviteCode: "DEF456ZZ",
    createdBy: "user2",
    rulesConfig: null,
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
  mockUseCreateLeague.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
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

  it("shows loading overlay when data is loading", () => {
    setupMocks({ isLoading: true });
    renderPage();
    expect(
      document.querySelector(
        "[data-mantine-loading-overlay],.mantine-LoadingOverlay-root",
      ),
    ).toBeInTheDocument();
  });

  it("shows empty state when there are no leagues", () => {
    setupMocks({ data: [] });
    renderPage();
    expect(
      screen.getByText(/you haven't joined any leagues yet/i),
    ).toBeInTheDocument();
  });

  it("renders league cards when data exists", () => {
    setupMocks({ data: mockLeagues });
    renderPage();
    expect(screen.getByText("League One")).toBeInTheDocument();
    expect(screen.getByText("League Two")).toBeInTheDocument();
  });

  it("has a Create League button", () => {
    setupMocks();
    renderPage();
    expect(
      screen.getByRole("button", { name: /create league/i }),
    ).toBeInTheDocument();
  });

  it("has a Join League button", () => {
    setupMocks();
    renderPage();
    expect(
      screen.getByRole("button", { name: /join league/i }),
    ).toBeInTheDocument();
  });

  it("clicking Create League button locks scroll (opens modal)", () => {
    setupMocks();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /create league/i }));
    expect(document.body).toHaveAttribute("data-scroll-locked");
  });

  it("clicking Join League button locks scroll (opens modal)", () => {
    setupMocks();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /join league/i }));
    expect(document.body).toHaveAttribute("data-scroll-locked");
  });

  it("navigates to league detail when a league card is clicked", () => {
    setupMocks({ data: mockLeagues });
    renderPage();
    fireEvent.click(screen.getByText("League One"));
    expect(mockNavigate).toHaveBeenCalledWith("/leagues/1");
  });
});
