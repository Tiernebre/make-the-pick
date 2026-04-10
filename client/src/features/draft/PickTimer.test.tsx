import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { PickTimer } from "./PickTimer";

const NOW = new Date("2026-04-10T12:00:00.000Z");

function deadlineIn(seconds: number): string {
  return new Date(NOW.getTime() + seconds * 1000).toISOString();
}

function renderTimer(props: Parameters<typeof PickTimer>[0]) {
  return render(
    <MantineProvider>
      <PickTimer {...props} />
    </MantineProvider>,
  );
}

describe("PickTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders nothing when deadline is null", () => {
    renderTimer({ deadline: null });
    expect(screen.queryByTestId("pick-timer")).toBeNull();
  });

  it("shows MM:SS for a deadline in the future", () => {
    renderTimer({ deadline: deadlineIn(60) });
    expect(screen.getByText("01:00")).toBeInTheDocument();
  });

  it("uses the neutral state when more than 30 seconds remain", () => {
    renderTimer({ deadline: deadlineIn(60) });
    const el = screen.getByTestId("pick-timer");
    expect(el.getAttribute("data-state")).toBe("normal");
  });

  it("uses the warning state at 30 seconds or less", () => {
    renderTimer({ deadline: deadlineIn(20) });
    const el = screen.getByTestId("pick-timer");
    expect(el.getAttribute("data-state")).toBe("warning");
    expect(screen.getByText("00:20")).toBeInTheDocument();
  });

  it("uses the urgent state at 10 seconds or less", () => {
    renderTimer({ deadline: deadlineIn(5) });
    const el = screen.getByTestId("pick-timer");
    expect(el.getAttribute("data-state")).toBe("urgent");
    expect(screen.getByText("00:05")).toBeInTheDocument();
  });

  it("shows 00:00 and expired state for a deadline in the past", () => {
    renderTimer({ deadline: deadlineIn(-5) });
    const el = screen.getByTestId("pick-timer");
    expect(el.getAttribute("data-state")).toBe("expired");
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText(/time's up/i)).toBeInTheDocument();
  });

  it("ticks down as time advances", () => {
    renderTimer({ deadline: deadlineIn(10) });
    expect(screen.getByText("00:10")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("00:07")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("00:02")).toBeInTheDocument();
  });

  it("clears its interval on unmount", () => {
    const { unmount } = renderTimer({ deadline: deadlineIn(30) });
    unmount();
    // Advancing timers after unmount should not throw or produce act warnings.
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    }).not.toThrow();
  });

  it("has an aria-live region so screen readers announce updates", () => {
    renderTimer({ deadline: deadlineIn(30) });
    const el = screen.getByTestId("pick-timer");
    expect(el.getAttribute("aria-live")).toBe("polite");
  });
});
