import { Hono } from "hono";
import type { HealthResponse } from "@draftr/shared";

export const app = new Hono();

app.get("/api/health", (c) => {
  const response: HealthResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
  return c.json(response);
});

if (import.meta.main) {
  Deno.serve({ port: 3000 }, app.fetch);
}
