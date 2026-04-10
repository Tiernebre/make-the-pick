import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { PicksPage } from "./PicksPage";
import { makeDraftState, makePick, makePlayer, makePoolItem } from "./fixtures";

const {
  mockUseLeague,
  mockUseDraft,
} = vi.hoisted(() => ({
  mockUseLeague: vi.fn(),
  mockUseDraft: vi.fn(),
}));

vi.mock("../league/use-leagues", () => ({
  useLeague: mockUseLeague,
}));

vi.mock("./use-draft", () => ({
  useDraft: mockUseDraft,
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    useParams: () => ({ id: "league-1" }),
  };
});

const players = [
  makePlayer("p1", "Alice"),
  makePlayer("p2", "Bob"),
];

const poolItems = [
  makePoolItem("item-1", "bulbasaur", ["grass"]),
  makePoolItem("item-2", "charmander", ["fire"]),
  makePoolItem("item-3", "squirtle", ["water"]),
  makePoolItem("item-4", "pikachu", ["electric"]),
];

const picks = [
  makePick("item-2", "p1", 0),
  makePick("item-3", "p2", 1),
  makePick("item-4", "p2", 2),
  makePick("item-1", "p1", 3),
];

function makeCompletedLeague(status: string) {
  return {
    id: "league-1",
    name: "Test League",
    status,
    inviteCode: "ABC123XY",
    sportType: "pokemon",
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 2,
      pickTimeLimitSeconds: null,
    },
    createdAt: "2026-01-01T00:00:00Z",
  };
}

function renderPage() {
  return render(
    <MantineProvider>
      <PicksPage />
    </MantineProvider>,
  );
}

describe("PicksPage", () => {
  beforeEach(() => {
    mockUseLeague.mockReturnValue({
      data: makeCompletedLeague("competing"),
      isLoading: false,
    });
    mockUseDraft.mockReturnValue({
      data: makeDraftState({
        status: "complete",
        players,
        poolItems,
        picks,
        currentPick: 4,
      }),
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the league name in the title", () => {
    renderPage();
    expect(screen.getByText("Test League — Picks")).toBeInTheDocument();
  });

  it("has a back link to the league detail page", () => {
    renderPage();
    expect(
      screen.getByRole("link", { name: /back to league/i }),
    ).toHaveAttribute("href", "/leagues/league-1");
  });

  it("shows a loading overlay while league or draft data is loading", () => {
    mockUseLeague.mockReturnValue({ data: undefined, isLoading: true });
    mockUseDraft.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderPage();
    expect(
      document.querySelector(
        "[data-mantine-loading-overlay],.mantine-LoadingOverlay-root",
      ),
    ).toBeInTheDocument();
  });

  it("renders All Picks and By Team tabs", () => {
    renderPage();
    expect(
      screen.getByRole("tab", { name: /all picks/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /by team/i }),
    ).toBeInTheDocument();
  });

  it("lists every pick in the All Picks table with pick number, round, team, and pokemon", () => {
    renderPage();
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // header row + 4 picks
    expect(rows).toHaveLength(5);
    expect(within(table).getByText("bulbasaur")).toBeInTheDocument();
    expect(within(table).getByText("charmander")).toBeInTheDocument();
    expect(within(table).getByText("squirtle")).toBeInTheDocument();
    expect(within(table).getByText("pikachu")).toBeInTheDocument();
  });

  it("sorts the All Picks table by pick number ascending by default", () => {
    renderPage();
    const table = screen.getByRole("table");
    const bodyRows = within(table).getAllByRole("row").slice(1);
    // first pick is charmander (item-2), last is bulbasaur (item-1)
    expect(bodyRows[0]).toHaveTextContent(/charmander/i);
    expect(bodyRows[bodyRows.length - 1]).toHaveTextContent(/bulbasaur/i);
  });

  it("switches to the By Team tab to show the rosters panel", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /by team/i }));
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/bob/i)).toBeInTheDocument();
  });

  it("shows an empty state when the league is not yet competing", () => {
    mockUseLeague.mockReturnValue({
      data: makeCompletedLeague("drafting"),
      isLoading: false,
    });
    renderPage();
    expect(
      screen.getByText(/picks will be available once the draft is complete/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders picks when the league status is complete", () => {
    mockUseLeague.mockReturnValue({
      data: makeCompletedLeague("complete"),
      isLoading: false,
    });
    renderPage();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
