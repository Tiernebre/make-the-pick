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

  it("renders an active leagues strip with one card per league", () => {
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
    const strip = screen.getByTestId("active-leagues-strip");
    expect(within(strip).getByText("Kanto Rumble")).toBeInTheDocument();
    expect(within(strip).getByText("Johto Classic")).toBeInTheDocument();
  });

  it("has quick actions for Create League and Join by invite", () => {
    setupMocks();
    renderPage();
    expect(screen.getByRole("link", { name: /create league/i }))
      .toHaveAttribute("href", "/leagues/new");
    expect(screen.getByRole("button", { name: /join by invite code/i }))
      .toBeInTheDocument();
  });

  it("has a link to browse all leagues", () => {
    setupMocks();
    renderPage();
    expect(screen.getByRole("link", { name: /browse all leagues/i }))
      .toHaveAttribute("href", "/leagues");
  });
});
