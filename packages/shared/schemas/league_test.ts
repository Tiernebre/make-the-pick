import { assertEquals, assertThrows } from "@std/assert";
import { createLeagueSchema } from "./league.ts";

const validSettings = {
  name: "My League",
  sportType: "pokemon" as const,
  maxPlayers: 8,
  rulesConfig: {
    draftFormat: "snake" as const,
    numberOfRounds: 6,
    pickTimeLimitSeconds: 60,
    poolSizeMultiplier: 2,
  },
};

Deno.test("createLeagueSchema parses a league with full settings", () => {
  const result = createLeagueSchema.parse(validSettings);
  assertEquals(result.name, "My League");
  assertEquals(result.sportType, "pokemon");
  assertEquals(result.maxPlayers, 8);
  assertEquals(result.rulesConfig.draftFormat, "snake");
  assertEquals(result.rulesConfig.numberOfRounds, 6);
  assertEquals(result.rulesConfig.pickTimeLimitSeconds, 60);
});

Deno.test("createLeagueSchema allows null pickTimeLimitSeconds", () => {
  const result = createLeagueSchema.parse({
    ...validSettings,
    rulesConfig: { ...validSettings.rulesConfig, pickTimeLimitSeconds: null },
  });
  assertEquals(result.rulesConfig.pickTimeLimitSeconds, null);
});

Deno.test("createLeagueSchema rejects missing sportType", () => {
  assertThrows(() => {
    const { sportType: _sportType, ...rest } = validSettings;
    createLeagueSchema.parse(rest);
  });
});

Deno.test("createLeagueSchema rejects missing rulesConfig", () => {
  assertThrows(() => {
    const { rulesConfig: _rulesConfig, ...rest } = validSettings;
    createLeagueSchema.parse(rest);
  });
});

Deno.test("createLeagueSchema rejects maxPlayers below 2", () => {
  assertThrows(() => {
    createLeagueSchema.parse({ ...validSettings, maxPlayers: 1 });
  });
});

Deno.test("createLeagueSchema rejects empty name", () => {
  assertThrows(() => {
    createLeagueSchema.parse({ ...validSettings, name: "" });
  });
});
