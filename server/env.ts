import type pino from "pino";

/**
 * Hono environment type for request-scoped variables.
 * Passed as a generic to middleware and route handlers
 * so c.get()/c.set() are fully typed.
 */
export type AppEnv = {
  Variables: {
    requestId: string;
    log: pino.Logger;
  };
};
