import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MantineProvider } from "@mantine/core";
import { RosterStrip } from "./RosterStrip";
import { makePoolItem } from "./fixtures";
import type { DraftPick } from "@make-the-pick/shared";

function renderStrip(props: Parameters<typeof RosterStrip>[0]) {
  return render(
    <MantineProvider>
      <RosterStrip {...props} />
    </MantineProvider>,
  );
}

const poolItemsById: Record<string, ReturnType<typeof makePoolItem>> = {
  "item-1": makePoolItem("item-1", "bulbasaur", ["grass"]),
  "item-2": makePoolItem("item-2", "charmander", ["fire"]),
  "item-3": makePoolItem("item-3", "squirtle", ["water"]),
};

function pick(
  poolItemId: string,
  pickNumber: number,
  leaguePlayerId = "p1",
): DraftPick {
  return {
    id: `pick-${pickNumber}`,
    draftId: "draft-1",
    leaguePlayerId,
    poolItemId,
    pickNumber,
    pickedAt: "2026-01-01T00:00:00Z",
  };
}

describe("RosterStrip", () => {
  afterEach(() => cleanup());

  it("renders drafted items in pickNumber order", () => {
    const picks = [
      pick("item-3", 2),
      pick("item-1", 0),
      pick("item-2", 1),
    ];
    renderStrip({ picks, poolItemsById });

    const names = screen.getAllByText(/bulbasaur|charmander|squirtle/i)
      .map((el) => el.textContent?.toLowerCase() ?? "");
    expect(names).toEqual(["bulbasaur", "charmander", "squirtle"]);
  });

  it("shows empty message when no picks", () => {
    renderStrip({ picks: [], poolItemsById });
    expect(screen.getByText(/no picks yet/i)).toBeInTheDocument();
  });

  it("renders type badges from metadata", () => {
    const picks = [pick("item-1", 0)];
    renderStrip({ picks, poolItemsById });
    expect(screen.getByText(/grass/i)).toBeInTheDocument();
  });
});
