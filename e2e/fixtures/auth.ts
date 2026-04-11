import { createHmac } from "node:crypto";
import { type Page, test as base } from "@playwright/test";
import { resetDatabase, seedTestUser } from "../helpers/db.ts";
import { SESSION_COOKIE_NAME } from "../helpers/seed-data.ts";

type AuthFixtures = {
  authenticatedPage: Page;
};

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ??
  "e2e-test-secret-not-real";

/**
 * Better Auth (via better-call) stores the session cookie as
 * `encodeURIComponent("{token}.{base64(HMAC-SHA256(secret, token))}")`.
 * The fixture must produce a value that passes signature verification or
 * the server silently drops the cookie and redirects to /login.
 */
function signSessionCookie(token: string, secret: string): string {
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  return encodeURIComponent(`${token}.${signature}`);
}

/**
 * Extended test fixture that provides an `authenticatedPage` with a
 * pre-seeded user session. The session cookie is injected directly
 * into the browser context, bypassing the Google OAuth flow.
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser, baseURL }, use) => {
    await resetDatabase();
    const { sessionToken } = await seedTestUser();
    const signedCookie = signSessionCookie(sessionToken, BETTER_AUTH_SECRET);

    const context = await browser.newContext({
      baseURL,
      storageState: {
        cookies: [
          {
            name: SESSION_COOKIE_NAME,
            value: signedCookie,
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
