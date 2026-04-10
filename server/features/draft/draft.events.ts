import type { DraftEvent } from "@make-the-pick/shared";
import { logger } from "../../logger.ts";

const log = logger.child({ module: "draft.events" });

export type DraftEventListener = (event: DraftEvent) => void;

export interface DraftEventPublisher {
  subscribe(leagueId: string, listener: DraftEventListener): () => void;
  publish(leagueId: string, event: DraftEvent): void;
  subscriberCount(leagueId: string): number;
}

/**
 * In-memory draft event pub/sub. A single instance is shared across the
 * server process: the draft service publishes to it from inside transactions,
 * and the SSE endpoint subscribes per-connection.
 *
 * Listener exceptions are caught per-listener so a single misbehaving
 * subscriber cannot starve other subscribers on the same league.
 */
export function createDraftEventPublisher(): DraftEventPublisher {
  const listenersByLeague = new Map<string, Set<DraftEventListener>>();

  return {
    subscribe(leagueId, listener) {
      let set = listenersByLeague.get(leagueId);
      if (!set) {
        set = new Set();
        listenersByLeague.set(leagueId, set);
      }
      set.add(listener);
      return () => {
        const current = listenersByLeague.get(leagueId);
        if (!current) return;
        current.delete(listener);
        if (current.size === 0) {
          listenersByLeague.delete(leagueId);
        }
      };
    },

    publish(leagueId, event) {
      const set = listenersByLeague.get(leagueId);
      if (!set || set.size === 0) return;
      // Snapshot so unsubscribe during iteration is safe.
      for (const listener of [...set]) {
        try {
          listener(event);
        } catch (err) {
          log.error(
            { err, leagueId, eventType: event.type },
            "draft event listener threw",
          );
        }
      }
    },

    subscriberCount(leagueId) {
      return listenersByLeague.get(leagueId)?.size ?? 0;
    },
  };
}
