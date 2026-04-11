import { useCallback, useEffect, useRef, useState } from "react";

export interface Ceremony {
  id: string;
  playerName: string;
  pokemonName: string;
  pickNumber: number;
  round: number;
}

export const CEREMONY_MUTED_KEY = "draft-ceremony:muted";
export const CEREMONY_FAST_MODE_KEY = "draft-ceremony:fast-mode";
export const CEREMONY_JINGLE_SRC = "/audio/draft-jingle.mp3";
// Source mp3 was ripped at full broadcast loudness; clamp playback so the
// horn doesn't physically hurt anyone wearing headphones.
export const CEREMONY_VOLUME = 0.2;
// How long the breaking-news banner stays on screen before auto-dismissing.
// Long enough to read who picked whom, short enough that a fast NPC burst
// doesn't pile up a backlog of stale picks.
export const CEREMONY_DURATION_MS = 7000;

// Starts muted so nobody gets ambushed by the horn the first time they land
// on the draft page. Once a user opts in, we persist that choice.
function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // localStorage may be unavailable (SSR, privacy mode) — silently degrade.
  }
}

export interface UseDraftCeremonyResult {
  current: Ceremony | null;
  isMuted: boolean;
  isFastMode: boolean;
  show(ceremony: Ceremony): void;
  skip(): void;
  toggleMute(): void;
  setFastMode(enabled: boolean): void;
}

export function useDraftCeremony(): UseDraftCeremonyResult {
  const [current, setCurrent] = useState<Ceremony | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() =>
    readBool(CEREMONY_MUTED_KEY, true)
  );
  const [isFastMode, setIsFastModeState] = useState<boolean>(() =>
    readBool(CEREMONY_FAST_MODE_KEY, false)
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs mirror the state so that setter + show() calls batched inside the
  // same render see the updated value without waiting for an effect flush.
  const isMutedRef = useRef(isMuted);
  const isFastModeRef = useRef(isFastMode);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearDismissTimer();
    };
  }, [clearDismissTimer]);

  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const audio = new Audio(CEREMONY_JINGLE_SRC);
      audio.volume = CEREMONY_VOLUME;
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const show = useCallback((next: Ceremony) => {
    if (isFastModeRef.current) return;
    setCurrent(next);
    clearDismissTimer();
    dismissTimerRef.current = setTimeout(() => {
      setCurrent(null);
      dismissTimerRef.current = null;
    }, CEREMONY_DURATION_MS);
    if (!isMutedRef.current) {
      const audio = getAudio();
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Autoplay policies may block; fail silently rather than throwing.
      });
    }
  }, [getAudio, clearDismissTimer]);

  const skip = useCallback(() => {
    clearDismissTimer();
    setCurrent(null);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [clearDismissTimer]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      writeBool(CEREMONY_MUTED_KEY, next);
      return next;
    });
  }, []);

  const setFastMode = useCallback((enabled: boolean) => {
    isFastModeRef.current = enabled;
    writeBool(CEREMONY_FAST_MODE_KEY, enabled);
    setIsFastModeState(enabled);
  }, []);

  return {
    current,
    isMuted,
    isFastMode,
    show,
    skip,
    toggleMute,
    setFastMode,
  };
}
