import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        configure: (proxy) => {
          proxy.on("error", (err, _req, res) => {
            if (
              err.message.includes("abort") || err.message.includes("cancel")
            ) return;
            if (res && "writeHead" in res) {
              res.writeHead(502);
              res.end("Proxy error");
            }
          });
        },
      },
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
});
