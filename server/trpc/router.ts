import { healthResponseSchema } from "@make-the-pick/shared";
import { healthChecks } from "../db/mod.ts";
import { procedure, router } from "./trpc.ts";

const healthRouter = router({
  check: procedure.output(healthResponseSchema).query(async ({ ctx }) => {
    const [check] = await ctx.db.insert(healthChecks).values({}).returning();
    return {
      status: "ok",
      timestamp: check.checkedAt.toISOString(),
    };
  }),
});

export const appRouter = router({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
