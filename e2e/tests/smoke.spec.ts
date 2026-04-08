import { expect, test } from "../fixtures/auth.ts";
import { closeDatabase, resetDatabase } from "../helpers/db.ts";

test.describe("Smoke tests", () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  test.afterAll(async () => {
    await closeDatabase();
  });

  test("health endpoint returns ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page shows sign in button", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Sign in with Google" }),
    ).toBeVisible();
  });

  test("authenticated user sees the home page", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Make The Pick" }),
    ).toBeVisible();
  });
});
