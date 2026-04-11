import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { CeremonyOverlay } from "./CeremonyOverlay";
import type { Ceremony } from "./use-draft-ceremony";

const ceremony: Ceremony = {
  id: "pick-1",
  playerName: "Alice",
  pokemonName: "Pikachu",
  pickNumber: 0,
  round: 1,
};

function renderOverlay(
  overrides: Partial<Parameters<typeof CeremonyOverlay>[0]> = {},
) {
  const props = {
    current: ceremony,
    isMuted: true,
    onSkip: vi.fn(),
    onToggleMute: vi.fn(),
    ...overrides,
  };
  return {
    ...props,
    ...render(
      <MantineProvider>
        <CeremonyOverlay {...props} />
      </MantineProvider>,
    ),
  };
}

describe("CeremonyOverlay", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when there is no current ceremony", () => {
    renderOverlay({ current: null });
    expect(screen.queryByText(/the pick is in/i)).toBeNull();
  });

  it("renders the banner and pick info for an active ceremony", () => {
    renderOverlay();
    expect(screen.getByText(/the pick is in/i)).toBeInTheDocument();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/pikachu/i)).toBeInTheDocument();
  });

  it("calls onSkip when the skip button is clicked", () => {
    const { onSkip } = renderOverlay();
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleMute when the mute button is clicked", () => {
    const { onToggleMute } = renderOverlay();
    fireEvent.click(screen.getByRole("button", { name: /unmute/i }));
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it("labels the mute toggle as 'Mute' when audio is already unmuted", () => {
    renderOverlay({ isMuted: false });
    expect(screen.getByRole("button", { name: /^mute$/i })).toBeInTheDocument();
  });
});
