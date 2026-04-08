import { type Page, test as base } from "@playwright/test";
import { closeDatabase, resetDatabase, seedTestUser } from "../helpers/db.ts";
import { SESSION_COOKIE_NAME } from "../helpers/seed-data.ts";

type AuthFixtures = {
  authenticatedPage: Page;
};

/**
 * Extended test fixture that provides an `authenticatedPage` with a
 * pre-seeded user session. The session cookie is injected directly
 * into the browser context, bypassing the Google OAuth flow.
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser, baseURL }, use) => {
    await resetDatabase();
    const { sessionToken } = await seedTestUser();

    const context = await browser.newContext({
      baseURL,
      storageState: {
        cookies: [
          {
            name: SESSION_COOKIE_NAME,
            value: sessionToken,
            domain: "localhost",
            path: "/",
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            expires: Math.floor(new Date("2099-01-01").getTime() / 1000),
          },
        ],
        origins: [],
      },
    });

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
