import { assertEquals } from "@std/assert";
import type { DraftEvent } from "@make-the-pick/shared";
import { createDraftEventPublisher } from "./draft.events.ts";

function makeStateEvent(leagueId: string): DraftEvent {
  return {
    type: "draft:state",
    data: {
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
      },
      picks: [],
      players: [],
      poolItems: [],
      availableItemIds: [],
    },
  };
}

Deno.test("draftEventPublisher: subscribe then publish invokes listener", () => {
  const publisher = createDraftEventPublisher();
  const leagueId = crypto.randomUUID();
  const received: DraftEvent[] = [];

  publisher.subscribe(leagueId, (event) => {
    received.push(event);
  });

  const event = makeStateEvent(leagueId);
  publisher.publish(leagueId, event);

  assertEquals(received.length, 1);
  assertEquals(received[0], event);
});

Deno.test("draftEventPublisher: multiple listeners for the same league all receive the event", () => {
  const publisher = createDraftEventPublisher();
  const leagueId = crypto.randomUUID();
  let count1 = 0;
  let count2 = 0;

  publisher.subscribe(leagueId, () => {
    count1++;
  });
  publisher.subscribe(leagueId, () => {
    count2++;
  });

  publisher.publish(leagueId, makeStateEvent(leagueId));

  assertEquals(count1, 1);
  assertEquals(count2, 1);
  assertEquals(publisher.subscriberCount(leagueId), 2);
});

Deno.test("draftEventPublisher: unsubscribe stops delivery to that listener only", () => {
  const publisher = createDraftEventPublisher();
  const leagueId = crypto.randomUUID();
  let count1 = 0;
  let count2 = 0;

  const unsub1 = publisher.subscribe(leagueId, () => {
    count1++;
  });
  publisher.subscribe(leagueId, () => {
    count2++;
  });

  unsub1();
  publisher.publish(leagueId, makeStateEvent(leagueId));

  assertEquals(count1, 0);
  assertEquals(count2, 1);
  assertEquals(publisher.subscriberCount(leagueId), 1);
});

Deno.test("draftEventPublisher: publishes are scoped by leagueId", () => {
  const publisher = createDraftEventPublisher();
  const leagueA = crypto.randomUUID();
  const leagueB = crypto.randomUUID();
  let aCount = 0;
  let bCount = 0;

  publisher.subscribe(leagueA, () => {
    aCount++;
  });
  publisher.subscribe(leagueB, () => {
    bCount++;
  });

  publisher.publish(leagueA, makeStateEvent(leagueA));

  assertEquals(aCount, 1);
  assertEquals(bCount, 0);
});

Deno.test("draftEventPublisher: listener throwing does not block other listeners", () => {
  const publisher = createDraftEventPublisher();
  const leagueId = crypto.randomUUID();
  let called = false;

  publisher.subscribe(leagueId, () => {
    throw new Error("boom");
  });
  publisher.subscribe(leagueId, () => {
    called = true;
  });

  // Should not throw
  publisher.publish(leagueId, makeStateEvent(leagueId));
  assertEquals(called, true);
});

Deno.test("draftEventPublisher: publish with no listeners is a no-op", () => {
  const publisher = createDraftEventPublisher();
  const leagueId = crypto.randomUUID();
  // Should not throw
  publisher.publish(leagueId, makeStateEvent(leagueId));
  assertEquals(publisher.subscriberCount(leagueId), 0);
});

Deno.test("draftEventPublisher: unsubscribing last listener clears set; subscriberCount is zero", () => {
  const publisher = createDraftEventPublisher();
  const leagueId = crypto.randomUUID();
  const unsub = publisher.subscribe(leagueId, () => {});
  assertEquals(publisher.subscriberCount(leagueId), 1);
  unsub();
  assertEquals(publisher.subscriberCount(leagueId), 0);
});
