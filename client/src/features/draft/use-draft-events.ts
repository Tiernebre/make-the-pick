import { useEffect, useRef, useState } from "react";
import {
  draftCompletedEventSchema,
  type DraftEvent,
  draftPickMadeEventSchema,
  draftPoolItemRevealedEventSchema,
  draftPoolRevealCompletedEventSchema,
  draftStartedEventSchema,
  draftStateEventSchema,
  draftTurnChangeEventSchema,
} from "@make-the-pick/shared";
import { trpc } from "../../trpc";

// The SSE endpoint path. Isolated here so it's trivially editable if the
// parallel server PR (`feat/draft-sse-events`) lands with a different route.
function draftEventsUrl(leagueId: string): string {
  return `/api/draft/events/${leagueId}`;
}

// Per-event-name schema lookup. The shared `draftEventSchema` union exists,
// but we already know the event `type` from the SSE event name, so a direct
// lookup gives us a narrower error when validation fails.
const eventSchemas = {
  "draft:state": draftStateEventSchema,
  "draft:started": draftStartedEventSchema,
  "draft:pick_made": draftPickMadeEventSchema,
  "draft:turn_change": draftTurnChangeEventSchema,
  "draft:completed": draftCompletedEventSchema,
  "draftPool:item_revealed": draftPoolItemRevealedEventSchema,
  "draftPool:reveal_completed": draftPoolRevealCompletedEventSchema,
} as const;

type DraftEventName = keyof typeof eventSchemas;

const DRAFT_EVENT_NAMES = Object.keys(eventSchemas) as DraftEventName[];

export type DraftEventsStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error";

export interface UseDraftEventsOptions {
  enabled?: boolean;
  onEvent?: (event: DraftEvent) => void;
}

export interface UseDraftEventsResult {
  status: DraftEventsStatus;
}

export function useDraftEvents(
  leagueId: string,
  opts: UseDraftEventsOptions = {},
): UseDraftEventsResult {
  const { enabled = true, onEvent } = opts;
  const [status, setStatus] = useState<DraftEventsStatus>("idle");
  const utils = trpc.useUtils();

  // Keep latest callback + utils in refs so that re-renders driven by
  // `setStatus` don't tear down and recreate the EventSource.
  const onEventRef = useRef(onEvent);
  const utilsRef = useRef(utils);
  useEffect(() => {
    onEventRef.current = onEvent;
    utilsRef.current = utils;
  });

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    if (typeof EventSource === "undefined") {
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    const source = new EventSource(draftEventsUrl(leagueId));

    source.onopen = () => {
      setStatus("open");
    };
    source.onerror = () => {
      // EventSource auto-reconnects; reflect the transitional state but
      // don't tear down the connection.
      setStatus("error");
    };

    const listeners: Array<
      { name: string; handler: (e: MessageEvent) => void }
    > = [];

    for (const name of DRAFT_EVENT_NAMES) {
      const schema = eventSchemas[name];
      const handler = (e: MessageEvent) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(e.data);
        } catch (err) {
          console.warn(`[useDraftEvents] invalid JSON for ${name}`, err);
          return;
        }
        const result = schema.safeParse(parsed);
        if (!result.success) {
          console.warn(
            `[useDraftEvents] schema validation failed for ${name}`,
            result.error,
          );
          return;
        }
        onEventRef.current?.(result.data as DraftEvent);
        // Draft events invalidate the draft state query; pool reveal
        // events invalidate the draft pool query so the pooling-phase
        // showcase view refreshes as new items flip visible.
        if (name.startsWith("draftPool:")) {
          utilsRef.current.draftPool.getByLeagueId.invalidate({ leagueId });
        } else {
          utilsRef.current.draft.getState.invalidate({ leagueId });
        }
      };
      source.addEventListener(name, handler as EventListener);
      listeners.push({ name, handler });
    }

    return () => {
      for (const { name, handler } of listeners) {
        source.removeEventListener(name, handler as EventListener);
      }
      source.close();
      setStatus("closed");
    };
  }, [leagueId, enabled]);

  return { status };
}
