import type pino from "pino";
import { auth } from "../auth/mod.ts";
import { db } from "../db/mod.ts";
import { logger } from "../logger.ts";

const fallbackLog = logger.child({ module: "trpc.context" });

export async function createContext(
  req: Request,
  requestLog?: pino.Logger,
) {
  const log = requestLog ?? fallbackLog;

  const sessionData = await auth.api.getSession({
    headers: req.headers,
  });

  const userId = sessionData?.user?.id ?? null;
  const contextLog = userId ? log.child({ userId }) : log;

  contextLog.debug(
    { hasSession: !!sessionData?.session },
    "trpc context created",
  );

  return {
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
    log: contextLog,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
