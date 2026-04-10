import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { PickPanel } from "./PickPanel";
import { makeDraftState, makePoolItem } from "./fixtures";

function renderPanel(overrides: Partial<Parameters<typeof PickPanel>[0]> = {}) {
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
      <PickPanel
        draftState={draftState}
        poolItems={poolItems}
        isMyTurn
        onPick={onPick}
        isPicking={false}
        {...overrides}
      />
    </MantineProvider>,
  );
  return { onPick };
}

describe("PickPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows only available pool items", () => {
    const poolItems = [
      makePoolItem("item-1", "bulbasaur"),
      makePoolItem("item-2", "charmander"),
    ];
    const draftState = makeDraftState({
      poolItems,
      availableItemIds: ["item-1"], // charmander already picked
    });
    render(
      <MantineProvider>
        <PickPanel
          draftState={draftState}
          poolItems={poolItems}
          isMyTurn
          onPick={vi.fn()}
          isPicking={false}
        />
      </MantineProvider>,
    );
    expect(screen.getByText(/bulbasaur/i)).toBeInTheDocument();
    expect(screen.queryByText(/charmander/i)).not.toBeInTheDocument();
  });

  it("opens confirmation modal when clicking an item on your turn", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /draft bulbasaur/i }));
    expect(screen.getByText(/this cannot be undone/i)).toBeInTheDocument();
  });

  it("calls onPick with the correct id when confirmed", () => {
    const { onPick } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /draft bulbasaur/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirm$/i }));
    expect(onPick).toHaveBeenCalledWith("item-1");
  });

  it("filters items by text search", () => {
    renderPanel();
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "char" } });
    expect(screen.getByText(/charmander/i)).toBeInTheDocument();
    expect(screen.queryByText(/bulbasaur/i)).not.toBeInTheDocument();
  });

  it("does not show pick buttons when it is not my turn", () => {
    renderPanel({ isMyTurn: false });
    expect(
      screen.queryByRole("button", { name: /draft bulbasaur/i }),
    ).not.toBeInTheDocument();
    // Names still visible
    expect(screen.getByText(/bulbasaur/i)).toBeInTheDocument();
  });

  it("shows loading state on confirm button when isPicking", () => {
    renderPanel({ isPicking: true });
    fireEvent.click(screen.getByRole("button", { name: /draft bulbasaur/i }));
    const confirmBtn = screen.getByRole("button", { name: /^confirm$/i });
    // Mantine sets data-loading on loading buttons
    expect(confirmBtn.hasAttribute("data-loading")).toBe(true);
  });
});
