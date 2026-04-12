import { assertEquals, assertStringIncludes } from "@std/assert";
import { Hono } from "hono";
import pino from "pino";
import { TRPCError } from "@trpc/server";
import type { AppEnv } from "../../env.ts";
import { requestContextMiddleware } from "../../middleware/request-context.ts";
import type { DraftEvent, DraftState } from "@make-the-pick/shared";
import type { DraftService } from "./draft.service.ts";
import {
  createDraftEventPublisher,
  type DraftEventPublisher,
} from "./draft.events.ts";
import { registerDraftSseRoute } from "./draft.sse.ts";

function createFakeState(leagueId: string): DraftState {
  return {
    draft: {
      id: crypto.randomUUID(),
      leagueId,
      format: "snake",
      status: "in_progress",
      pickOrder: [],
      currentPick: 0,
      startedAt: null,
      completedAt: null,
      currentTurnDeadline: null,
      fastMode: false,
    },
    picks: [],
    players: [],
    poolItems: [],
    availableItemIds: [],
  };
}

function createFakeDraftService(
  handler: (args: { userId: string; leagueId: string }) => Promise<DraftState>,
): DraftService {
  return {
    startDraft: () => {
      throw new Error("not implemented");
    },
    makePick: () => {
      throw new Error("not implemented");
    },
    validatePick: () => {
      throw new Error("not implemented");
    },
    getState: handler,
  } as unknown as DraftService;
}

function buildApp(opts: {
  publisher: DraftEventPublisher;
  draftService: DraftService;
  sessionUserId: string | null;
}) {
  const app = new Hono<AppEnv>();
  const silentLog = pino({ level: "silent" });
  app.use(requestContextMiddleware(silentLog));
  registerDraftSseRoute(app, {
    draftService: opts.draftService,
    draftEventPublisher: opts.publisher,
    sessionResolver: () =>
      Promise.resolve(
        opts.sessionUserId ? { userId: opts.sessionUserId } : null,
      ),
    heartbeatIntervalMs: 60_000,
  });
  return app;
}

Deno.test("draft SSE: unauthenticated request → 401", async () => {
  const app = buildApp({
    publisher: createDraftEventPublisher(),
    draftService: createFakeDraftService(() =>
      Promise.resolve(createFakeState(crypto.randomUUID()))
    ),
    sessionUserId: null,
  });

  const res = await app.request(`/api/draft/events/${crypto.randomUUID()}`);
  assertEquals(res.status, 401);
  await res.body?.cancel();
});

Deno.test("draft SSE: non-member → 403", async () => {
  const app = buildApp({
    publisher: createDraftEventPublisher(),
    draftService: createFakeDraftService(() =>
      Promise.reject(
        new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a league member to view the draft",
        }),
      )
    ),
    sessionUserId: "user-1",
  });

  const res = await app.request(`/api/draft/events/${crypto.randomUUID()}`);
  assertEquals(res.status, 403);
  await res.body?.cancel();
});

Deno.test("draft SSE: streams initial state and forwards published events, unsubscribes on disconnect", async () => {
  const leagueId = crypto.randomUUID();
  const publisher = createDraftEventPublisher();
  const initial = createFakeState(leagueId);
  const app = buildApp({
    publisher,
    draftService: createFakeDraftService(() => Promise.resolve(initial)),
    sessionUserId: "user-1",
  });

  const controller = new AbortController();
  const res = await app.request(`/api/draft/events/${leagueId}`, {
    signal: controller.signal,
  });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "text/event-stream");

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  async function readUntil(
    predicate: (buf: string) => boolean,
  ): Promise<string> {
    let buf = "";
    while (!predicate(buf)) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
    }
    return buf;
  }

  // First frame should be the initial snapshot.
  const initialFrame = await readUntil((b) => b.includes("event: draft:state"));
  assertStringIncludes(initialFrame, "event: draft:state");
  assertStringIncludes(initialFrame, initial.draft.id);

  // While the subscriber is connected, subscriberCount should be 1.
  // Wait a tick to let the handler's subscribe() run.
  await new Promise((r) => setTimeout(r, 10));
  assertEquals(publisher.subscriberCount(leagueId), 1);

  // Publish a turn_change event and read it off the stream.
  const event: DraftEvent = {
    type: "draft:turn_change",
    data: {
      currentLeaguePlayerId: crypto.randomUUID(),
      pickNumber: 1,
      round: 0,
      turnDeadline: null,
    },
  };
  publisher.publish(leagueId, event);

  const nextFrame = await readUntil((b) =>
    b.includes("event: draft:turn_change")
  );
  assertStringIncludes(nextFrame, "event: draft:turn_change");
  assertStringIncludes(nextFrame, '"pickNumber":1');

  // Abort the client and verify cleanup.
  await reader.cancel();
  controller.abort();
  // Allow the handler's abort listener to run.
  await new Promise((r) => setTimeout(r, 20));
  assertEquals(publisher.subscriberCount(leagueId), 0);
});

Deno.test("draft SSE: member → streams events even when no draft exists yet (pooling phase)", async () => {
  const leagueId = crypto.randomUUID();
  const publisher = createDraftEventPublisher();
  // Simulate the draft row not yet existing — e.g. league is in "pooling"
  // phase. getState throws NOT_FOUND after validating membership.
  const app = buildApp({
    publisher,
    draftService: createFakeDraftService(() =>
      Promise.reject(
        new TRPCError({
          code: "NOT_FOUND",
          message: "No draft has been created for this league yet",
        }),
      )
    ),
    sessionUserId: "user-1",
  });

  const controller = new AbortController();
  const res = await app.request(`/api/draft/events/${leagueId}`, {
    signal: controller.signal,
  });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "text/event-stream");

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  async function readUntil(
    predicate: (buf: string) => boolean,
    maxReads = 20,
  ): Promise<string> {
    let buf = "";
    let reads = 0;
    while (!predicate(buf) && reads < maxReads) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      reads++;
    }
    return buf;
  }

  // Wait for subscription.
  await new Promise((r) => setTimeout(r, 10));
  assertEquals(publisher.subscriberCount(leagueId), 1);

  // Publish a pool reveal event and confirm it streams through.
  const event: DraftEvent = {
    type: "draftPool:item_revealed",
    data: {
      itemId: crypto.randomUUID(),
      revealOrder: 0,
      remaining: 4,
    },
  };
  publisher.publish(leagueId, event);

  const frame = await readUntil((b) =>
    b.includes("event: draftPool:item_revealed")
  );
  assertStringIncludes(frame, "event: draftPool:item_revealed");
  assertStringIncludes(frame, '"remaining":4');

  await reader.cancel();
  controller.abort();
  await new Promise((r) => setTimeout(r, 20));
  assertEquals(publisher.subscriberCount(leagueId), 0);
});
