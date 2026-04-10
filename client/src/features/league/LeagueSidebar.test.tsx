import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { LeagueSidebar, parseLeagueId } from "./LeagueSidebar";

const { mockUseLeague, mockUseLeaguePlayers, mockUseSession } = vi.hoisted(
  () => ({
    mockUseLeague: vi.fn(),
    mockUseLeaguePlayers: vi.fn(),
    mockUseSession: vi.fn(),
  }),
);

vi.mock("./use-leagues", () => ({
  useLeague: mockUseLeague,
  useLeaguePlayers: mockUseLeaguePlayers,
}));

vi.mock("../../auth", () => ({
  useSession: mockUseSession,
}));

function renderSidebar(
  props: { leagueId: string; location?: string; collapsed?: boolean } = {
    leagueId: "L1",
  },
) {
  return render(
    <MantineProvider>
      <LeagueSidebar
        leagueId={props.leagueId}
        location={props.location ?? `/leagues/${props.leagueId}`}
        collapsed={props.collapsed ?? false}
      />
    </MantineProvider>,
  );
}

function setup(
  overrides: {
    leagueStatus?: string;
    leagueName?: string;
    role?: "commissioner" | "player";
  } = {},
) {
  mockUseSession.mockReturnValue({
    data: { user: { id: "u1", name: "Ash" } },
    isPending: false,
  });
  mockUseLeague.mockReturnValue({
    data: {
      id: "L1",
      name: overrides.leagueName ?? "Johto Classic",
      status: overrides.leagueStatus ?? "drafting",
    },
    isLoading: false,
  });
  mockUseLeaguePlayers.mockReturnValue({
    data: [
      { userId: "u1", role: overrides.role ?? "commissioner" },
      { userId: "u2", role: "player" },
    ],
    isLoading: false,
  });
}

describe("parseLeagueId", () => {
  it("returns null for the home route", () => {
    expect(parseLeagueId("/")).toBeNull();
  });

  it("returns null for /leagues list", () => {
    expect(parseLeagueId("/leagues")).toBeNull();
  });

  it("returns null for /leagues/new", () => {
    expect(parseLeagueId("/leagues/new")).toBeNull();
  });

  it("returns the id for /leagues/:id", () => {
    expect(parseLeagueId("/leagues/abc123")).toBe("abc123");
  });

  it("returns the id for /leagues/:id/draft", () => {
    expect(parseLeagueId("/leagues/abc123/draft")).toBe("abc123");
  });

  it("returns the id for /leagues/:id/draft/pool", () => {
    expect(parseLeagueId("/leagues/abc123/draft/pool")).toBe("abc123");
  });

  it("returns the id for /leagues/:id/settings", () => {
    expect(parseLeagueId("/leagues/abc123/settings")).toBe("abc123");
  });
});

describe("LeagueSidebar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the league name", () => {
    setup({ leagueName: "Johto Classic" });
    renderSidebar();
    expect(screen.getByText("Johto Classic")).toBeInTheDocument();
  });

  it("shows the league status badge", () => {
    setup({ leagueStatus: "drafting" });
    renderSidebar();
    expect(screen.getByText(/drafting/i)).toBeInTheDocument();
  });

  it("has a back link to /leagues", () => {
    setup();
    renderSidebar();
    const back = screen.getByRole("link", { name: /all leagues/i });
    expect(back).toHaveAttribute("href", "/leagues");
  });

  it("has an Overview link to the league detail page", () => {
    setup();
    renderSidebar();
    const overview = screen.getByRole("link", { name: /overview/i });
    expect(overview).toHaveAttribute("href", "/leagues/L1");
  });

  it("has a Draft Room link when drafting", () => {
    setup({ leagueStatus: "drafting" });
    renderSidebar();
    const draft = screen.getByRole("link", { name: /draft room/i });
    expect(draft).toHaveAttribute("href", "/leagues/L1/draft");
  });

  it("has a Draft Pool link when drafting", () => {
    setup({ leagueStatus: "drafting" });
    renderSidebar();
    const pool = screen.getByRole("link", { name: /draft pool/i });
    expect(pool).toHaveAttribute("href", "/leagues/L1/draft/pool");
  });

  it("disables Draft Room when status is setup", () => {
    setup({ leagueStatus: "setup" });
    renderSidebar();
    expect(screen.queryByRole("link", { name: /draft room/i })).toBeNull();
    expect(screen.getByText(/draft room/i)).toBeInTheDocument();
  });

  it("shows Settings link for commissioner", () => {
    setup({ role: "commissioner" });
    renderSidebar();
    const settings = screen.getByRole("link", { name: /settings/i });
    expect(settings).toHaveAttribute("href", "/leagues/L1/settings");
  });

  it("hides Settings link for non-commissioner", () => {
    setup({ role: "player" });
    renderSidebar();
    expect(screen.queryByRole("link", { name: /settings/i })).toBeNull();
  });

  it("highlights Overview as active on the detail route", () => {
    setup();
    const { container } = renderSidebar({
      leagueId: "L1",
      location: "/leagues/L1",
    });
    const overview = within(container).getByRole("link", {
      name: /overview/i,
    });
    expect(overview.getAttribute("data-active")).toBe("true");
  });

  it("highlights Draft Room as active on the draft route", () => {
    setup();
    const { container } = renderSidebar({
      leagueId: "L1",
      location: "/leagues/L1/draft",
    });
    const draft = within(container).getByRole("link", { name: /draft room/i });
    expect(draft.getAttribute("data-active")).toBe("true");
  });
});
