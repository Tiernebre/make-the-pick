import { assertEquals, assertExists } from "@std/assert";
import { Hono } from "hono";
import pino from "pino";
import type { AppEnv } from "../env.ts";
import { loggerMiddleware } from "./logger.ts";
import { requestContextMiddleware } from "./request-context.ts";

function createTestLogger() {
  const entries: Record<string, unknown>[] = [];
  const stream = {
    write(msg: string) {
      entries.push(JSON.parse(msg));
    },
  };
  const log = pino({ level: "debug" }, stream as pino.DestinationStream);
  return { log, entries };
}

function createTestApp(log: pino.Logger) {
  const app = new Hono<AppEnv>();
  app.use(requestContextMiddleware(log));
  app.use(loggerMiddleware());
  app.get("/test", (c) => c.json({ ok: true }));
  app.post("/test", (c) => c.json({ created: true }, 201));
  return app;
}

Deno.test("loggerMiddleware logs method, path, status, and response time", async () => {
  const { log, entries } = createTestLogger();
  const app = createTestApp(log);

  await app.request("/test");

  assertEquals(entries.length, 1);
  const entry = entries[0];
  assertEquals(entry.method, "GET");
  assertEquals(entry.path, "/test");
  assertEquals(entry.status, 200);
  assertEquals(typeof entry.responseTime, "number");
  assertEquals(entry.msg, "GET /test");
});

Deno.test("loggerMiddleware logs correct status for non-200 responses", async () => {
  const { log, entries } = createTestLogger();
  const app = createTestApp(log);

  await app.request("/test", { method: "POST" });

  assertEquals(entries.length, 1);
  assertEquals(entries[0].status, 201);
  assertEquals(entries[0].method, "POST");
});

Deno.test("loggerMiddleware logs at warn level for 4xx responses", async () => {
  const { log, entries } = createTestLogger();
  const app = new Hono<AppEnv>();
  app.use(requestContextMiddleware(log));
  app.use(loggerMiddleware());
  app.get("/missing", (c) => c.json({ error: "not found" }, 404));

  await app.request("/missing");

  assertEquals(entries.length, 1);
  assertEquals(entries[0].level, 40); // pino warn level
});

Deno.test("loggerMiddleware logs at error level for 5xx responses", async () => {
  const { log, entries } = createTestLogger();
  const app = new Hono<AppEnv>();
  app.use(requestContextMiddleware(log));
  app.use(loggerMiddleware());
  app.get("/fail", (c) => c.json({ error: "server error" }, 500));

  await app.request("/fail");

  assertEquals(entries.length, 1);
  assertEquals(entries[0].level, 50); // pino error level
});

Deno.test("loggerMiddleware uses debug level for successful responses", async () => {
  const { log, entries } = createTestLogger();
  const app = createTestApp(log);

  await app.request("/test");

  assertEquals(entries[0].level, 20); // pino debug level
});

Deno.test("loggerMiddleware includes requestId from context", async () => {
  const { log, entries } = createTestLogger();
  const app = createTestApp(log);

  await app.request("/test");

  assertEquals(entries.length, 1);
  assertExists(entries[0].requestId);
  assertEquals(typeof entries[0].requestId, "string");
});
