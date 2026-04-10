import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Stub react-remove-scroll — Deno's npm module store on Linux doesn't
// resolve its nested CJS require chain correctly, and tests don't need
// scroll-lock behavior.
vi.mock("react-remove-scroll", () => {
  const RemoveScroll = ({ children }: { children?: unknown }) => children;
  RemoveScroll.classNames = { fullWidth: "", zeroRight: "" };
  return { RemoveScroll, default: RemoveScroll };
});

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class MockWebSocket extends EventTarget {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    readyState = 0;
    url: string;
    protocol = "";
    bufferedAmount = 0;
    extensions = "";
    binaryType: BinaryType = "blob";
    onopen: ((ev: Event) => void) | null = null;
    onclose: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    constructor(url: string | URL) {
      super();
      this.url = String(url);
    }
    send() {}
    close() {}
  } as unknown as typeof WebSocket;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
