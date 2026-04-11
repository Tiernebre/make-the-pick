import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { CeremonyTicker } from "./CeremonyTicker";
import type { Ceremony } from "./use-draft-ceremony";

const ceremony: Ceremony = {
  id: "pick-1",
  playerName: "Alice",
  pokemonName: "Pikachu",
  pickNumber: 0,
  round: 1,
};

function renderTicker(
  overrides: Partial<Parameters<typeof CeremonyTicker>[0]> = {},
) {
  const props = {
    current: ceremony as Ceremony | null,
    onDismiss: vi.fn(),
    ...overrides,
  };
  return {
    ...props,
    ...render(
      <MantineProvider>
        <CeremonyTicker {...props} />
      </MantineProvider>,
    ),
  };
}

describe("CeremonyTicker", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when there is no current ceremony", () => {
    renderTicker({ current: null });
    expect(screen.queryByText(/breaking/i)).toBeNull();
  });

  it("renders a BREAKING badge when a ceremony is active", () => {
    renderTicker();
    expect(screen.getByText(/breaking/i)).toBeInTheDocument();
  });

  it("renders the player name and pokemon for the current pick", () => {
    renderTicker();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/pikachu/i)).toBeInTheDocument();
  });

  it("renders the round and pick number", () => {
    renderTicker({ current: { ...ceremony, round: 3, pickNumber: 14 } });
    expect(screen.getByText(/round 3/i)).toBeInTheDocument();
    expect(screen.getByText(/pick 15/i)).toBeInTheDocument();
  });

  it("exposes itself to assistive tech as a live alert region", () => {
    renderTicker();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("calls onDismiss when the dismiss button is clicked", () => {
    const { onDismiss } = renderTicker();
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
