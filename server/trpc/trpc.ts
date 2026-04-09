import { initTRPC, TRPCError } from "@trpc/server";
import { logger } from "../logger.ts";
import type { Context } from "./context.ts";

const log = logger.child({ module: "trpc" });

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const procedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    log.debug("unauthorized request — no session or user");
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  log.debug({ userId: ctx.user.id }, "authenticated procedure call");
  return next({
    ctx: { ...ctx, session: ctx.session, user: ctx.user },
  });
});
