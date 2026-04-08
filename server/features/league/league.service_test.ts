import { assertEquals, assertRejects } from "@std/assert";
import { TRPCError } from "@trpc/server";
import { createLeagueService } from "./league.service.ts";
import type { LeagueRepository } from "./league.repository.ts";

type FakeLeague = Awaited<ReturnType<LeagueRepository["findById"]>>;
type FakePlayer = Awaited<ReturnType<LeagueRepository["findPlayer"]>>;

function createFakeLeague(
  overrides: Partial<NonNullable<FakeLeague>> = {},
): NonNullable<FakeLeague> {
  return {
    id: crypto.randomUUID(),
    name: "Test League",
    status: "setup",
    rulesConfig: null,
    inviteCode: "ABCD1234",
    createdBy: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createFakeRepo(
  overrides: Partial<LeagueRepository> = {},
): LeagueRepository {
  return {
    createWithCreator: (_userId, _data) => Promise.resolve(createFakeLeague()),
    findById: (_id) => Promise.resolve(null as FakeLeague),
    findByInviteCode: (_code) => Promise.resolve(null as FakeLeague),
    findAllByUserId: (_userId) => Promise.resolve([]),
    addPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: _leagueId,
        userId: _userId,
        role: "member" as const,
        joinedAt: new Date(),
      }),
    findPlayer: (_leagueId, _userId) => Promise.resolve(null as FakePlayer),
    ...overrides,
  };
}

Deno.test("leagueService.create: creates a league with generated invite code", async () => {
  let capturedData: { name: string; inviteCode: string } | undefined;
  const repo = createFakeRepo({
    createWithCreator: (_userId, data) => {
      capturedData = data as { name: string; inviteCode: string };
      return Promise.resolve(
        createFakeLeague({ name: data.name, inviteCode: data.inviteCode }),
      );
    },
  });

  const service = createLeagueService({ leagueRepo: repo });
  const result = await service.create("user-1", { name: "My League" });

  assertEquals(result.name, "My League");
  assertEquals(capturedData?.inviteCode.length, 8);
  assertEquals(/^[A-Z2-9]+$/.test(capturedData!.inviteCode), true);
});

Deno.test("leagueService.getById: returns league when found", async () => {
  const fakeLeague = createFakeLeague({ name: "Found League" });
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
  });

  const service = createLeagueService({ leagueRepo: repo });
  const result = await service.getById(fakeLeague.id);
  assertEquals(result.name, "Found League");
});

Deno.test("leagueService.getById: throws NOT_FOUND when missing", async () => {
  const repo = createFakeRepo();
  const service = createLeagueService({ leagueRepo: repo });

  const error = await assertRejects(
    () => service.getById("nonexistent"),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("leagueService.join: joins a league via invite code", async () => {
  const fakeLeague = createFakeLeague({ inviteCode: "JOIN1234" });
  const repo = createFakeRepo({
    findByInviteCode: (_code) => Promise.resolve(fakeLeague),
  });

  const service = createLeagueService({ leagueRepo: repo });
  const result = await service.join("user-2", "JOIN1234");
  assertEquals(result.id, fakeLeague.id);
});

Deno.test("leagueService.join: throws NOT_FOUND for invalid invite code", async () => {
  const repo = createFakeRepo();
  const service = createLeagueService({ leagueRepo: repo });

  const error = await assertRejects(
    () => service.join("user-1", "BADCODE1"),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("leagueService.join: throws BAD_REQUEST if already a member", async () => {
  const fakeLeague = createFakeLeague();
  const repo = createFakeRepo({
    findByInviteCode: (_code) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "creator" as const,
        joinedAt: new Date(),
      }),
  });

  const service = createLeagueService({ leagueRepo: repo });

  const error = await assertRejects(
    () => service.join("user-1", fakeLeague.inviteCode),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});
