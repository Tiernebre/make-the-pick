import { upgradeWebSocket } from "hono/deno";
import type { Hono } from "hono";

export function registerEchoWebSocket(app: Hono) {
  app.get(
    "/ws/echo",
    upgradeWebSocket(() => ({
      onMessage(event, ws) {
        ws.send(`echo: ${event.data}`);
      },
    })),
  );
}
