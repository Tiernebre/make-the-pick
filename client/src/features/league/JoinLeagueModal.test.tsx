import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { JoinLeagueModal } from "./JoinLeagueModal";

const mockMutate = vi.fn();
const { mockUseJoinLeague } = vi.hoisted(() => ({
  mockUseJoinLeague: vi.fn(),
}));

vi.mock("./use-leagues", () => ({
  useJoinLeague: mockUseJoinLeague,
}));

function renderModal(opened = true, onClose = vi.fn()) {
  return render(
    <MantineProvider>
      <JoinLeagueModal opened={opened} onClose={onClose} />
    </MantineProvider>,
  );
}

describe("JoinLeagueModal", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders modal with title when opened", () => {
    mockUseJoinLeague.mockReturnValue({ mutate: mockMutate, isPending: false });
    renderModal(true);
    expect(screen.getByText("Join League")).toBeInTheDocument();
  });

  it("does not render modal content when closed", () => {
    mockUseJoinLeague.mockReturnValue({ mutate: mockMutate, isPending: false });
    renderModal(false);
    expect(screen.queryByText("Join League")).not.toBeInTheDocument();
  });

  it("renders a text input for invite code", () => {
    mockUseJoinLeague.mockReturnValue({ mutate: mockMutate, isPending: false });
    renderModal();
    expect(screen.getByLabelText("Invite Code")).toBeInTheDocument();
  });

  it("shows validation error when submitting with empty invite code", () => {
    mockUseJoinLeague.mockReturnValue({ mutate: mockMutate, isPending: false });
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /join/i }));

    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/invite code is required/i)).toBeInTheDocument();
  });

  it("calls mutate with the invite code on valid submit", () => {
    mockUseJoinLeague.mockReturnValue({ mutate: mockMutate, isPending: false });
    renderModal();

    fireEvent.change(screen.getByLabelText("Invite Code"), {
      target: { value: "ABC123XY" },
    });
    fireEvent.click(screen.getByRole("button", { name: /join/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { inviteCode: "ABC123XY" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("shows loading state when mutation is pending", () => {
    mockUseJoinLeague.mockReturnValue({ mutate: mockMutate, isPending: true });
    renderModal();

    expect(screen.getByRole("button", { name: /joining/i })).toBeDisabled();
  });
});
