import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env.ts";

export function loggerMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const start = Date.now();

    await next();

    const log = c.get("log");
    const status = c.res.status;
    const responseTime = Date.now() - start;
    const method = c.req.method;
    const path = c.req.path;

    const data = { method, path, status, responseTime };
    const msg = `${method} ${path}`;

    if (status >= 500) {
      log.error(data, msg);
    } else if (status >= 400) {
      log.warn(data, msg);
    } else {
      log.info(data, msg);
    }
  };
}
