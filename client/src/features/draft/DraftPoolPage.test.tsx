import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { DraftPoolPage } from "./DraftPoolPage";

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

vi.mock("./use-pool-item-notes", () => ({
  usePoolItemNotes: () => ({ data: [] }),
  useUpsertPoolItemNote: () => ({ mutate: vi.fn() }),
  useDeletePoolItemNote: () => ({ mutate: vi.fn() }),
}));

vi.mock("./use-watchlist", () => ({
  useWatchlist: () => ({ data: [] }),
  useAddToWatchlist: () => ({ mutate: vi.fn() }),
  useRemoveFromWatchlist: () => ({ mutate: vi.fn() }),
  useReorderWatchlist: () => ({ mutate: vi.fn() }),
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
      availability: "early",
      encounter: {
        primary: { location: "Viridian Forest", method: "Walk" },
        all: [
          {
            location: "Viridian Forest",
            method: "Walk",
            minLevel: 3,
            maxLevel: 5,
            chance: 10,
          },
        ],
      },
      effort: { score: 2, reasons: ["Rare encounter (10% best chance)"] },
      evolution: {
        pokemonId: 25,
        chainId: 10,
        evolvesFromId: 172,
        triggers: [
          {
            trigger: "level-up",
            minLevel: null,
            item: null,
            heldItem: null,
            knownMove: null,
            minHappiness: 220,
            timeOfDay: null,
            needsOverworldRain: false,
            location: null,
            tradeSpecies: null,
          },
        ],
      },
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
      availability: "late",
      encounter: null,
      effort: { score: 4, reasons: ["No wild encounters in this version"] },
      evolution: {
        pokemonId: 6,
        chainId: 2,
        evolvesFromId: 5,
        triggers: [
          {
            trigger: "level-up",
            minLevel: 36,
            item: null,
            heldItem: null,
            knownMove: null,
            minHappiness: null,
            timeOfDay: null,
            needsOverworldRain: false,
            location: null,
            tradeSpecies: null,
          },
        ],
      },
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
      <DraftPoolPage />
    </MantineProvider>,
  );
}

describe("DraftPoolPage", () => {
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
    expect(screen.getByText("Test League — Draft Pool")).toBeInTheDocument();
  });

  it("has a back link to the league page", () => {
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

  it("renders a table with stat column headers", () => {
    renderPage();
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    const headers = within(table).getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain("Name");
    expect(headerTexts).toContain("Type");
    expect(headerTexts).toContain("Availability");
    expect(headerTexts).toContain("Found At");
    expect(headerTexts).toContain("Effort");
    expect(headerTexts).toContain("Evo");
    expect(headerTexts).toContain("HP");
    expect(headerTexts).toContain("Attack");
    expect(headerTexts).toContain("Defense");
    expect(headerTexts).toContain("Sp. Atk");
    expect(headerTexts).toContain("Sp. Def");
    expect(headerTexts).toContain("Speed");
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

  it("shows availability pills for each pokemon", () => {
    renderPage();
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    const pikachuRow = rows.find((row) => within(row).queryByText("Pikachu"));
    const charizardRow = rows.find((row) =>
      within(row).queryByText("Charizard")
    );
    expect(pikachuRow).toBeDefined();
    expect(charizardRow).toBeDefined();
    expect(within(pikachuRow!).getByText("Early")).toBeInTheDocument();
    expect(within(charizardRow!).getByText("Late")).toBeInTheDocument();
  });

  it("shows primary encounter location for species with data", () => {
    renderPage();
    const table = screen.getByRole("table");
    const pikachuRow = within(table).getAllByRole("row").find((row) =>
      within(row).queryByText("Pikachu")
    );
    expect(pikachuRow).toBeDefined();
    expect(within(pikachuRow!).getByText("Viridian Forest"))
      .toBeInTheDocument();
  });

  it("shows em dash for species with no encounter data", () => {
    renderPage();
    const table = screen.getByRole("table");
    const charizardRow = within(table).getAllByRole("row").find((row) =>
      within(row).queryByText("Charizard")
    );
    expect(charizardRow).toBeDefined();
    // Charizard has encounter: null; location cell renders an em dash
    expect(within(charizardRow!).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows effort meters with aria-labels", () => {
    renderPage();
    const table = screen.getByRole("table");
    expect(
      within(table).getByLabelText("Effort 2 of 5"),
    ).toBeInTheDocument();
    expect(
      within(table).getByLabelText("Effort 4 of 5"),
    ).toBeInTheDocument();
  });

  it("displays thumbnail images for each pokemon", () => {
    renderPage();
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThanOrEqual(2);
  });
});
