import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { JoinLeaguePage } from "./JoinLeaguePage";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();

const { mockUseJoinLeague } = vi.hoisted(() => ({
  mockUseJoinLeague: vi.fn(),
}));

vi.mock("./use-leagues", () => ({
  useJoinLeague: mockUseJoinLeague,
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    useParams: () => ({ inviteCode: "ABC123XY" }),
    useLocation: () => ["/join/ABC123XY", mockNavigate],
  };
});

function renderPage() {
  return render(
    <MantineProvider>
      <JoinLeaguePage />
    </MantineProvider>,
  );
}

describe("JoinLeaguePage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("calls join mutation with invite code from URL on mount", () => {
    mockUseJoinLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    });
    renderPage();

    expect(mockMutate).toHaveBeenCalledWith(
      { inviteCode: "ABC123XY" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("shows a loading state while joining", () => {
    mockUseJoinLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      isError: false,
      error: null,
    });
    renderPage();

    expect(screen.getByText(/joining league/i)).toBeInTheDocument();
  });

  it("navigates to league detail page on success", () => {
    mockUseJoinLeague.mockReturnValue({
      mutate: (
        _input: unknown,
        opts: { onSuccess: (data: unknown) => void },
      ) => {
        opts.onSuccess({ id: "league-123" });
      },
      isPending: false,
      isError: false,
      error: null,
    });
    renderPage();

    expect(mockNavigate).toHaveBeenCalledWith("/leagues/league-123");
  });

  it("displays an error message when join fails", () => {
    mockUseJoinLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: true,
      error: { message: "League is full" },
    });
    renderPage();

    expect(screen.getByText(/league is full/i)).toBeInTheDocument();
  });

  it("shows a link back to the leagues list when there is an error", () => {
    mockUseJoinLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: true,
      error: { message: "Not found" },
    });
    renderPage();

    expect(screen.getByRole("link", { name: /back to leagues/i }))
      .toHaveAttribute("href", "/leagues");
  });
});
