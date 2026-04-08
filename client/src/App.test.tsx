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

afterEach(() => {
  queryClient.clear();
  cleanup();
});

test("renders Make The Pick title", () => {
  render(<App />);
  expect(screen.getByText("Make The Pick")).toBeInTheDocument();
});
