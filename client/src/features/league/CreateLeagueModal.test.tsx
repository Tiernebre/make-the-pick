import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { CreateLeagueModal } from "./CreateLeagueModal";

const mockMutate = vi.fn();
const { mockUseCreateLeague } = vi.hoisted(() => ({
  mockUseCreateLeague: vi.fn(),
}));

vi.mock("./use-leagues", () => ({
  useCreateLeague: mockUseCreateLeague,
}));

function renderModal(opened = true, onClose = vi.fn()) {
  return render(
    <MantineProvider>
      <CreateLeagueModal opened={opened} onClose={onClose} />
    </MantineProvider>,
  );
}

describe("CreateLeagueModal", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders modal with title when opened", () => {
    mockUseCreateLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    renderModal(true);
    expect(screen.getByText("Create League")).toBeInTheDocument();
  });

  it("does not render modal content when closed", () => {
    mockUseCreateLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    renderModal(false);
    expect(screen.queryByText("Create League")).not.toBeInTheDocument();
  });

  it("renders a text input for league name", () => {
    mockUseCreateLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    renderModal();
    expect(screen.getByLabelText("League Name")).toBeInTheDocument();
  });

  it("shows validation error when submitting with empty name", () => {
    mockUseCreateLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });

  it("calls mutate with the league name on valid submit", () => {
    mockUseCreateLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    renderModal();

    fireEvent.change(screen.getByLabelText("League Name"), {
      target: { value: "My League" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { name: "My League" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("shows loading state when mutation is pending", () => {
    mockUseCreateLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });
    renderModal();

    expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
  });
});
