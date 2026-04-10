import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/mod.ts";
import * as schema from "../db/schema.ts";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    google: {
      clientId: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      errorCallbackURL: "/login?error=oauth",
    },
  },
  secret: Deno.env.get("BETTER_AUTH_SECRET"),
  baseURL: Deno.env.get("BETTER_AUTH_URL") ?? "http://localhost:3000",
  trustedOrigins: Deno.env.get("BETTER_AUTH_TRUSTED_ORIGINS")?.split(",") ?? [],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
