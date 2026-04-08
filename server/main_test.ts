import { assertEquals } from "@std/assert";
import { healthResponseSchema } from "@make-the-pick/shared";
import { app } from "./main.ts";

Deno.test({
  name: "GET /api/health returns 200 with valid health response",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const response = await app.request("/api/health");

    assertEquals(response.status, 200);

    const body = await response.json();
    const parsed = healthResponseSchema.parse(body);

    assertEquals(parsed.status, "ok");
    assertEquals(typeof parsed.timestamp, "string");
  },
});
