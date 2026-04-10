import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { LoginPage } from "./LoginPage";

const { mockSearch } = vi.hoisted(() => ({ mockSearch: vi.fn() }));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return { ...actual, useSearch: () => mockSearch() };
});

vi.mock("../auth", () => ({
  signIn: { social: vi.fn() },
}));

function renderPage() {
  return render(
    <MantineProvider>
      <LoginPage />
    </MantineProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LoginPage", () => {
  it("does not show an error banner by default", () => {
    mockSearch.mockReturnValue("");
    renderPage();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a cancellation message when ?error=oauth is present", () => {
    mockSearch.mockReturnValue("error=oauth");
    renderPage();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/sign[- ]in (was )?cancelled/i);
  });
});
