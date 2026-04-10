import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Stub out react-remove-scroll in tests — Deno's npm module store
      // on Linux doesn't resolve the nested CJS require chain correctly,
      // and tests don't need scroll-lock behavior.
      "react-remove-scroll": new URL(
        "./src/test-stubs/react-remove-scroll.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
