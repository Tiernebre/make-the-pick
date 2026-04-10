import { logger } from "../../logger.ts";
import type { DraftRepository } from "./draft.repository.ts";

const log = logger.child({ module: "draft.timers" });

/**
 * Callback the scheduler invokes when a turn deadline expires. Wires back
 * into the service's `runAutoPick` via late-binding to avoid a circular
 * dependency between the service and the scheduler during construction.
 */
export type AutoPickHandler = (
  args: { draftId: string; leagueId: string },
) => Promise<void>;

export interface Clock {
  now(): Date;
}

export interface DraftTimerScheduler {
  schedule(
    draftId: string,
    leagueId: string,
    deadline: Date | null,
  ): void;
  cancel(draftId: string): void;
  /** Fire the timer for `draftId` immediately (test/inspection hook). */
  triggerNowForTest(draftId: string): Promise<void>;
  setAutoPickHandler(handler: AutoPickHandler): void;
  recoverTimers(): Promise<void>;
  activeTimerCount(): number;
}

interface Entry {
  leagueId: string;
  timer: number;
}

/**
 * In-process timer scheduler for draft turn expirations. Design notes:
 *
 * - One `setTimeout` per active draft. Rescheduling clears the prior handle
 *   so we never double-fire. Pause/resume (Phase 3) can be layered on top by
 *   cancelling + rescheduling with the paused-at delta — no changes needed
 *   to this interface.
 * - The scheduler is a pure side-effect component: it never publishes draft
 *   events directly. All state changes flow through the service's normal
 *   `runAutoPick` code path so SSE consumers see identical events regardless
 *   of whether a pick was manual or auto.
 * - The auto-pick handler is injected after construction via
 *   `setAutoPickHandler` to break the service <-> scheduler cycle.
 */
export function createDraftTimerScheduler(deps: {
  draftRepo: DraftRepository;
  clock?: Clock;
}): DraftTimerScheduler {
  const clock: Clock = deps.clock ?? { now: () => new Date() };
  const timers = new Map<string, Entry>();
  let handler: AutoPickHandler | null = null;

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
      log.warn({ draftId }, "timer fired with no auto-pick handler wired");
      return;
    }
    try {
      await handler({ draftId, leagueId });
    } catch (err) {
      log.error({ err, draftId, leagueId }, "auto-pick handler threw");
    }
  }

  return {
    schedule(draftId, leagueId, deadline) {
      clearExisting(draftId);
      if (deadline === null) return;

      const delta = Math.max(0, deadline.getTime() - clock.now().getTime());
      const timer = setTimeout(() => {
        void fire(draftId, leagueId);
      }, delta);
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

    setAutoPickHandler(next) {
      handler = next;
    },

    async recoverTimers() {
      const rows = await deps.draftRepo.listActiveDraftsWithDeadlines();
      log.debug({ count: rows.length }, "recovering draft timers on boot");
      for (const row of rows) {
        if (!row.currentTurnDeadline) continue;
        const deadline = row.currentTurnDeadline instanceof Date
          ? row.currentTurnDeadline
          : new Date(row.currentTurnDeadline);
        if (deadline.getTime() <= clock.now().getTime()) {
          // Overdue — fire immediately, sequentially, so Postgres serializes
          // the writes and we don't stampede the draft state.
          if (handler) {
            try {
              await handler({ draftId: row.id, leagueId: row.leagueId });
            } catch (err) {
              log.error(
                { err, draftId: row.id },
                "recovery auto-pick handler threw",
              );
            }
          }
        } else {
          this.schedule(row.id, row.leagueId, deadline);
        }
      }
    },

    activeTimerCount() {
      return timers.size;
    },
  };
}
