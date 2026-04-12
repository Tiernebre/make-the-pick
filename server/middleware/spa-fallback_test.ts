import { assertEquals } from "@std/assert";
import { looksLikeSpaRoute } from "./spa-fallback.ts";

Deno.test("looksLikeSpaRoute: treats extensionless paths as SPA routes", () => {
  assertEquals(looksLikeSpaRoute("/"), true);
  assertEquals(looksLikeSpaRoute("/leagues"), true);
  assertEquals(looksLikeSpaRoute("/league/abc123"), true);
  assertEquals(looksLikeSpaRoute("/draft/abc/room"), true);
});

Deno.test("looksLikeSpaRoute: rejects file-shaped paths", () => {
  assertEquals(looksLikeSpaRoute("/wp-login.php"), false);
  assertEquals(looksLikeSpaRoute("/assets/main.js"), false);
  assertEquals(looksLikeSpaRoute("/favicon.ico"), false);
  assertEquals(looksLikeSpaRoute("/robots.txt"), false);
});

Deno.test("looksLikeSpaRoute: rejects dotfile probes", () => {
  assertEquals(looksLikeSpaRoute("/.git/config"), false);
  assertEquals(looksLikeSpaRoute("/.env"), false);
  assertEquals(looksLikeSpaRoute("/.env.production"), false);
  assertEquals(looksLikeSpaRoute("/foo/.git/config"), false);
  assertEquals(looksLikeSpaRoute("/nested/.env"), false);
});
