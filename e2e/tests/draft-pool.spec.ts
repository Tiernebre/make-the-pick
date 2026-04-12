import { expect, test } from "../fixtures/auth.ts";
import { closeDatabase } from "../helpers/db.ts";
import {
  type SeededLeagueWithPool,
  seedLeagueWithPool,
} from "../helpers/seed-league-with-pool.ts";

let seeded: SeededLeagueWithPool;

test.describe("Draft pool — watchlist & notes", () => {
  test.beforeAll(async () => {
    seeded = await seedLeagueWithPool();
  });

  test.afterAll(async () => {
    await closeDatabase();
  });

  test("toggle watchlist star and verify count updates", async ({ authenticatedPage: page }) => {
    await page.goto(`/leagues/${seeded.leagueId}/draft/pool`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Draft Pool",
    );

    const watchlistButton = page.getByRole("button", {
      name: /watchlist/i,
    });
    await expect(watchlistButton).toContainText("0");

    // Click the star (first button) in the Bulbasaur row.
    const bulbasaurRow = page.locator("tr", { hasText: "Bulbasaur" });
    await bulbasaurRow.locator("button").first().click();
    await expect(watchlistButton).toContainText("1");

    // Add Pikachu too.
    const pikachuRow = page.locator("tr", { hasText: "Pikachu" });
    await pikachuRow.locator("button").first().click();
    await expect(watchlistButton).toContainText("2");

    // Open the watchlist panel and verify both names appear.
    await watchlistButton.click();
    const dropdown = page.locator("[class*='popover']").last();
    await expect(dropdown.getByText("Bulbasaur")).toBeVisible();
    await expect(dropdown.getByText("Pikachu")).toBeVisible();

    // Remove Bulbasaur by clicking the star again.
    await page.keyboard.press("Escape");
    await bulbasaurRow.locator("button").first().click();
    await expect(watchlistButton).toContainText("1");
  });

  test("add, edit, and delete a note on a pool item", async ({ authenticatedPage: page }) => {
    await page.goto(`/leagues/${seeded.leagueId}/draft/pool`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Draft Pool",
    );

    // Click the note icon (second button) in the Squirtle row.
    const squirtleRow = page.locator("tr", { hasText: "Squirtle" });
    await squirtleRow.locator("button").nth(1).click();

    const textarea = page.getByPlaceholder("Add a note...");
    await expect(textarea).toBeVisible();
    await textarea.fill("Solid defensive pick");
    await textarea.blur();

    // Note icon should turn blue (color attribute on the ActionIcon).
    // Wait for save to round-trip, then reopen to verify content persisted.
    await squirtleRow.locator("button").nth(1).click();
    await expect(textarea).toHaveValue("Solid defensive pick");

    // Edit the note.
    await textarea.fill("Best water starter");
    await textarea.blur();

    await squirtleRow.locator("button").nth(1).click();
    await expect(textarea).toHaveValue("Best water starter");

    // Delete the note by clearing the textarea.
    await textarea.fill("");
    await textarea.blur();

    // Reopen — textarea should be empty after delete.
    await squirtleRow.locator("button").nth(1).click();
    await expect(textarea).toHaveValue("");
  });
});
