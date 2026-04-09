import { upgradeWebSocket } from "hono/deno";
import type { Hono } from "hono";
import { logger } from "../logger.ts";

const log = logger.child({ module: "ws.echo" });

export function registerEchoWebSocket(app: Hono) {
  app.get(
    "/ws/echo",
    upgradeWebSocket(() => ({
      onOpen(_event, _ws) {
        log.debug("echo websocket opened");
      },
      onMessage(event, ws) {
        log.debug({ data: event.data }, "echo websocket message received");
        ws.send(`echo: ${event.data}`);
      },
      onClose() {
        log.debug("echo websocket closed");
      },
    })),
  );
}
