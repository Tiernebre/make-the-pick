import { assertEquals, assertThrows } from "@std/assert";
import { healthResponseSchema } from "./health.ts";

Deno.test("healthResponseSchema parses a valid health response", () => {
  const result = healthResponseSchema.parse({
    status: "ok",
    timestamp: "2026-04-07T00:00:00.000Z",
  });

  assertEquals(result.status, "ok");
  assertEquals(result.timestamp, "2026-04-07T00:00:00.000Z");
});

Deno.test("healthResponseSchema rejects missing fields", () => {
  assertThrows(() => {
    healthResponseSchema.parse({});
  });
});

Deno.test("healthResponseSchema rejects wrong types", () => {
  assertThrows(() => {
    healthResponseSchema.parse({
      status: 123,
      timestamp: true,
    });
  });
});
