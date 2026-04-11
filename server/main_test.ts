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
    assertEquals(typeof parsed.commit, "string");
  },
});

Deno.test({
  name: "GET /api/health returns GIT_SHA env var as commit",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const previous = Deno.env.get("GIT_SHA");
    Deno.env.set("GIT_SHA", "deadbeefcafef00d");
    try {
      const response = await app.request("/api/health");
      const body = await response.json();
      const parsed = healthResponseSchema.parse(body);
      assertEquals(parsed.commit, "deadbeefcafef00d");
    } finally {
      if (previous === undefined) {
        Deno.env.delete("GIT_SHA");
      } else {
        Deno.env.set("GIT_SHA", previous);
      }
    }
  },
});
