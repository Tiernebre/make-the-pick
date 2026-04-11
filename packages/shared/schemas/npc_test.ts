import { assertEquals, assertNotEquals } from "@std/assert";
import { npcStrategyColor, parseNpcStrategy } from "./npc.ts";

Deno.test("parseNpcStrategy returns null for human users", () => {
  assertEquals(parseNpcStrategy(null), null);
});

Deno.test("parseNpcStrategy returns null for unknown kinds", () => {
  assertEquals(parseNpcStrategy("mystery"), null);
});

Deno.test("parseNpcStrategy parses balanced", () => {
  const info = parseNpcStrategy("balanced");
  assertEquals(info?.kind, "balanced");
  assertEquals(info?.preferredType, null);
  assertEquals(info?.label, "Balanced");
});

Deno.test("parseNpcStrategy parses best-available", () => {
  const info = parseNpcStrategy("best-available");
  assertEquals(info?.kind, "best-available");
  assertEquals(info?.label, "Best Available");
});

Deno.test("parseNpcStrategy parses type-specialist with preferred type", () => {
  const info = parseNpcStrategy("type-specialist:water");
  assertEquals(info?.kind, "type-specialist");
  assertEquals(info?.preferredType, "water");
  assertEquals(info?.label, "Water Specialist");
});

Deno.test("parseNpcStrategy parses regional with preferred generation", () => {
  const info = parseNpcStrategy("regional:generation-iii");
  assertEquals(info?.kind, "regional");
  assertEquals(info?.preferredGeneration, "generation-iii");
  assertEquals(info?.label, "Hoenn Native");
});

Deno.test("parseNpcStrategy parses chaos", () => {
  const info = parseNpcStrategy("chaos");
  assertEquals(info?.kind, "chaos");
  assertEquals(info?.label, "Chaos");
});

Deno.test("npcStrategyColor returns neutral gray for balanced", () => {
  const info = parseNpcStrategy("balanced")!;
  assertEquals(npcStrategyColor(info), "gray");
});

Deno.test("npcStrategyColor returns green for best-available", () => {
  const info = parseNpcStrategy("best-available")!;
  assertEquals(npcStrategyColor(info), "green");
});

Deno.test("npcStrategyColor returns orange for regional", () => {
  const info = parseNpcStrategy("regional:generation-iii")!;
  assertEquals(npcStrategyColor(info), "orange");
});

Deno.test("npcStrategyColor returns grape for chaos", () => {
  const info = parseNpcStrategy("chaos")!;
  assertEquals(npcStrategyColor(info), "grape");
});

Deno.test("npcStrategyColor maps type specialists to type-themed colors", () => {
  assertEquals(
    npcStrategyColor(parseNpcStrategy("type-specialist:electric")!),
    "yellow",
  );
  assertEquals(
    npcStrategyColor(parseNpcStrategy("type-specialist:water")!),
    "blue",
  );
  assertEquals(
    npcStrategyColor(parseNpcStrategy("type-specialist:fire")!),
    "red",
  );
  assertEquals(
    npcStrategyColor(parseNpcStrategy("type-specialist:grass")!),
    "lime",
  );
});

Deno.test("npcStrategyColor distinguishes grass specialist from best-available", () => {
  const grass = npcStrategyColor(parseNpcStrategy("type-specialist:grass")!);
  const best = npcStrategyColor(parseNpcStrategy("best-available")!);
  assertNotEquals(grass, best);
});

Deno.test("npcStrategyColor falls back to gray for unknown types", () => {
  const info = parseNpcStrategy("type-specialist:mystery")!;
  assertEquals(npcStrategyColor(info), "gray");
});
