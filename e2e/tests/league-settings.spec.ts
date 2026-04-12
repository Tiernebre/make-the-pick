import { expect, test } from "../fixtures/auth.ts";
import { closeDatabase } from "../helpers/db.ts";

test.describe("League settings", () => {
  test.afterAll(async () => {
    await closeDatabase();
  });

  test("commissioner edits settings and the rules card reflects the change", async ({ authenticatedPage: page }) => {
    const leagueName = `Settings League ${Date.now()}`;

    await page.goto("/leagues/new");
    await page.getByLabel("League Name").fill(leagueName);
    await page.getByLabel("Number of Rounds").fill("6");
    await page.getByLabel("Max Players").fill("4");
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page).toHaveURL(/\/leagues\/[0-9a-f-]+$/);

    // The rules card starts with no exclusions selected.
    await expect(page.getByText("Exclusions")).toBeVisible();
    await expect(page.getByText("None", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: /configure/i }).click();
    await expect(page).toHaveURL(/\/leagues\/[0-9a-f-]+\/settings$/);
    await expect(page.getByRole("heading", { name: "League Settings" }))
      .toBeVisible();

    // Verify persisted state round-trips into the settings form.
    await expect(page.getByLabel("Number of Rounds")).toHaveValue("6");
    await expect(page.getByLabel("Max Players")).toHaveValue("4");

    // Toggle a setting that shows up uniquely in the rules card.
    // Mantine Switch has a CSS thumb animation that prevents Playwright's
    // actionability "stable" check from passing, so we force the click.
    await page
      .getByRole("switch", { name: /Exclude Legendaries/ })
      .click({ force: true });

    // Wait for auto-save to settle before navigating away.
    await expect(page.getByText("Saving...")).toHaveCount(0, { timeout: 5000 });

    await page.getByRole("link", { name: /back to league/i }).click();
    await expect(page).toHaveURL(/\/leagues\/[0-9a-f-]+$/);

    // Rules card now reflects the exclusion.
    await expect(page.getByText("Legendaries", { exact: true })).toBeVisible();
    await expect(page.getByText("None", { exact: true })).toHaveCount(0);
  });
});
