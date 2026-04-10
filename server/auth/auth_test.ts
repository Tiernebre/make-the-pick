import { assertEquals } from "@std/assert";
import { auth } from "./auth.ts";

Deno.test("google social provider redirects cancelled sign-in to /login?error=oauth", () => {
  const google = auth.options.socialProviders?.google as
    | { errorCallbackURL?: string }
    | undefined;

  assertEquals(google?.errorCallbackURL, "/login?error=oauth");
});
