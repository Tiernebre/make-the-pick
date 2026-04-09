import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { DraftPage } from "./DraftPage";

const { mockUseLeague, mockUseDraftPool } = vi.hoisted(() => ({
  mockUseLeague: vi.fn(),
  mockUseDraftPool: vi.fn(),
}));

vi.mock("../league/use-leagues", () => ({
  useLeague: mockUseLeague,
}));

vi.mock("./use-draft", () => ({
  useDraftPool: mockUseDraftPool,
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

const mockPool = {
  id: "pool-1",
  leagueId: "league-1",
  name: "Draft Pool",
  createdAt: "2026-01-01T00:00:00Z",
  items: [
    {
      id: "item-1",
      draftPoolId: "pool-1",
      name: "Pikachu",
      thumbnailUrl: "https://example.com/pikachu.png",
      metadata: {
        pokemonId: 25,
        types: ["electric"],
        generation: "1",
        baseStats: {
          hp: 35,
          attack: 55,
          defense: 40,
          specialAttack: 50,
          specialDefense: 50,
          speed: 90,
        },
      },
    },
    {
      id: "item-2",
      draftPoolId: "pool-1",
      name: "Charizard",
      thumbnailUrl: "https://example.com/charizard.png",
      metadata: {
        pokemonId: 6,
        types: ["fire", "flying"],
        generation: "1",
        baseStats: {
          hp: 78,
          attack: 84,
          defense: 78,
          specialAttack: 109,
          specialDefense: 85,
          speed: 100,
        },
      },
    },
  ],
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
    mockUseDraftPool.mockReturnValue({ data: mockPool, isLoading: false });
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
    mockUseDraftPool.mockReturnValue({ data: undefined, isLoading: true });
    renderPage();
    expect(
      document.querySelector(
        "[data-mantine-loading-overlay],.mantine-LoadingOverlay-root",
      ),
    ).toBeInTheDocument();
  });

  it("shows pool item count", () => {
    renderPage();
    expect(screen.getByText(/2 items/i)).toBeInTheDocument();
  });

  it("renders a table with stat column headers", () => {
    renderPage();
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    const headers = within(table).getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain("Name");
    expect(headerTexts).toContain("Type");
    expect(headerTexts).toContain("HP");
    expect(headerTexts).toContain("ATK");
    expect(headerTexts).toContain("DEF");
    expect(headerTexts).toContain("SPA");
    expect(headerTexts).toContain("SPD");
    expect(headerTexts).toContain("SPE");
    expect(headerTexts).toContain("Total");
  });

  it("displays draft pool items as table rows with stats", () => {
    renderPage();
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // header row + 2 data rows
    expect(rows.length).toBe(3);

    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    expect(screen.getByText("Charizard")).toBeInTheDocument();
  });

  it("shows base stat totals for each pokemon", () => {
    renderPage();
    // Pikachu total: 35+55+40+50+50+90 = 320
    // Charizard total: 78+84+78+109+85+100 = 534
    expect(screen.getByText("320")).toBeInTheDocument();
    expect(screen.getByText("534")).toBeInTheDocument();
  });

  it("shows type badges for each pokemon", () => {
    renderPage();
    expect(screen.getByText("electric")).toBeInTheDocument();
    expect(screen.getByText("fire")).toBeInTheDocument();
    expect(screen.getByText("flying")).toBeInTheDocument();
  });

  it("displays thumbnail images for each pokemon", () => {
    renderPage();
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThanOrEqual(2);
  });
});
