import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "./use-web-socket";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {}
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal("WebSocket", MockWebSocket);
});

describe("useWebSocket", () => {
  it("connects to the given URL", () => {
    renderHook(() => useWebSocket("ws://localhost:3000/ws/echo"));
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe(
      "ws://localhost:3000/ws/echo",
    );
  });

  it("sends messages", async () => {
    const { result } = renderHook(() =>
      useWebSocket("ws://localhost:3000/ws/echo")
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => {
      result.current.sendMessage("hello");
    });

    expect(MockWebSocket.instances[0].sent).toContain("hello");
  });

  it("receives messages", async () => {
    const { result } = renderHook(() =>
      useWebSocket("ws://localhost:3000/ws/echo")
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => {
      MockWebSocket.instances[0].onmessage?.({ data: "echo: hello" });
    });

    expect(result.current.lastMessage).toBe("echo: hello");
  });
});
