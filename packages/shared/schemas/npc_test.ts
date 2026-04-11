import { assertEquals } from "@std/assert";
import { parseNpcStrategy } from "./npc.ts";

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
