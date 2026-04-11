import { useCallback, useRef, useState } from "react";

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
  // Refs mirror the state so that setter + show() calls batched inside the
  // same render see the updated value without waiting for an effect flush.
  const isMutedRef = useRef(isMuted);
  const isFastModeRef = useRef(isFastMode);

  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      audioRef.current = new Audio(CEREMONY_JINGLE_SRC);
    }
    return audioRef.current;
  }, []);

  const show = useCallback((next: Ceremony) => {
    if (isFastModeRef.current) return;
    setCurrent(next);
    if (!isMutedRef.current) {
      const audio = getAudio();
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Autoplay policies may block; fail silently rather than throwing.
      });
    }
  }, [getAudio]);

  const skip = useCallback(() => {
    setCurrent(null);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

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
