import { assertEquals } from "jsr:@std/assert";
import { healthResponseSchema } from "@draftr/shared";
import { app } from "./main.ts";

Deno.test("GET /api/health returns 200 with valid health response", async () => {
  const response = await app.request("/api/health");

  assertEquals(response.status, 200);

  const body = await response.json();
  const parsed = healthResponseSchema.parse(body);

  assertEquals(parsed.status, "ok");
  assertEquals(typeof parsed.timestamp, "string");
});
