import { logger } from "../../logger.ts";
import type { UserRepository } from "./user.repository.ts";

const log = logger.child({ module: "user.service" });

export function createUserService(
  deps: { userRepo: UserRepository },
) {
  return {
    async deleteAccount(userId: string): Promise<void> {
      log.info({ userId }, "deleting user account");
      await deps.userRepo.deleteById(userId);
      log.info({ userId }, "user account deleted");
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
