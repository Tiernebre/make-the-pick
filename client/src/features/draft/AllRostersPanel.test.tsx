import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";
import { AllRostersPanel } from "./AllRostersPanel";
import { makeDraftState, makePick, makePlayer, makePoolItem } from "./fixtures";

function renderPanel() {
  const poolItems = [
    makePoolItem("item-1", "bulbasaur", ["grass"]),
    makePoolItem("item-2", "charmander", ["fire"]),
    makePoolItem("item-3", "squirtle", ["water"]),
    makePoolItem("item-4", "pikachu", ["electric"]),
  ];
  const draftState = makeDraftState({
    players: [makePlayer("p1", "Alice"), makePlayer("p2", "Bob")],
    poolItems,
    picks: [
      makePick("item-1", "p1", 0),
      makePick("item-2", "p2", 1),
      makePick("item-4", "p1", 3),
    ],
  });
  const poolItemsById: Record<string, typeof poolItems[0]> = {};
  for (const item of poolItems) poolItemsById[item.id] = item;
  render(
    <MantineProvider>
      <AllRostersPanel
        draftState={draftState}
        poolItemsById={poolItemsById}
      />
    </MantineProvider>,
  );
}

describe("AllRostersPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a roster section for each player", () => {
    renderPanel();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows each player's picks in pick order", () => {
    renderPanel();
    expect(screen.getByText(/bulbasaur/i)).toBeInTheDocument();
    expect(screen.getByText(/pikachu/i)).toBeInTheDocument();
    expect(screen.getByText(/charmander/i)).toBeInTheDocument();
  });

  it("shows an empty state for players with no picks", () => {
    const draftState = makeDraftState({
      players: [makePlayer("p1", "Alice"), makePlayer("p2", "Bob")],
      picks: [],
    });
    cleanup();
    render(
      <MantineProvider>
        <AllRostersPanel draftState={draftState} poolItemsById={{}} />
      </MantineProvider>,
    );
    const emptyStates = screen.getAllByText(/no picks yet/i);
    expect(emptyStates.length).toBe(2);
  });
});
