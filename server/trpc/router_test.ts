import { assertEquals } from "@std/assert";
import { healthResponseSchema } from "@draftr/shared";
import { appRouter } from "./router.ts";
import { createContext } from "./context.ts";

Deno.test({
  name: "health.check returns a valid health response from the database",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.health.check();

    const parsed = healthResponseSchema.parse(result);
    assertEquals(parsed.status, "ok");
    assertEquals(typeof parsed.timestamp, "string");
  },
});
