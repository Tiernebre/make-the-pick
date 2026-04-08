import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
