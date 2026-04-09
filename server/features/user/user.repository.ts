import { eq } from "drizzle-orm";
import type { db } from "../../db/mod.ts";
import { user } from "../../db/mod.ts";
import { logger } from "../../logger.ts";

export type Database = typeof db;

const log = logger.child({ module: "user.repository" });

export function createUserRepository(db: Database) {
  return {
    async deleteById(id: string): Promise<void> {
      log.debug({ userId: id }, "deleting user");
      await db.delete(user).where(eq(user.id, id));
      log.debug({ userId: id }, "user deleted");
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
