import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInvalidate = vi.fn();

vi.mock("../../trpc", () => ({
  trpc: {
    useUtils: () => ({
      draft: {
        getState: {
          invalidate: mockInvalidate,
        },
      },
    }),
  },
}));

// Import AFTER the mock is declared
import { useDraftEvents } from "./use-draft-events";

type Listener = (event: MessageEvent) => void;

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners: Record<string, Listener[]> = {};
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((l) =>
      l !== listener
    );
  }

  close() {
    this.closed = true;
  }

  // Test helpers
  fireOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  fire(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    for (const listener of this.listeners[type] ?? []) {
      listener(event);
    }
  }

  fireRaw(type: string, rawData: string) {
    const event = { data: rawData } as MessageEvent;
    for (const listener of this.listeners[type] ?? []) {
      listener(event);
    }
  }
}

beforeEach(() => {
  FakeEventSource.instances = [];
  mockInvalidate.mockClear();
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const validPickMadePayload = {
  id: "00000000-0000-0000-0000-000000000001",
  draftId: "00000000-0000-0000-0000-000000000002",
  leaguePlayerId: "00000000-0000-0000-0000-000000000003",
  poolItemId: "00000000-0000-0000-0000-000000000004",
  pickNumber: 0,
  pickedAt: "2026-04-10T00:00:00.000Z",
  playerName: "Alice",
  itemName: "Pikachu",
  round: 1,
};

describe("useDraftEvents", () => {
  it("opens an EventSource and transitions to open on onopen", () => {
    const { result } = renderHook(() => useDraftEvents("league-1"));

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].url).toContain("league-1");
    expect(result.current.status).toBe("connecting");

    act(() => {
      FakeEventSource.instances[0].fireOpen();
    });

    expect(result.current.status).toBe("open");
  });

  it("dispatches a valid draft:pick_made event to onEvent and invalidates the state query", () => {
    const onEvent = vi.fn();
    renderHook(() => useDraftEvents("league-1", { onEvent }));

    act(() => {
      FakeEventSource.instances[0].fire("draft:pick_made", {
        type: "draft:pick_made",
        data: validPickMadePayload,
      });
    });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent.mock.calls[0][0]).toMatchObject({
      type: "draft:pick_made",
    });
    expect(mockInvalidate).toHaveBeenCalledWith({ leagueId: "league-1" });
  });

  it("ignores invalid JSON payloads without crashing or calling onEvent", () => {
    const onEvent = vi.fn();
    renderHook(() => useDraftEvents("league-1", { onEvent }));

    expect(() => {
      act(() => {
        FakeEventSource.instances[0].fireRaw("draft:pick_made", "{not json");
      });
    }).not.toThrow();

    expect(onEvent).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it("ignores payloads that fail schema validation", () => {
    const onEvent = vi.fn();
    renderHook(() => useDraftEvents("league-1", { onEvent }));

    act(() => {
      FakeEventSource.instances[0].fire("draft:pick_made", {
        type: "draft:pick_made",
        data: { nope: true },
      });
    });

    expect(onEvent).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it("closes the EventSource on unmount", () => {
    const { unmount } = renderHook(() => useDraftEvents("league-1"));
    const instance = FakeEventSource.instances[0];
    expect(instance.closed).toBe(false);
    unmount();
    expect(instance.closed).toBe(true);
  });

  it("does not create an EventSource when enabled is false", () => {
    const { result } = renderHook(() =>
      useDraftEvents("league-1", { enabled: false })
    );
    expect(FakeEventSource.instances).toHaveLength(0);
    expect(result.current.status).toBe("idle");
  });

  it("returns idle when EventSource is undefined in the environment", () => {
    vi.stubGlobal("EventSource", undefined);
    const { result } = renderHook(() => useDraftEvents("league-1"));
    expect(result.current.status).toBe("idle");
  });
});
