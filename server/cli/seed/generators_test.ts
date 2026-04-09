import { assertEquals, assertNotEquals } from "@std/assert";
import {
  generateFakeLeague,
  generateFakeUser,
  generateFakeUsers,
} from "./generators.ts";

Deno.test("generateFakeUser", async (t) => {
  await t.step("returns a user with all required fields", () => {
    const user = generateFakeUser();
    assertEquals(typeof user.id, "string");
    assertEquals(typeof user.name, "string");
    assertEquals(typeof user.email, "string");
    assertEquals(user.emailVerified, true);
    assertEquals(user.image, null);
    assertEquals(user.createdAt instanceof Date, true);
    assertEquals(user.updatedAt instanceof Date, true);
  });

  await t.step("generates unique ids across calls", () => {
    const a = generateFakeUser();
    const b = generateFakeUser();
    assertNotEquals(a.id, b.id);
    assertNotEquals(a.email, b.email);
  });

  await t.step("generates a name with first and last name", () => {
    const user = generateFakeUser();
    const parts = user.name.split(" ");
    assertEquals(
      parts.length >= 2,
      true,
      `Expected two-part name, got: ${user.name}`,
    );
  });

  await t.step("generates an email ending in @fake.local", () => {
    const user = generateFakeUser();
    assertEquals(user.email.endsWith("@fake.local"), true);
  });
});

Deno.test("generateFakeUsers", async (t) => {
  await t.step("returns the requested number of users", () => {
    const users = generateFakeUsers(5);
    assertEquals(users.length, 5);
  });

  await t.step("all users have unique ids and emails", () => {
    const users = generateFakeUsers(10);
    const ids = new Set(users.map((u) => u.id));
    const emails = new Set(users.map((u) => u.email));
    assertEquals(ids.size, 10);
    assertEquals(emails.size, 10);
  });
});

Deno.test("generateFakeLeague", async (t) => {
  await t.step("returns a league with all required fields", () => {
    const league = generateFakeLeague("creator-id");
    assertEquals(typeof league.id, "string");
    assertEquals(typeof league.name, "string");
    assertEquals(league.status, "setup");
    assertEquals(league.sportType, "pokemon");
    assertEquals(typeof league.inviteCode, "string");
    assertEquals(league.createdBy, "creator-id");
    assertEquals(league.maxPlayers >= 4, true);
    assertEquals(league.maxPlayers <= 12, true);
    assertEquals(league.createdAt instanceof Date, true);
    assertEquals(league.updatedAt instanceof Date, true);
  });

  await t.step("generates unique invite codes across calls", () => {
    const a = generateFakeLeague("x");
    const b = generateFakeLeague("x");
    assertNotEquals(a.inviteCode, b.inviteCode);
  });

  await t.step(
    "includes a rulesConfig with draftFormat and numberOfRounds",
    () => {
      const league = generateFakeLeague("x");
      const config = league.rulesConfig as {
        draftFormat: string;
        numberOfRounds: number;
        pickTimeLimitSeconds: number | null;
      };
      assertEquals(
        config.draftFormat === "snake" || config.draftFormat === "linear",
        true,
      );
      assertEquals(typeof config.numberOfRounds, "number");
    },
  );
});
