import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { DraftPage } from "./DraftPage";

const { mockUseLeague } = vi.hoisted(() => ({
  mockUseLeague: vi.fn(),
}));

vi.mock("../league/use-leagues", () => ({
  useLeague: mockUseLeague,
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
    numberOfRounds: 10,
    pickTimeLimitSeconds: null,
  },
  createdAt: "2026-01-01T00:00:00Z",
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
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the league name in the title", () => {
    renderPage();
    expect(screen.getByText("Test League — Draft")).toBeInTheDocument();
  });

  it("has a back link to the league detail page", () => {
    renderPage();
    const backLink = screen.getByRole("link", { name: /back to league/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/leagues/league-1");
  });

  it("shows loading overlay when league is loading", () => {
    mockUseLeague.mockReturnValue({ data: undefined, isLoading: true });
    renderPage();
    expect(
      document.querySelector(
        "[data-mantine-loading-overlay],.mantine-LoadingOverlay-root",
      ),
    ).toBeInTheDocument();
  });
});
