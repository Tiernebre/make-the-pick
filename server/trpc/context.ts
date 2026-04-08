import { db } from "../db/mod.ts";

export function createContext() {
  return { db };
}

export type Context = ReturnType<typeof createContext>;
