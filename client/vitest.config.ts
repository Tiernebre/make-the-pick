import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The shared workspace package is a Deno workspace member and not
      // installed under node_modules. Alias it to its entry file so vite
      // (and vitest) can resolve runtime imports of Zod schemas.
      "@make-the-pick/shared": path.resolve(
        __dirname,
        "../packages/shared/mod.ts",
      ),
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
