import { auth } from "../auth/mod.ts";
import { db } from "../db/mod.ts";
import { logger } from "../logger.ts";

const log = logger.child({ module: "trpc.context" });

export async function createContext(req: Request) {
  const sessionData = await auth.api.getSession({
    headers: req.headers,
  });

  log.debug(
    {
      userId: sessionData?.user?.id ?? null,
      hasSession: !!sessionData?.session,
    },
    "trpc context created",
  );

  return {
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
