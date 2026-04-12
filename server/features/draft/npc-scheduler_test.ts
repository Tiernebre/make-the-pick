import { assert, assertEquals } from "@std/assert";
import {
  NPC_PICK_DELAY_MAX_MS,
  NPC_PICK_DELAY_MIN_MS,
  randomNpcPickDelayMs,
} from "./npc-scheduler.ts";

Deno.test("randomNpcPickDelayMs: min floor is 10s", () => {
  assertEquals(NPC_PICK_DELAY_MIN_MS, 10_000);
});

Deno.test("randomNpcPickDelayMs: default (non-timed) cap is 2 minutes", () => {
  assertEquals(NPC_PICK_DELAY_MAX_MS, 120_000);
});

Deno.test("randomNpcPickDelayMs: non-timed draft returns value within [10s, 2min]", () => {
  for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
    const ms = randomNpcPickDelayMs({
      pickTimeLimitSeconds: null,
      fastMode: false,
      randomFn: () => r,
    });
    assert(
      ms >= 10_000 && ms <= 120_000,
      `expected [10000, 120000], got ${ms} for r=${r}`,
    );
  }
});

Deno.test("randomNpcPickDelayMs: timed draft clamps max to pickTimeLimitSeconds", () => {
  const ms = randomNpcPickDelayMs({
    pickTimeLimitSeconds: 30,
    fastMode: false,
    randomFn: () => 0.999,
  });
  assert(ms <= 30_000, `expected <= 30000, got ${ms}`);
  assert(ms >= 10_000, `expected >= 10000, got ${ms}`);
});

Deno.test("randomNpcPickDelayMs: timed draft with very short timer fires below 10s floor", () => {
  // When the league's pick time limit is tighter than the 10s "natural" floor,
  // the floor gives way so we never blow past the shot clock.
  const ms = randomNpcPickDelayMs({
    pickTimeLimitSeconds: 5,
    fastMode: false,
    randomFn: () => 0.999,
  });
  assert(ms <= 5_000, `expected <= 5000, got ${ms}`);
  assert(ms >= 0, `expected >= 0, got ${ms}`);
});

Deno.test("randomNpcPickDelayMs: fast mode returns 0 regardless of timer", () => {
  assertEquals(
    randomNpcPickDelayMs({
      pickTimeLimitSeconds: null,
      fastMode: true,
      randomFn: () => 0.5,
    }),
    0,
  );
  assertEquals(
    randomNpcPickDelayMs({
      pickTimeLimitSeconds: 60,
      fastMode: true,
      randomFn: () => 0.5,
    }),
    0,
  );
});

Deno.test("randomNpcPickDelayMs: randomness spans the range", () => {
  const lo = randomNpcPickDelayMs({
    pickTimeLimitSeconds: null,
    fastMode: false,
    randomFn: () => 0,
  });
  const hi = randomNpcPickDelayMs({
    pickTimeLimitSeconds: null,
    fastMode: false,
    randomFn: () => 0.999999,
  });
  assertEquals(lo, 10_000);
  assert(hi >= 119_000, `expected hi ≈ 120000, got ${hi}`);
});
