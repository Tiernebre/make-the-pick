import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { HomeDashboard } from "./HomeDashboard";

const { mockUseLeagues, mockUseSession, mockUseJoinLeague } = vi.hoisted(
  () => ({
    mockUseLeagues: vi.fn(),
    mockUseSession: vi.fn(),
    mockUseJoinLeague: vi.fn(),
  }),
);

vi.mock("./use-leagues", () => ({
  useLeagues: mockUseLeagues,
  useJoinLeague: mockUseJoinLeague,
}));

vi.mock("../../auth", () => ({
  useSession: mockUseSession,
}));

function renderPage() {
  return render(
    <MantineProvider>
      <HomeDashboard />
    </MantineProvider>,
  );
}

function setupMocks(
  overrides: {
    leagues?: Array<{
      id: string;
      name: string;
      status: string;
      playerCount?: number;
      maxPlayers?: number | null;
      userRole?: "commissioner" | "member";
    }>;
    isLoading?: boolean;
  } = {},
) {
  mockUseSession.mockReturnValue({
    data: { user: { id: "u1", name: "Ash Ketchum" } },
    isPending: false,
  });
  mockUseLeagues.mockReturnValue({
    data: overrides.leagues ?? [],
    isLoading: overrides.isLoading ?? false,
  });
  mockUseJoinLeague.mockReturnValue({ mutate: vi.fn(), isPending: false });
}

describe("HomeDashboard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("greets the user by name", () => {
    setupMocks();
    renderPage();
    expect(screen.getByText(/welcome back, ash/i)).toBeInTheDocument();
  });

  it("prompts to create a league when the user has none", () => {
    setupMocks({ leagues: [] });
    renderPage();
    const banner = screen.getByTestId("next-action-banner");
    expect(within(banner).getByText(/start your first league/i))
      .toBeInTheDocument();
  });

  it("highlights a drafting league as the next action", () => {
    setupMocks({
      leagues: [
        {
          id: "L1",
          name: "Kanto Rumble",
          status: "setup",
          playerCount: 2,
          maxPlayers: 8,
          userRole: "commissioner",
        },
        {
          id: "L2",
          name: "Johto Classic",
          status: "drafting",
          playerCount: 6,
          maxPlayers: 8,
          userRole: "member",
        },
      ],
    });
    renderPage();
    const banner = screen.getByTestId("next-action-banner");
    expect(within(banner).getByText(/johto classic/i)).toBeInTheDocument();
    expect(within(banner).getByRole("link", { name: /go to draft/i }))
      .toHaveAttribute("href", "/leagues/L2/draft");
  });

  it("renders a leagues banner that links to the all-leagues page", () => {
    setupMocks({
      leagues: [
        {
          id: "L1",
          name: "Kanto Rumble",
          status: "setup",
          playerCount: 2,
          maxPlayers: 8,
          userRole: "commissioner",
        },
      ],
    });
    renderPage();
    const banner = screen.getByTestId("leagues-banner");
    expect(banner).toHaveAttribute("href", "/leagues");
    expect(within(banner).queryByText("Kanto Rumble")).not.toBeInTheDocument();
    expect(screen.queryByTestId("active-leagues-strip")).not
      .toBeInTheDocument();
  });

  it("has quick actions for Create League and Join by invite", () => {
    setupMocks();
    renderPage();
    expect(screen.getByRole("link", { name: /create league/i }))
      .toHaveAttribute("href", "/leagues/new");
    expect(screen.getByRole("button", { name: /join by invite code/i }))
      .toBeInTheDocument();
  });
});
