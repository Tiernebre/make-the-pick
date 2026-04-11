import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Ceremony,
  CEREMONY_FAST_MODE_KEY,
  CEREMONY_MUTED_KEY,
  useDraftCeremony,
} from "./use-draft-ceremony";

const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();

class FakeAudio {
  src: string;
  muted = false;
  currentTime = 0;
  constructor(src: string) {
    this.src = src;
  }
  play = play;
  pause = pause;
}

const ceremony: Ceremony = {
  id: "pick-1",
  playerName: "Alice",
  pokemonName: "Pikachu",
  pickNumber: 0,
  round: 1,
};

beforeEach(() => {
  play.mockClear();
  pause.mockClear();
  localStorage.clear();
  vi.stubGlobal("Audio", FakeAudio);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useDraftCeremony", () => {
  it("defaults to muted on first visit", () => {
    const { result } = renderHook(() => useDraftCeremony());
    expect(result.current.isMuted).toBe(true);
  });

  it("show() sets current ceremony and does not play audio while muted", () => {
    const { result } = renderHook(() => useDraftCeremony());

    act(() => {
      result.current.show(ceremony);
    });

    expect(result.current.current).toEqual(ceremony);
    expect(play).not.toHaveBeenCalled();
  });

  it("show() plays the jingle when unmuted", () => {
    const { result } = renderHook(() => useDraftCeremony());

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.show(ceremony);
    });

    expect(play).toHaveBeenCalledTimes(1);
  });

  it("show() is a no-op when fast mode is enabled", () => {
    const { result } = renderHook(() => useDraftCeremony());

    act(() => {
      result.current.toggleMute(); // unmute so we can verify audio is also skipped
      result.current.setFastMode(true);
    });

    act(() => {
      result.current.show(ceremony);
    });

    expect(result.current.current).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it("skip() clears the current ceremony and stops audio", () => {
    const { result } = renderHook(() => useDraftCeremony());

    act(() => {
      result.current.toggleMute();
      result.current.show(ceremony);
    });

    act(() => {
      result.current.skip();
    });

    expect(result.current.current).toBeNull();
    expect(pause).toHaveBeenCalled();
  });

  it("persists mute state across remounts via localStorage", () => {
    const { result, unmount } = renderHook(() => useDraftCeremony());

    act(() => {
      result.current.toggleMute();
    });
    expect(localStorage.getItem(CEREMONY_MUTED_KEY)).toBe("false");
    unmount();

    const { result: result2 } = renderHook(() => useDraftCeremony());
    expect(result2.current.isMuted).toBe(false);
  });

  it("persists fast mode across remounts via localStorage", () => {
    const { result, unmount } = renderHook(() => useDraftCeremony());

    act(() => {
      result.current.setFastMode(true);
    });
    expect(localStorage.getItem(CEREMONY_FAST_MODE_KEY)).toBe("true");
    unmount();

    const { result: result2 } = renderHook(() => useDraftCeremony());
    expect(result2.current.isFastMode).toBe(true);
  });

  it("show() replaces an in-progress ceremony with the new pick", () => {
    const { result } = renderHook(() => useDraftCeremony());

    act(() => {
      result.current.show(ceremony);
    });
    act(() => {
      result.current.show({ ...ceremony, id: "pick-2", pokemonName: "Mew" });
    });

    expect(result.current.current?.id).toBe("pick-2");
    expect(result.current.current?.pokemonName).toBe("Mew");
  });
});
