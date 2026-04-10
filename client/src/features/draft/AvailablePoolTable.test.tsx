import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { AvailablePoolTable } from "./AvailablePoolTable";
import { makeDraftState, makePoolItem } from "./fixtures";

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

function renderTable(
  overrides: Partial<Parameters<typeof AvailablePoolTable>[0]> = {},
) {
  const poolItems = [
    makePoolItem("item-1", "bulbasaur", ["grass"]),
    makePoolItem("item-2", "charmander", ["fire"]),
    makePoolItem("item-3", "squirtle", ["water"]),
  ];
  const draftState = makeDraftState({
    poolItems,
    availableItemIds: ["item-1", "item-2", "item-3"],
  });
  const onPick = vi.fn().mockResolvedValue(undefined);
  render(
    <MantineProvider>
      <AvailablePoolTable
        leagueId="league-1"
        draftState={draftState}
        isMyTurn
        onPick={onPick}
        isPicking={false}
        {...overrides}
      />
    </MantineProvider>,
  );
  return { onPick };
}

describe("AvailablePoolTable", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a table with stat column headers", () => {
    renderTable();
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain("Name");
    expect(headerTexts).toContain("Type");
    expect(headerTexts).toContain("HP");
    expect(headerTexts).toContain("Total");
  });

  it("shows only available pool items", () => {
    const poolItems = [
      makePoolItem("item-1", "bulbasaur"),
      makePoolItem("item-2", "charmander"),
    ];
    const draftState = makeDraftState({
      poolItems,
      availableItemIds: ["item-1"],
    });
    render(
      <MantineProvider>
        <AvailablePoolTable
          leagueId="league-1"
          draftState={draftState}
          isMyTurn
          onPick={vi.fn()}
          isPicking={false}
        />
      </MantineProvider>,
    );
    expect(screen.getByText(/bulbasaur/i)).toBeInTheDocument();
    expect(screen.queryByText(/charmander/i)).not.toBeInTheDocument();
  });

  it("shows draft buttons when it is my turn", () => {
    renderTable();
    expect(
      screen.getByRole("button", { name: /draft bulbasaur/i }),
    ).toBeInTheDocument();
  });

  it("hides draft buttons when not my turn", () => {
    renderTable({ isMyTurn: false });
    expect(
      screen.queryByRole("button", { name: /draft bulbasaur/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/bulbasaur/i)).toBeInTheDocument();
  });

  it("opens confirmation modal and calls onPick with the correct id", () => {
    const { onPick } = renderTable();
    fireEvent.click(screen.getByRole("button", { name: /draft bulbasaur/i }));
    expect(screen.getByText(/this cannot be undone/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^confirm$/i }));
    expect(onPick).toHaveBeenCalledWith("item-1");
  });

  it("has a section titled Available Pool", () => {
    renderTable();
    expect(screen.getByText(/available pool/i)).toBeInTheDocument();
  });
});
