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

const { mockUseLeagues, mockDeleteAccountMutate } = vi.hoisted(() => ({
  mockUseLeagues: vi.fn(),
  mockDeleteAccountMutate: vi.fn(),
}));

vi.mock("../features/league/use-leagues", () => ({
  useLeagues: mockUseLeagues,
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
  return { ...actual, useLocation: () => ["/", vi.fn()] };
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
    leagues?: Array<{ id: string; name: string; status: string }>;
  } = {},
) {
  mockUseSession.mockReturnValue({
    data: {
      user: { id: "u1", name: "Ash Ketchum", image: null },
    },
    isPending: false,
  });
  mockUseLeagues.mockReturnValue({
    data: overrides.leagues ?? [],
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

  it("has a Home nav link pointing to /", () => {
    setupMocks();
    renderLayout();
    const nav = screen.getByRole("navigation");
    const homeLink = within(nav).getByRole("link", { name: /home/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("has a Leagues section in the sidebar", () => {
    setupMocks();
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText(/leagues/i)).toBeInTheDocument();
  });

  it("lists the user's leagues as children under Leagues", () => {
    setupMocks({
      leagues: [
        {
          id: "L1",
          name: "Johto Classic",
          status: "setup",
        },
        {
          id: "L2",
          name: "Kanto Rumble",
          status: "drafting",
        },
      ],
    });
    renderLayout();
    const nav = screen.getByRole("navigation");
    const johto = within(nav).getByRole("link", { name: /johto classic/i });
    expect(johto).toHaveAttribute("href", "/leagues/L1");
    const kanto = within(nav).getByRole("link", { name: /kanto rumble/i });
    expect(kanto).toHaveAttribute("href", "/leagues/L2");
  });

  it("shows a Research entry in the sidebar", () => {
    setupMocks();
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText(/research/i)).toBeInTheDocument();
  });

  it("shows a Profile entry in the sidebar", () => {
    setupMocks();
    renderLayout();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText(/profile/i)).toBeInTheDocument();
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
});
