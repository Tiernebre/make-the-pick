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
 * Minimum random delay floor (ms) — kept low so dev testing feels snappy
 * while still simulating a brief "thinking" beat before the NPC picks.
 */
export const NPC_PICK_DELAY_MIN_MS = 300;
export const NPC_PICK_DELAY_MAX_MS = 1500;

export function randomNpcPickDelayMs(
  randomFn: () => number = Math.random,
): number {
  const range = NPC_PICK_DELAY_MAX_MS - NPC_PICK_DELAY_MIN_MS;
  return NPC_PICK_DELAY_MIN_MS + Math.floor(randomFn() * (range + 1));
}
