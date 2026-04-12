import { assertEquals, assertExists } from "@std/assert";
import { Hono } from "hono";
import pino from "pino";
import type { AppEnv } from "../env.ts";
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

Deno.test("requestContextMiddleware sets a requestId on the context", async () => {
  const { log } = createTestLogger();
  const app = new Hono<AppEnv>();
  app.use(requestContextMiddleware(log));

  let capturedRequestId: string | undefined;
  app.get("/test", (c) => {
    capturedRequestId = c.get("requestId");
    return c.json({ ok: true });
  });

  await app.request("/test");
  assertExists(capturedRequestId);
  assertEquals(typeof capturedRequestId, "string");
  assertEquals(capturedRequestId!.length, 36);
});

Deno.test("requestContextMiddleware sets a child logger with requestId", async () => {
  const { log, entries } = createTestLogger();
  const app = new Hono<AppEnv>();
  app.use(requestContextMiddleware(log));

  app.get("/test", (c) => {
    const requestLog = c.get("log");
    requestLog.info("hello from handler");
    return c.json({ ok: true });
  });

  await app.request("/test");
  assertEquals(entries.length, 1);
  assertExists(entries[0].requestId);
  assertEquals(entries[0].msg, "hello from handler");
});

Deno.test("requestContextMiddleware generates unique requestIds per request", async () => {
  const { log } = createTestLogger();
  const app = new Hono<AppEnv>();
  app.use(requestContextMiddleware(log));

  const ids: string[] = [];
  app.get("/test", (c) => {
    ids.push(c.get("requestId"));
    return c.json({ ok: true });
  });

  await app.request("/test");
  await app.request("/test");

  assertEquals(ids.length, 2);
  assertEquals(ids[0] !== ids[1], true);
});

Deno.test("requestContextMiddleware uses incoming X-Request-Id header if present", async () => {
  const { log } = createTestLogger();
  const app = new Hono<AppEnv>();
  app.use(requestContextMiddleware(log));

  let capturedRequestId: string | undefined;
  app.get("/test", (c) => {
    capturedRequestId = c.get("requestId");
    return c.json({ ok: true });
  });

  await app.request("/test", {
    headers: { "X-Request-Id": "upstream-trace-123" },
  });

  assertEquals(capturedRequestId, "upstream-trace-123");
});
