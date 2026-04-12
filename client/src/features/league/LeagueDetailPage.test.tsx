import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { LeagueDetailPage } from "./LeagueDetailPage";

const {
  mockUseLeague,
  mockUseLeaguePlayers,
  mockUseDeleteLeague,
  mockDeleteMutate,
  mockUseAdvanceLeagueStatus,
  mockAdvanceMutate,
  mockUseAddNpcPlayer,
  mockAddNpcMutate,
  mockUseAvailableNpcs,
  mockUseRemoveLeaguePlayer,
  mockRemovePlayerMutate,
  mockUseLeaveLeague,
  mockLeaveMutate,
  mockUseDraft,
  mockUsePokemonVersions,
} = vi.hoisted(
  () => ({
    mockUseLeague: vi.fn(),
    mockUseLeaguePlayers: vi.fn(),
    mockUseDeleteLeague: vi.fn(),
    mockDeleteMutate: vi.fn(),
    mockUseAdvanceLeagueStatus: vi.fn(),
    mockAdvanceMutate: vi.fn(),
    mockUseAddNpcPlayer: vi.fn(),
    mockAddNpcMutate: vi.fn(),
    mockUseAvailableNpcs: vi.fn(),
    mockUseRemoveLeaguePlayer: vi.fn(),
    mockRemovePlayerMutate: vi.fn(),
    mockUseLeaveLeague: vi.fn(),
    mockLeaveMutate: vi.fn(),
    mockUseDraft: vi.fn(),
    mockUsePokemonVersions: vi.fn(),
  }),
);

vi.mock("./use-leagues", () => ({
  useLeague: mockUseLeague,
  useLeaguePlayers: mockUseLeaguePlayers,
  useDeleteLeague: mockUseDeleteLeague,
  useAdvanceLeagueStatus: mockUseAdvanceLeagueStatus,
  useAddNpcPlayer: mockUseAddNpcPlayer,
  useAvailableNpcs: mockUseAvailableNpcs,
  useRemoveLeaguePlayer: mockUseRemoveLeaguePlayer,
  useLeaveLeague: mockUseLeaveLeague,
}));

vi.mock("../draft/use-draft", () => ({
  useDraft: mockUseDraft,
}));

vi.mock("../pokemon-version/use-pokemon-versions", () => ({
  usePokemonVersions: mockUsePokemonVersions,
}));

vi.mock("../../auth", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    useParams: () => ({ id: "league-1" }),
    useLocation: () => ["/leagues/league-1", vi.fn()],
  };
});

const mockLeague = {
  id: "league-1",
  name: "Test League",
  status: "setup",
  inviteCode: "ABC123XY",
  createdBy: "user-1",
  rulesConfig: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function renderPage() {
  return render(
    <MantineProvider>
      <LeagueDetailPage />
    </MantineProvider>,
  );
}

describe("LeagueDetailPage", () => {
  beforeEach(() => {
    mockUseLeaguePlayers.mockReturnValue({ data: [], isLoading: false });
    mockUseDeleteLeague.mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });
    mockUseAdvanceLeagueStatus.mockReturnValue({
      mutate: mockAdvanceMutate,
      isPending: false,
    });
    mockUseAddNpcPlayer.mockReturnValue({
      mutate: mockAddNpcMutate,
      isPending: false,
      isError: false,
      error: null,
    });
    mockUseAvailableNpcs.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseDraft.mockReturnValue({ data: undefined, isLoading: false });
    mockUsePokemonVersions.mockReturnValue({
      data: [
        {
          id: "scarlet-violet",
          name: "Scarlet Violet",
          versionGroup: "scarlet-violet",
          region: "Paldea",
          generation: 9,
        },
      ],
      isLoading: false,
    });
    mockUseRemoveLeaguePlayer.mockReturnValue({
      mutate: mockRemovePlayerMutate,
      reset: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    });
    mockUseLeaveLeague.mockReturnValue({
      mutate: mockLeaveMutate,
      reset: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows loading overlay when data is loading", () => {
    mockUseLeague.mockReturnValue({ data: undefined, isLoading: true });
    renderPage();
    expect(
      document.querySelector(
        "[data-mantine-loading-overlay],.mantine-LoadingOverlay-root",
      ),
    ).toBeInTheDocument();
  });

  it("renders the league name as a title", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    expect(screen.getByText("Test League")).toBeInTheDocument();
  });

  it("displays the league status", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    expect(screen.getAllByText(/setup/i).length).toBeGreaterThan(0);
  });

  it("displays the invite code", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    expect(screen.getByText("ABC123XY")).toBeInTheDocument();
  });

  it("shows a shareable invite link pointing at the join flow", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    expect(screen.getByText(/\/join\/ABC123XY/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /copy invite link/i }),
    ).toBeInTheDocument();
  });

  it("has a back link to the leagues list", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    const backLink = screen.getByRole("link", { name: /back to leagues/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/leagues");
  });

  it("calls useLeague with the id from route params", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    expect(mockUseLeague).toHaveBeenCalledWith("league-1");
  });

  it("shows delete button when user is the commissioner", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.getByRole("button", { name: /delete league/i }),
    ).toBeInTheDocument();
  });

  it("shows leave button when user is a member (not commissioner)", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.getByRole("button", { name: /leave league/i }),
    ).toBeInTheDocument();
  });

  it("does not show leave button when user is the commissioner", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /leave league/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show delete button when user is not the commissioner", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /delete league/i }),
    ).not.toBeInTheDocument();
  });

  it("shows advance button when commissioner and league has a next status", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: null,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.getByRole("button", { name: /advance to pooling/i }),
    ).toBeInTheDocument();
  });

  it("does not show advance button when user is not commissioner", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        sportType: "pokemon",
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: null,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /advance to/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show advance button when league is complete", () => {
    mockUseLeague.mockReturnValue({
      data: { ...mockLeague, status: "complete" },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /advance to/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a link to the draft page when league status is drafting", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        status: "drafting",
        sportType: "pokemon",
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: null,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    const draftLink = screen.getByRole("link", { name: /go to draft/i });
    expect(draftLink).toBeInTheDocument();
    expect(draftLink).toHaveAttribute("href", "/leagues/league-1/draft");
  });

  it("does not show draft link when league status is setup", () => {
    mockUseLeague.mockReturnValue({
      data: mockLeague,
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("link", { name: /go to draft/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show advance button when setup settings are not configured", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        status: "setup",
        sportType: null,
        rulesConfig: null,
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /advance to/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show advance button when maxPlayers is missing", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        status: "setup",
        sportType: "pokemon",
        maxPlayers: null,
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: null,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /advance to/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a Configure link for commissioner during setup", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: null,
          poolSizeMultiplier: 2,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    const configureLink = screen.getByRole("link", { name: /configure/i });
    expect(configureLink).toHaveAttribute(
      "href",
      "/leagues/league-1/settings",
    );
  });

  it("renders a 'Your team' panel", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText(/your team/i)).toBeInTheDocument();
  });

  it("renders the lifecycle stepper", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    expect(
      screen.getByRole("group", { name: /league lifecycle/i }),
    ).toBeInTheDocument();
  });

  it("shows Pokemon settings in the Rules card when present", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: 90,
          poolSizeMultiplier: 2.5,
          gameVersion: "scarlet-violet",
          excludeLegendaries: true,
          excludeStarters: false,
          excludeTradeEvolutions: true,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-2",
          name: "Bob",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText(/game version/i)).toBeInTheDocument();
    expect(screen.getByText("Scarlet Violet")).toBeInTheDocument();
    expect(screen.getByText(/pool multiplier/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.5x/)).toBeInTheDocument();
    expect(screen.getByText(/pick timer/i)).toBeInTheDocument();
    expect(screen.getByText(/90s/)).toBeInTheDocument();
    expect(screen.getByText(/exclusions/i)).toBeInTheDocument();
    expect(screen.getByText(/legendaries/i)).toBeInTheDocument();
    expect(screen.getByText(/trade evolutions/i)).toBeInTheDocument();
    expect(screen.queryByText(/^starters$/i)).not.toBeInTheDocument();
  });

  it("renders rosters for each player when league is competing", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        status: "competing",
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 2,
          pickTimeLimitSeconds: null,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "p2",
          userId: "user-2",
          name: "Bob",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    mockUseDraft.mockReturnValue({
      data: {
        draft: {
          id: "d1",
          leagueId: "league-1",
          status: "completed",
          currentPick: 4,
          pickOrder: ["p1", "p2"],
        },
        players: [
          {
            id: "p1",
            userId: "user-1",
            name: "Alice",
            image: null,
            isNpc: false,
            role: "commissioner",
            joinedAt: "2026-01-01T00:00:00Z",
          },
          {
            id: "p2",
            userId: "user-2",
            name: "Bob",
            image: null,
            isNpc: false,
            role: "member",
            joinedAt: "2026-01-01T00:00:00Z",
          },
        ],
        picks: [
          {
            id: "pk1",
            draftId: "d1",
            leaguePlayerId: "p1",
            poolItemId: "pi1",
            pickNumber: 1,
            pickedAt: "2026-01-01T00:00:00Z",
            autoPicked: false,
          },
          {
            id: "pk2",
            draftId: "d1",
            leaguePlayerId: "p2",
            poolItemId: "pi2",
            pickNumber: 2,
            pickedAt: "2026-01-01T00:00:00Z",
            autoPicked: false,
          },
        ],
        poolItems: [
          {
            id: "pi1",
            name: "pikachu",
            thumbnailUrl: null,
            metadata: { types: ["electric"] },
          },
          {
            id: "pi2",
            name: "charizard",
            thumbnailUrl: null,
            metadata: { types: ["fire", "flying"] },
          },
        ],
        availableItemIds: [],
      },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByRole("heading", { name: /^rosters$/i }))
      .toBeInTheDocument();
    expect(screen.getByText(/pikachu/i)).toBeInTheDocument();
    expect(screen.getByText(/charizard/i)).toBeInTheDocument();
  });

  it("does not fetch draft state when league is in setup", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    renderPage();
    expect(mockUseDraft).toHaveBeenCalledWith("league-1", { enabled: false });
  });

  it("adds a random NPC when commissioner clicks the primary Add NPC button", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    const randomBtn = screen.getByRole("button", { name: /add random npc/i });
    randomBtn.click();
    expect(mockAddNpcMutate).toHaveBeenCalledWith({ leagueId: "league-1" });
  });

  it("disables the Add random NPC button when the league is at max players", () => {
    mockUseLeague.mockReturnValue({
      data: { ...mockLeague, maxPlayers: 2 },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "p2",
          userId: "user-2",
          name: "Bob",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    const randomBtn = screen.getByRole("button", { name: /add random npc/i });
    expect(randomBtn).toBeDisabled();
    randomBtn.click();
    expect(mockAddNpcMutate).not.toHaveBeenCalled();
  });

  it("opens the choose NPC modal and sends the chosen npcUserId", async () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    mockUseAvailableNpcs.mockReturnValue({
      data: [
        { id: "npc-a", name: "Red", npcStrategy: "balanced" },
        { id: "npc-b", name: "Blue", npcStrategy: "best-available" },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    screen.getByRole("button", { name: /more npc options/i }).click();
    const chooseItem = await screen.findByRole("menuitem", {
      name: /choose specific npc/i,
    });
    chooseItem.click();

    const blueBtn = await screen.findByText("Blue");
    blueBtn.click();

    expect(mockAddNpcMutate).toHaveBeenCalledWith(
      { leagueId: "league-1", npcUserId: "npc-b" },
      expect.anything(),
    );
  });

  it("shows a remove-player button for other players when commissioner in setup", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "p2",
          userId: "user-2",
          name: "Bob",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.getByRole("button", { name: /remove Bob/i }),
    ).toBeInTheDocument();
  });

  it("does not show a remove button for the commissioner themselves", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /remove Alice/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show remove buttons when user is not commissioner", () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "p2",
          userId: "user-2",
          name: "Bob",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /remove Bob/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show remove buttons once the league has left setup", () => {
    mockUseLeague.mockReturnValue({
      data: { ...mockLeague, status: "pooling" },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "p2",
          userId: "user-2",
          name: "Bob",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /remove Bob/i }),
    ).not.toBeInTheDocument();
  });

  it("calls removePlayer mutate with the targeted player on confirm", async () => {
    mockUseLeague.mockReturnValue({ data: mockLeague, isLoading: false });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "p2",
          userId: "user-2",
          name: "Bob",
          image: null,
          role: "member",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    screen.getByRole("button", { name: /remove Bob/i }).click();
    const confirmBtn = await screen.findByRole("button", {
      name: /^remove$/i,
    });
    confirmBtn.click();
    expect(mockRemovePlayerMutate).toHaveBeenCalledWith(
      { leagueId: "league-1", playerUserId: "user-2" },
      expect.anything(),
    );
  });

  it("does not render a Save Settings button", () => {
    mockUseLeague.mockReturnValue({
      data: {
        ...mockLeague,
        sportType: "pokemon",
        maxPlayers: 8,
        rulesConfig: {
          draftFormat: "snake",
          numberOfRounds: 10,
          pickTimeLimitSeconds: null,
          poolSizeMultiplier: 2,
        },
      },
      isLoading: false,
    });
    mockUseLeaguePlayers.mockReturnValue({
      data: [
        {
          id: "p1",
          userId: "user-1",
          name: "Alice",
          image: null,
          role: "commissioner",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    });
    renderPage();
    expect(
      screen.queryByRole("button", { name: /save settings/i }),
    ).not.toBeInTheDocument();
  });
});
