import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { App } from "./App";
import { queryClient } from "./trpc";

vi.mock("./auth", () => ({
  useSession: () => ({
    data: { user: { id: "1", name: "Test User" } },
    isPending: false,
  }),
  signIn: { social: vi.fn() },
  signOut: vi.fn(),
  authClient: {},
}));

const { mockUseLeagues, mockUseCreateLeague, mockUseJoinLeague } = vi.hoisted(
  () => ({
    mockUseLeagues: vi.fn(),
    mockUseCreateLeague: vi.fn(),
    mockUseJoinLeague: vi.fn(),
  }),
);

vi.mock("./features/league/use-leagues", () => ({
  useLeagues: mockUseLeagues,
  useCreateLeague: mockUseCreateLeague,
  useJoinLeague: mockUseJoinLeague,
}));

afterEach(() => {
  queryClient.clear();
  cleanup();
});

test("renders the Home dashboard welcome banner on the landing page", () => {
  mockUseLeagues.mockReturnValue({ data: [], isLoading: false });
  mockUseCreateLeague.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mockUseJoinLeague.mockReturnValue({ mutate: vi.fn(), isPending: false });

  render(<App />);
  expect(screen.getByText(/welcome back, test/i)).toBeInTheDocument();
});
