import { assertEquals } from "@std/assert";
import { createUserService } from "./user.service.ts";
import type { UserRepository } from "./user.repository.ts";

function createFakeRepo(
  overrides: Partial<UserRepository> = {},
): UserRepository {
  return {
    deleteById: (_id) => Promise.resolve(),
    ...overrides,
  };
}

Deno.test("userService.deleteAccount: deletes the user by their id", async () => {
  let deletedId: string | undefined;
  const repo = createFakeRepo({
    deleteById: (id) => {
      deletedId = id;
      return Promise.resolve();
    },
  });

  const service = createUserService({ userRepo: repo });
  await service.deleteAccount("user-123");
  assertEquals(deletedId, "user-123");
});
