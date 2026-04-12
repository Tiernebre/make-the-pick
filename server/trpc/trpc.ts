import { initTRPC, TRPCError } from "@trpc/server";
import { logger } from "../logger.ts";
import type { Context } from "./context.ts";

const fallbackLog = logger.child({ module: "trpc" });

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error, path, input, ctx }) {
    const log = ctx?.log ?? fallbackLog;
    log.error(
      { code: shape.code, path, input, cause: error.cause },
      "tRPC error: %s",
      shape.message,
    );
    return shape;
  },
});

export const router = t.router;
export const procedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    ctx.log.debug("unauthorized request — no session or user");
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  ctx.log.debug("authenticated procedure call");
  return next({
    ctx: { ...ctx, session: ctx.session, user: ctx.user },
  });
});
