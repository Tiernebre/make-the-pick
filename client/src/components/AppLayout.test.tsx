import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { AppLayout } from "./AppLayout";

const { mockUseSession, mockSignOut } = vi.hoisted(() => ({
  mockUseSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("../auth", () => ({
  useSession: mockUseSession,
  signOut: mockSignOut,
}));

const {
  mockUseLeague,
  mockUseLeaguePlayers,
  mockDeleteAccountMutate,
  locationRef,
} = vi.hoisted(() => ({
  mockUseLeague: vi.fn(),
  mockUseLeaguePlayers: vi.fn(),
  mockDeleteAccountMutate: vi.fn(),
  locationRef: { current: "/" },
}));

vi.mock("../features/league/use-leagues", () => ({
  useLeague: mockUseLeague,
  useLeaguePlayers: mockUseLeaguePlayers,
}));

vi.mock("../trpc", () => ({
  trpc: {
    user: {
      deleteAccount: {
        useMutation: () => ({
          mutate: mockDeleteAccountMutate,
          isPending: false,
        }),
      },
    },
  },
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return { ...actual, useLocation: () => [locationRef.current, vi.fn()] };
});

function renderLayout(children: React.ReactNode = <div>content</div>) {
  return render(
    <MantineProvider>
      <AppLayout>{children}</AppLayout>
    </MantineProvider>,
  );
}

function setupMocks(
  overrides: {
    location?: string;
    currentLeague?: { id: string; name: string; status: string } | null;
    players?: Array<{ userId: string; role: "commissioner" | "player" }>;
  } = {},
) {
  locationRef.current = overrides.location ?? "/";
  mockUseSession.mockReturnValue({
    data: {
      user: { id: "u1", name: "Ash Ketchum", image: null },
    },
    isPending: false,
  });
  mockUseLeague.mockReturnValue({
    data: overrides.currentLeague ?? null,
    isLoading: false,
  });
  mockUseLeaguePlayers.mockReturnValue({
    data: overrides.players ?? [],
    isLoading: false,
  });
}

describe("AppLayout shell", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders children in the main region", () => {
    setupMocks();
    renderLayout(<div data-testid="page-content">hello</div>);
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("renders a navigation landmark (sidebar)", () => {
    setupMocks();
    renderLayout();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("does not render a Home nav link (root redirects to /leagues)", () => {
    setupMocks();
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByRole("link", { name: /^home$/i })).toBeNull();
  });

  it("links the Make the Pick brand to /leagues", () => {
    setupMocks();
    renderLayout();
    const nav = screen.getByRole("navigation");
    const brand = within(nav).getByRole("link", { name: /make the pick/i });
    expect(brand).toHaveAttribute("href", "/leagues");
  });

  it("does not render a Leagues nav section on non-league routes", () => {
    setupMocks();
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByRole("link", { name: /^leagues$/i })).toBeNull();
    expect(within(nav).queryByRole("button", { name: /^leagues$/i }))
      .toBeNull();
  });

  it("does not render Research or Profile entries", () => {
    setupMocks();
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByText(/research/i)).toBeNull();
    expect(within(nav).queryByText(/profile/i)).toBeNull();
  });

  it("renders the user's name in the sidebar footer", () => {
    setupMocks();
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText("Ash Ketchum")).toBeInTheDocument();
  });

  it("exposes Sign out via the user menu in the sidebar", async () => {
    setupMocks();
    renderLayout();
    const nav = screen.getByRole("navigation");
    fireEvent.click(within(nav).getByRole("button", { name: /ash ketchum/i }));
    expect(await screen.findByRole("menuitem", { name: /sign out/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /delete account/i }))
      .toBeInTheDocument();
  });

  it("has a sidebar collapse toggle", () => {
    setupMocks();
    renderLayout();
    expect(
      screen.getByRole("button", { name: /collapse sidebar|expand sidebar/i }),
    ).toBeInTheDocument();
  });

  it("does not render the old top-left brand text in the header", () => {
    setupMocks();
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText(/make the pick/i)).toBeInTheDocument();
  });

  it("renders a burger button in the header for opening the mobile nav", () => {
    setupMocks();
    renderLayout();
    expect(screen.getByLabelText("Toggle navigation")).toBeInTheDocument();
  });

  it("renders a footer with a copyright notice and GitHub repo link", () => {
    setupMocks();
    renderLayout();
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText(/©/)).toBeInTheDocument();
    expect(within(footer).getByText(/make the pick/i)).toBeInTheDocument();
    const repoLink = within(footer).getByRole("link", { name: /github/i });
    expect(repoLink).toHaveAttribute(
      "href",
      "https://github.com/Tiernebre/make-the-pick",
    );
  });
});

describe("AppLayout league mode", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the contextual league sidebar on a league route", () => {
    setupMocks({
      location: "/leagues/L1",
      currentLeague: { id: "L1", name: "Johto Classic", status: "drafting" },
      players: [{ userId: "u1", role: "commissioner" }],
    });
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText("Johto Classic")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /overview/i }))
      .toHaveAttribute("href", "/leagues/L1");
    expect(within(nav).getByRole("link", { name: /draft room/i }))
      .toHaveAttribute("href", "/leagues/L1/draft");
  });

  it("does not render an All leagues back-link in league mode (brand handles it)", () => {
    setupMocks({
      location: "/leagues/L1",
      currentLeague: { id: "L1", name: "Johto", status: "drafting" },
      players: [{ userId: "u1", role: "player" }],
    });
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByRole("link", { name: /all leagues/i }))
      .toBeNull();
    const brand = within(nav).getByRole("link", { name: /make the pick/i });
    expect(brand).toHaveAttribute("href", "/leagues");
  });

  it("does not enter league mode on /leagues list route", () => {
    setupMocks({ location: "/leagues" });
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByRole("link", { name: /overview/i })).toBeNull();
  });

  it("does not enter league mode on /leagues/new", () => {
    setupMocks({ location: "/leagues/new" });
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByRole("link", { name: /overview/i })).toBeNull();
  });
});
