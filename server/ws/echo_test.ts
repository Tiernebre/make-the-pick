import { assertEquals } from "jsr:@std/assert";
import { app } from "../main.ts";

Deno.test({
  name: "WebSocket /ws/echo echoes messages back with prefix",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const server = Deno.serve({ port: 0, onListen: () => {} }, app.fetch);
    const { port } = server.addr;

    const ws = new WebSocket(`ws://localhost:${port}/ws/echo`);

    const message = await new Promise<string>((resolve, reject) => {
      ws.onopen = () => {
        ws.send("hello");
      };
      ws.onmessage = (event) => {
        resolve(event.data);
      };
      ws.onerror = (event) => {
        reject(event);
      };
    });

    assertEquals(message, "echo: hello");

    ws.close();
    await server.shutdown();
  },
});
