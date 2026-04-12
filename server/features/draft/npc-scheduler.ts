import { logger } from "../../logger.ts";

const log = logger.child({ module: "draft.npc-scheduler" });

export type NpcPickHandler = (
  args: { leagueId: string },
) => Promise<void>;

/**
 * Lightweight in-process scheduler for NPC auto-picks. Mirrors the draft
 * timer scheduler's shape so tests can fire timers deterministically.
 * Dev-only: NPC players only exist in non-production environments.
 */
export interface NpcScheduler {
  schedule(draftId: string, leagueId: string, delayMs: number): void;
  cancel(draftId: string): void;
  triggerNowForTest(draftId: string): Promise<void>;
  setHandler(handler: NpcPickHandler): void;
  activeTimerCount(): number;
}

interface Entry {
  leagueId: string;
  timer: number;
}

export function createNpcScheduler(): NpcScheduler {
  const timers = new Map<string, Entry>();
  let handler: NpcPickHandler | null = null;

  function clearExisting(draftId: string): void {
    const existing = timers.get(draftId);
    if (existing) {
      clearTimeout(existing.timer);
      timers.delete(draftId);
    }
  }

  async function fire(draftId: string, leagueId: string): Promise<void> {
    timers.delete(draftId);
    if (!handler) {
      log.warn({ draftId }, "NPC timer fired with no handler wired");
      return;
    }
    try {
      await handler({ leagueId });
    } catch (err) {
      log.error({ err, draftId, leagueId }, "NPC pick handler threw");
    }
  }

  return {
    schedule(draftId, leagueId, delayMs) {
      clearExisting(draftId);
      const timer = setTimeout(() => {
        void fire(draftId, leagueId);
      }, Math.max(0, delayMs));
      timers.set(draftId, { leagueId, timer });
    },

    cancel(draftId) {
      clearExisting(draftId);
    },

    async triggerNowForTest(draftId) {
      const entry = timers.get(draftId);
      if (!entry) return;
      clearTimeout(entry.timer);
      await fire(draftId, entry.leagueId);
    },

    setHandler(next) {
      handler = next;
    },

    activeTimerCount() {
      return timers.size;
    },
  };
}

/**
 * NPC "thinking" delay bounds (ms). The minimum gives the draft room a beat
 * to feel like a real person is deliberating; the maximum is the default
 * ceiling for untimed drafts. Timed drafts clamp the upper bound down to the
 * league's per-pick shot clock so NPCs never blow past the deadline.
 */
export const NPC_PICK_DELAY_MIN_MS = 10_000;
export const NPC_PICK_DELAY_MAX_MS = 120_000;

export interface NpcPickDelayArgs {
  /** League's per-pick time limit in seconds, or null for untimed drafts. */
  pickTimeLimitSeconds: number | null;
  /**
   * When true, skip the natural delay entirely and return 0 — NPCs pick
   * immediately. Wired to the draft's server-persisted fast mode toggle so
   * commissioners can fast-forward NPC-heavy drafts.
   */
  fastMode: boolean;
  randomFn?: () => number;
}

export function randomNpcPickDelayMs(args: NpcPickDelayArgs): number {
  if (args.fastMode) return 0;
  const randomFn = args.randomFn ?? Math.random;
  const timerMs = args.pickTimeLimitSeconds != null
    ? args.pickTimeLimitSeconds * 1000
    : Number.POSITIVE_INFINITY;
  const max = Math.min(NPC_PICK_DELAY_MAX_MS, timerMs);
  // When the pick timer is tighter than the natural 10s floor, collapse the
  // floor so we never schedule beyond the shot clock.
  const min = Math.min(NPC_PICK_DELAY_MIN_MS, max);
  const range = max - min;
  return min + Math.floor(randomFn() * (range + 1));
}
