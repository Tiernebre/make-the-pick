import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { LeagueDetailPage } from "./LeagueDetailPage";

const { mockUseLeague } = vi.hoisted(() => ({
  mockUseLeague: vi.fn(),
}));

vi.mock("./use-leagues", () => ({
  useLeague: mockUseLeague,
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return { ...actual, useParams: () => ({ id: "league-1" }) };
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
});
