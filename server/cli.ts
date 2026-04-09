import { createCli } from "trpc-cli";
import { eq } from "drizzle-orm";
import { db, user } from "./db/mod.ts";
import { appRouter } from "./trpc/router.ts";

const email = Deno.env.get("TRPC_CLI_USER_EMAIL");
if (!email) {
  console.error(
    "TRPC_CLI_USER_EMAIL environment variable is required.\n" +
      "Set it to the email of a user in your database to authenticate CLI calls.",
  );
  Deno.exit(1);
}

const [dbUser] = await db.select().from(user).where(eq(user.email, email));
if (!dbUser) {
  console.error(`No user found with email: ${email}`);
  Deno.exit(1);
}

const cli = createCli({
  router: appRouter,
  context: {
    db,
    session: {
      id: "cli-session",
      expiresAt: new Date(Date.now() + 86400000),
      token: "cli-token",
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: "trpc-cli",
      userId: dbUser.id,
    },
    user: dbUser,
  },
});

cli.run();
