import { healthResponseSchema } from "@make-the-pick/shared";
import { db, healthChecks } from "../db/mod.ts";
import { createFeatureRouters } from "../features/mod.ts";
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

const { leagueRouter } = createFeatureRouters(db);

export const appRouter = router({
  health: healthRouter,
  league: leagueRouter,
});

export type AppRouter = typeof appRouter;
