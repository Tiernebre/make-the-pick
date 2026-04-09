import { createCli } from "trpc-cli";
import { eq } from "drizzle-orm";
import { db, user } from "../db/mod.ts";
import { appRouter } from "../trpc/router.ts";
import { CLI_USER_EMAIL } from "./seed/mod.ts";

export async function runTrpcCommand() {
  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, CLI_USER_EMAIL));
  if (!dbUser) {
    console.error(
      `CLI user not found (${CLI_USER_EMAIL}). Run \`deno task cli seed data\` first.`,
    );
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
}
