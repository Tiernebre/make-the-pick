import { auth } from "../auth/mod.ts";
import { db } from "../db/mod.ts";

export async function createContext(req: Request) {
  const sessionData = await auth.api.getSession({
    headers: req.headers,
  });

  return {
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
