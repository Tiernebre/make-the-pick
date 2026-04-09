import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { HealthResponse } from "@make-the-pick/shared";
import { db, healthChecks } from "./db/mod.ts";
import { appRouter } from "./trpc/router.ts";
import { createContext } from "./trpc/context.ts";
import { registerEchoWebSocket } from "./ws/echo.ts";
import { auth } from "./auth/mod.ts";
import { renderTrpcPanel } from "trpc-panel";

export const app: Hono = new Hono();

registerEchoWebSocket(app);

// Auth routes — must come before tRPC
app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw));

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
    createContext: ({ req }) => createContext(req),
  });
});

// Dev-only: tRPC Panel UI for exploring API endpoints
if (Deno.env.get("DENO_ENV") !== "production") {
  app.get("/dev/trpc", (c) => {
    return c.html(
      renderTrpcPanel(appRouter, { url: "/api/trpc" }),
    );
  });
}

// In production, serve the built client assets
if (Deno.env.get("DENO_ENV") === "production") {
  app.use("/*", serveStatic({ root: "../client/dist" }));
  app.get("/*", serveStatic({ root: "../client/dist", path: "index.html" }));
}

if (import.meta.main) {
  const isProduction = Deno.env.get("DENO_ENV") === "production";

  Deno.serve({
    port: 3000,
    onListen: ({ hostname, port }) => {
      if (isProduction) {
        console.log(`Listening on http://${hostname}:${port}/`);
      } else {
        console.log(`API server running on http://${hostname}:${port}/`);
        console.log(
          `Open http://localhost:5173/ in your browser to use the app.`,
        );
        console.log(
          `tRPC Panel available at http://${hostname}:${port}/dev/trpc`,
        );
      }
    },
  }, app.fetch);
}
