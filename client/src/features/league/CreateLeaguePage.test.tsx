import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { CreateLeaguePage } from "./CreateLeaguePage";

const { mockUseCreateLeague, mockNavigate } = vi.hoisted(() => ({
  mockUseCreateLeague: vi.fn(),
  mockNavigate: vi.fn(),
}));

const mockMutate = vi.fn();

vi.mock("./use-leagues", () => ({
  useCreateLeague: mockUseCreateLeague,
}));

vi.mock("../pokemon-version/use-pokemon-versions", () => ({
  usePokemonVersions: () => ({ data: [], isLoading: false }),
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    useLocation: () => ["/leagues/new", mockNavigate],
  };
});

function renderPage() {
  return render(
    <MantineProvider>
      <CreateLeaguePage />
    </MantineProvider>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/^league name/i), {
    target: { value: "My League" },
  });
  fireEvent.change(screen.getByLabelText(/^number of rounds/i), {
    target: { value: "6" },
  });
  fireEvent.change(screen.getByLabelText(/^max players/i), {
    target: { value: "8" },
  });
}

describe("CreateLeaguePage", () => {
  beforeEach(() => {
    mockUseCreateLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the create league form title", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /create league/i }))
      .toBeInTheDocument();
  });

  it("renders all required settings fields", () => {
    renderPage();
    expect(screen.getByLabelText(/^league name/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^sport type/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^draft format/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^draft mode/i }))
      .toBeInTheDocument();
    expect(screen.getByLabelText(/^number of rounds/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^max players/i)).toBeInTheDocument();
  });

  it("does not call mutate when required fields are empty", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("calls mutate with name and settings on valid submit", () => {
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My League",
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig: expect.objectContaining({
          draftFormat: "snake",
          numberOfRounds: 6,
          draftMode: "individual",
        }),
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("renders a draft mode select with individual and species options", () => {
    renderPage();
    const draftMode = screen.getByRole("textbox", { name: /^draft mode/i });
    expect(draftMode).toBeInTheDocument();
    expect(draftMode).toHaveValue("Individual");
  });

  it("navigates to the league detail page after successful create", () => {
    mockMutate.mockImplementation((_input, opts) => {
      opts.onSuccess({ id: "new-league-id" });
    });
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/leagues/new-league-id");
  });

  it("shows loading state when mutation is pending", () => {
    mockUseCreateLeague.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });
    renderPage();
    expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
  });
});
