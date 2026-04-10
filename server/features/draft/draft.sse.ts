import type { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { DraftEvent, DraftState } from "@make-the-pick/shared";
import { TRPCError } from "@trpc/server";
import { logger } from "../../logger.ts";
import type { DraftService } from "./draft.service.ts";
import type { DraftEventPublisher } from "./draft.events.ts";

const log = logger.child({ module: "draft.sse" });

export interface DraftSseSession {
  userId: string;
}

export type DraftSseSessionResolver = (
  req: Request,
) => Promise<DraftSseSession | null>;

export interface DraftSseDeps {
  draftService: DraftService;
  draftEventPublisher: DraftEventPublisher;
  sessionResolver: DraftSseSessionResolver;
  /** Heartbeat interval in ms. Defaults to 15s. Tests override this. */
  heartbeatIntervalMs?: number;
}

const DEFAULT_HEARTBEAT_MS = 15_000;

/**
 * Registers `GET /api/draft/events/:leagueId` as a Server-Sent Events stream.
 *
 * On connect the handler:
 *   1. Resolves the caller's session (401 if missing).
 *   2. Loads the draft state via `draftService.getState`, which enforces
 *      league membership (403 if the user is not a member).
 *   3. Emits an initial `draft:state` event with the current snapshot.
 *   4. Subscribes to the publisher and forwards every event as SSE.
 *   5. Unsubscribes cleanly on client disconnect.
 */
export function registerDraftSseRoute(app: Hono, deps: DraftSseDeps): void {
  const heartbeatIntervalMs = deps.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_MS;

  app.get("/api/draft/events/:leagueId", async (c) => {
    const session = await deps.sessionResolver(c.req.raw);
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const leagueId = c.req.param("leagueId");

    // getState validates league membership and gives us the initial snapshot.
    let initialState;
    try {
      initialState = await deps.draftService.getState({
        userId: session.userId,
        leagueId,
      });
    } catch (err) {
      if (err instanceof TRPCError) {
        if (err.code === "FORBIDDEN") {
          return c.json({ error: err.message }, 403);
        }
        if (err.code === "NOT_FOUND") {
          return c.json({ error: err.message }, 404);
        }
      }
      log.error({ err, leagueId }, "failed to load draft state for SSE");
      throw err;
    }

    return streamSSE(c, async (stream) => {
      const queue: DraftEvent[] = [];
      let notify: (() => void) | null = null;

      const listener = (event: DraftEvent) => {
        queue.push(event);
        notify?.();
      };
      const unsubscribe = deps.draftEventPublisher.subscribe(
        leagueId,
        listener,
      );

      // Emit initial snapshot so reconnects see the full current state.
      const initialEvent: DraftEvent = {
        type: "draft:state",
        data: initialState as DraftState,
      };
      await stream.writeSSE({
        event: initialEvent.type,
        data: JSON.stringify(initialEvent),
      });

      const heartbeatTimer = setInterval(() => {
        // Comment lines are ignored by EventSource clients but keep proxies alive.
        stream.write(": ping\n\n").catch(() => {});
      }, heartbeatIntervalMs);

      const cleanup = () => {
        clearInterval(heartbeatTimer);
        unsubscribe();
      };

      c.req.raw.signal.addEventListener("abort", () => {
        cleanup();
        notify?.();
      });

      try {
        while (!c.req.raw.signal.aborted && !stream.aborted) {
          if (queue.length === 0) {
            await new Promise<void>((resolve) => {
              notify = () => {
                notify = null;
                resolve();
              };
              // Guard against a race where cleanup happened before we parked.
              if (c.req.raw.signal.aborted) {
                notify = null;
                resolve();
              }
            });
          }
          while (queue.length > 0) {
            const event = queue.shift()!;
            await stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event),
            });
            // If this event represents end-of-draft, still keep the stream
            // open so the client can receive additional follow-ups. We only
            // break when the connection is actually torn down.
          }
        }
      } finally {
        cleanup();
      }
    });
  });
}
