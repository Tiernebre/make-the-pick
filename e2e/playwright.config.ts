import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

const DATABASE_URL_E2E = process.env.DATABASE_URL_E2E ??
  "postgres://make_the_pick:make_the_pick@localhost:5432/make_the_pick_e2e";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? "github" : "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "cd .. && deno task build && DENO_ENV=production deno task start",
    port: 3000,
    reuseExistingServer: !isCI,
    timeout: 60_000,
    env: {
      DENO_ENV: "production",
      DATABASE_URL: DATABASE_URL_E2E,
      BETTER_AUTH_SECRET: "e2e-test-secret-not-real",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
      GOOGLE_CLIENT_ID: "fake-e2e-client-id",
      GOOGLE_CLIENT_SECRET: "fake-e2e-client-secret",
    },
  },
});
