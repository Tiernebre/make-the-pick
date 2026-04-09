import { protectedProcedure, router } from "../../trpc/trpc.ts";
import type { UserService } from "./user.service.ts";

export function createUserRouter(userService: UserService) {
  return router({
    deleteAccount: protectedProcedure
      .mutation(({ ctx }) => {
        return userService.deleteAccount(ctx.user.id);
      }),
  });
}
