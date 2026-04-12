import { expect, test } from "../fixtures/auth.ts";
import { seedDraftInProgress } from "../helpers/seed-draft.ts";

test.describe("Draft room — two-player snake draft", () => {
  test("player 1 picks, turn advances to player 2, player 2 picks", async ({ authenticatedPage: p1, authenticatedPage2: p2 }) => {
    const seeded = await seedDraftInProgress();
    const draftUrl = `/leagues/${seeded.leagueId}/draft`;

    // Both players navigate to the draft room.
    await p1.goto(draftUrl);
    await p2.goto(draftUrl);

    // Draft is at pick 1 of 6 (3 rounds × 2 players).
    await expect(p1.getByText("Pick 1 of 6")).toBeVisible();

    // Player 1 sees Draft buttons; player 2 sees waiting message.
    await expect(
      p1.getByRole("button", { name: /^Draft Bulbasaur$/i }),
    ).toBeVisible();
    await expect(p2.getByText("Waiting for your turn")).toBeVisible();

    // Player 1 drafts Bulbasaur.
    await p1.getByRole("button", { name: /^Draft Bulbasaur$/i }).click();
    await p1
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm" })
      .click();

    // After pick, the SSE event triggers a state refetch. Wait for the
    // turn to flip — player 1 should see "Waiting" and pick counter update.
    await expect(p1.getByText("Pick 2 of 6")).toBeVisible({ timeout: 10000 });
    await expect(p1.getByText("Waiting for your turn")).toBeVisible({
      timeout: 10000,
    });

    // Player 2 receives the turn change via SSE and can now draft.
    await expect(
      p2.getByRole("button", { name: /^Draft Charmander$/i }),
    ).toBeVisible({ timeout: 10000 });

    // Player 2 drafts Charmander.
    await p2.getByRole("button", { name: /^Draft Charmander$/i }).click();
    await p2
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm" })
      .click();

    // Snake draft: pick 2 is round 1 (odd), so order reverses — player 2
    // stays on the clock for pick 3.
    await expect(p2.getByText("Pick 3 of 6")).toBeVisible({ timeout: 10000 });
    await expect(
      p2.getByRole("button", { name: /^Draft /i }).first(),
    ).toBeVisible();
  });
});
