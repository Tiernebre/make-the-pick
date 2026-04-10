import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { PausedOverlay } from "./PausedOverlay";

const { mockUseResumeDraft, mockResumeMutate } = vi.hoisted(() => ({
  mockUseResumeDraft: vi.fn(),
  mockResumeMutate: vi.fn(),
}));

vi.mock("./use-draft-commissioner", () => ({
  useResumeDraft: mockUseResumeDraft,
}));

function renderOverlay(
  overrides: Partial<Parameters<typeof PausedOverlay>[0]> = {},
) {
  return render(
    <MantineProvider>
      <PausedOverlay
        status="paused"
        isCommissioner={false}
        leagueId="league-1"
        {...overrides}
      />
    </MantineProvider>,
  );
}

describe("PausedOverlay", () => {
  beforeEach(() => {
    mockUseResumeDraft.mockReturnValue({
      mutate: mockResumeMutate,
      isPending: false,
      error: null,
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the overlay when status is paused", () => {
    renderOverlay();
    expect(screen.getByText(/draft paused/i)).toBeInTheDocument();
  });

  it("renders nothing when status is not paused", () => {
    renderOverlay({ status: "in_progress" });
    expect(screen.queryByText(/draft paused/i)).toBeNull();
  });

  it("shows a Resume button for the commissioner", () => {
    renderOverlay({ isCommissioner: true });
    expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();
  });

  it("does not show a Resume button for non-commissioners", () => {
    renderOverlay({ isCommissioner: false });
    expect(screen.queryByRole("button", { name: /resume/i })).toBeNull();
  });

  it("calls useResumeDraft when the commissioner clicks Resume", () => {
    renderOverlay({ isCommissioner: true });
    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    expect(mockResumeMutate).toHaveBeenCalledWith({ leagueId: "league-1" });
  });
});
