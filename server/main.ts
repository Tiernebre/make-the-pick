import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { HealthResponse } from "@make-the-pick/shared";
import { db, healthChecks } from "./db/mod.ts";
import { appRouter } from "./trpc/router.ts";
import { createContext } from "./trpc/context.ts";
import { registerEchoWebSocket } from "./ws/echo.ts";
import { auth } from "./auth/mod.ts";
import { renderTrpcPanel } from "trpc-ui";

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
  app.get("/dev/trpc/ui", (c) => {
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
        const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
        const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
        const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
        const magenta = (s: string) => `\x1b[35m${s}\x1b[0m`;
        const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
        const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

        const divider = dim("─".repeat(48));
        const apiUrl = `http://${hostname}:${port}/`;
        const appUrl = "http://localhost:5173/";
        const trpcUrl = `http://${hostname}:${port}/dev/trpc/ui`;

        console.log();
        console.log(divider);
        console.log(bold(yellow("  🏈  Make the Pick — Dev Server")));
        console.log(divider);
        console.log();
        console.log(`  ${green("▸")} ${bold("App:")}        ${cyan(appUrl)}`);
        console.log(`  ${green("▸")} ${bold("API:")}        ${cyan(apiUrl)}`);
        console.log(
          `  ${green("▸")} ${bold("tRPC Panel:")} ${magenta(trpcUrl)}`,
        );
        console.log();
        console.log(divider);
        console.log();
      }
    },
  }, app.fetch);
}
