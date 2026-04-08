import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { HealthResponse } from "@draftr/shared";
import { db, healthChecks } from "./db/mod.ts";
import { appRouter } from "./trpc/router.ts";
import { createContext } from "./trpc/context.ts";
import { registerEchoWebSocket } from "./ws/echo.ts";

export const app = new Hono();

registerEchoWebSocket(app);

app.get("/api/health", async (c) => {
  const [check] = await db.insert(healthChecks).values({}).returning();
  const response: HealthResponse = {
    status: "ok",
    timestamp: check.checkedAt.toISOString(),
  };
  return c.json(response);
});

app.all("/api/trpc/*", (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext(),
  });
});

if (import.meta.main) {
  Deno.serve({ port: 3000 }, app.fetch);
}
