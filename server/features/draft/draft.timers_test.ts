import { assertEquals } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import type { DraftRepository } from "./draft.repository.ts";
import { createDraftTimerScheduler } from "./draft.timers.ts";

function createFakeDraftRepo(
  overrides: Partial<DraftRepository> = {},
): DraftRepository {
  return {
    findByLeagueId: () => Promise.resolve(null as never),
    findById: () => Promise.resolve(null as never),
    create: () => Promise.resolve(null as never),
    updateStatus: () => Promise.resolve(null as never),
    updateTurnDeadline: () => Promise.resolve(),
    listActiveDraftsWithDeadlines: () => Promise.resolve([]),
    incrementCurrentPick: () => Promise.resolve(0),
    listPicks: () => Promise.resolve([]),
    createPick: () => Promise.resolve(null as never),
    findPickByPoolItem: () => Promise.resolve(null as never),
    ...overrides,
  } as DraftRepository;
}

Deno.test("draftTimerScheduler.schedule: past deadline fires immediately", async () => {
  using time = new FakeTime(0);
  const scheduler = createDraftTimerScheduler({
    draftRepo: createFakeDraftRepo(),
    clock: { now: () => new Date(time.now) },
  });
  const calls: Array<{ draftId: string; leagueId: string }> = [];
  scheduler.setAutoPickHandler((args) => {
    calls.push(args);
    return Promise.resolve();
  });

  scheduler.schedule("draft-1", "league-1", new Date(-1000));
  await time.tickAsync(0);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].draftId, "draft-1");
});

Deno.test("draftTimerScheduler.schedule: fires after delta, not before", async () => {
  using time = new FakeTime(0);
  const scheduler = createDraftTimerScheduler({
    draftRepo: createFakeDraftRepo(),
    clock: { now: () => new Date(time.now) },
  });
  let fired = 0;
  scheduler.setAutoPickHandler(() => {
    fired++;
    return Promise.resolve();
  });

  scheduler.schedule("draft-1", "league-1", new Date(5000));
  await time.tickAsync(4999);
  assertEquals(fired, 0);
  await time.tickAsync(1);
  assertEquals(fired, 1);
});

Deno.test("draftTimerScheduler.schedule: reschedule clears prior timer", async () => {
  using time = new FakeTime(0);
  const scheduler = createDraftTimerScheduler({
    draftRepo: createFakeDraftRepo(),
    clock: { now: () => new Date(time.now) },
  });
  const calls: string[] = [];
  scheduler.setAutoPickHandler((args) => {
    calls.push(args.draftId);
    return Promise.resolve();
  });

  scheduler.schedule("draft-1", "league-1", new Date(2000));
  scheduler.schedule("draft-1", "league-1", new Date(5000));
  await time.tickAsync(2000);
  assertEquals(calls.length, 0);
  await time.tickAsync(3000);
  assertEquals(calls.length, 1);
});

Deno.test("draftTimerScheduler.cancel: clears pending timer", async () => {
  using time = new FakeTime(0);
  const scheduler = createDraftTimerScheduler({
    draftRepo: createFakeDraftRepo(),
    clock: { now: () => new Date(time.now) },
  });
  let fired = 0;
  scheduler.setAutoPickHandler(() => {
    fired++;
    return Promise.resolve();
  });

  scheduler.schedule("draft-1", "league-1", new Date(1000));
  scheduler.cancel("draft-1");
  await time.tickAsync(2000);
  assertEquals(fired, 0);
  assertEquals(scheduler.activeTimerCount(), 0);
});

Deno.test("draftTimerScheduler.schedule: null deadline clears without firing", async () => {
  using time = new FakeTime(0);
  const scheduler = createDraftTimerScheduler({
    draftRepo: createFakeDraftRepo(),
    clock: { now: () => new Date(time.now) },
  });
  let fired = 0;
  scheduler.setAutoPickHandler(() => {
    fired++;
    return Promise.resolve();
  });

  scheduler.schedule("draft-1", "league-1", new Date(1000));
  scheduler.schedule("draft-1", "league-1", null);
  await time.tickAsync(2000);
  assertEquals(fired, 0);
});

Deno.test("draftTimerScheduler.recoverTimers: fires overdue immediately, schedules future", async () => {
  using time = new FakeTime(10_000);
  const draftRepo = createFakeDraftRepo({
    listActiveDraftsWithDeadlines: () =>
      Promise.resolve([
        {
          id: "overdue-draft",
          leagueId: "league-a",
          currentTurnDeadline: new Date(5_000), // in the past
        },
        {
          id: "future-draft",
          leagueId: "league-b",
          currentTurnDeadline: new Date(15_000), // 5s in future
        },
      ]),
  });
  const scheduler = createDraftTimerScheduler({
    draftRepo,
    clock: { now: () => new Date(time.now) },
  });
  const fired: string[] = [];
  scheduler.setAutoPickHandler((args) => {
    fired.push(args.draftId);
    return Promise.resolve();
  });

  await scheduler.recoverTimers();

  assertEquals(fired, ["overdue-draft"]);
  assertEquals(scheduler.activeTimerCount(), 1);

  await time.tickAsync(5000);
  assertEquals(fired, ["overdue-draft", "future-draft"]);
});
