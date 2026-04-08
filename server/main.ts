import { Hono } from "hono";
import type { HealthResponse } from "@draftr/shared";
import { db, healthChecks } from "./db/mod.ts";

export const app = new Hono();

app.get("/api/health", async (c) => {
  const [check] = await db.insert(healthChecks).values({}).returning();
  const response: HealthResponse = {
    status: "ok",
    timestamp: check.checkedAt.toISOString(),
  };
  return c.json(response);
});

if (import.meta.main) {
  Deno.serve({ port: 3000 }, app.fetch);
}
