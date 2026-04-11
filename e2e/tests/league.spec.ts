import { expect, test } from "../fixtures/auth.ts";
import { closeDatabase } from "../helpers/db.ts";

test.describe("League management", () => {
  test.afterAll(async () => {
    await closeDatabase();
  });

  test("commissioner creates a league, sees it in the list, and deletes it", async ({ authenticatedPage: page }) => {
    const leagueName = `Test League ${Date.now()}`;

    await page.goto("/leagues");
    await expect(page.getByRole("heading", { name: "My Leagues" }))
      .toBeVisible();

    await page.getByRole("link", { name: /create league/i }).click();
    await expect(page).toHaveURL(/\/leagues\/new/);

    await page.getByLabel("League Name").fill(leagueName);
    await page.getByLabel("Number of Rounds").fill("6");
    await page.getByLabel("Max Players").fill("4");
    await page.getByRole("button", { name: /^create$/i }).click();

    await expect(page).toHaveURL(/\/leagues\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: leagueName })).toBeVisible();

    await page.getByRole("link", { name: /back to leagues/i }).click();
    await expect(page).toHaveURL(/\/leagues$/);
    await expect(page.getByText(leagueName)).toBeVisible();

    await page.getByText(leagueName).click();
    await expect(page).toHaveURL(/\/leagues\/[0-9a-f-]+$/);

    await page.getByRole("button", { name: /delete league/i }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /delete/i })
      .click();

    await expect(page).toHaveURL(/\/leagues$/);
    await expect(page.getByText(leagueName)).not.toBeVisible();
  });

  test("create form rejects an empty name", async ({ authenticatedPage: page }) => {
    await page.goto("/leagues/new");
    await page.getByLabel("Number of Rounds").fill("6");
    await page.getByLabel("Max Players").fill("4");
    await page.getByRole("button", { name: /^create$/i }).click();

    await expect(page).toHaveURL(/\/leagues\/new$/);
  });
});
