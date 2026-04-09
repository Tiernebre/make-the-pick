import { createLogger, defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const logger = createLogger();
const originalInfo = logger.info.bind(logger);
logger.info = (msg, options) => {
  // Suppress Vite's default startup banner — our server prints its own
  if (
    msg.includes("Local") || msg.includes("Network") ||
    msg.includes("ready in") || msg.includes("VITE")
  ) {
    return;
  }
  originalInfo(msg, options);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        configure: (proxy) => {
          const originalEmit = proxy.emit.bind(proxy);
          proxy.emit = (event: string, ...args: unknown[]) => {
            if (
              event === "error" &&
              args[0] instanceof Error &&
              /abort|cancel/i.test(args[0].message)
            ) {
              return true;
            }
            return originalEmit(event, ...args);
          };
        },
      },
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
});
