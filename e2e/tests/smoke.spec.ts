import { expect, test } from "../fixtures/auth.ts";
import { resetDatabase } from "../helpers/db.ts";

test.describe("Smoke tests", () => {
  test.beforeAll(async () => {
    await resetDatabase();
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

  test("authenticated user lands on the leagues list", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/");
    await expect(authenticatedPage).toHaveURL(/\/leagues$/);
    await expect(
      authenticatedPage.getByRole("heading", { name: "My Leagues" }),
    ).toBeVisible();
  });
});
