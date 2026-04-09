import { assertEquals, assertRejects } from "@std/assert";
import { TRPCError } from "@trpc/server";
import type { LeagueRepository } from "../league/league.repository.ts";
import type { PoolItemNoteRepository } from "./pool-item-note.repository.ts";
import { createPoolItemNoteService } from "./pool-item-note.service.ts";

type FakeLeague = Awaited<ReturnType<LeagueRepository["findById"]>>;
type FakePlayer = Awaited<ReturnType<LeagueRepository["findPlayer"]>>;
type FakePoolItemNote = Awaited<
  ReturnType<PoolItemNoteRepository["findByLeaguePlayerId"]>
>[number];

function createFakeLeague(
  overrides: Partial<NonNullable<FakeLeague>> = {},
): NonNullable<FakeLeague> {
  return {
    id: crypto.randomUUID(),
    name: "Test League",
    status: "setup",
    sportType: "pokemon",
    rulesConfig: null,
    maxPlayers: 4,
    inviteCode: "ABCD1234",
    createdBy: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMemberPlayer(
  leagueId: string,
  userId = "user-1",
): NonNullable<FakePlayer> {
  return {
    id: crypto.randomUUID(),
    leagueId,
    userId,
    role: "member" as const,
    joinedAt: new Date(),
  };
}

function createFakePoolItemNote(
  overrides: Partial<FakePoolItemNote> = {},
): FakePoolItemNote {
  return {
    id: crypto.randomUUID(),
    leaguePlayerId: crypto.randomUUID(),
    draftPoolItemId: crypto.randomUUID(),
    content: "Test note",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createFakeLeagueRepo(
  overrides: Partial<LeagueRepository> = {},
): LeagueRepository {
  return {
    createWithCommissioner: (_userId, _data) =>
      Promise.resolve(createFakeLeague()),
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
    findPlayersByLeagueId: (_leagueId) => Promise.resolve([]),
    deleteById: (_id) => Promise.resolve(),
    deletePlayer: (_leagueId, _userId) => Promise.resolve(),
    updateSettings: (_id, _data) => Promise.resolve(createFakeLeague()),
    updateStatus: (_id, _status) => Promise.resolve(createFakeLeague()),
    countPlayers: (_leagueId) => Promise.resolve(0),
    ...overrides,
  };
}

function createFakePoolItemNoteRepo(
  overrides: Partial<PoolItemNoteRepository> = {},
): PoolItemNoteRepository {
  return {
    findByLeaguePlayerId: (_leaguePlayerId) => Promise.resolve([]),
    upsert: (data) =>
      Promise.resolve(createFakePoolItemNote({
        leaguePlayerId: data.leaguePlayerId,
        draftPoolItemId: data.draftPoolItemId,
        content: data.content,
      })),
    deleteByLeaguePlayerIdAndDraftPoolItemId: (_lpId, _dpiId) =>
      Promise.resolve(),
    ...overrides,
  };
}

// --- list ---

Deno.test("poolItemNoteService.list: returns notes for a valid league member", async () => {
  const fakeLeague = createFakeLeague();
  const player = createMemberPlayer(fakeLeague.id);
  const notes = [
    createFakePoolItemNote({ leaguePlayerId: player.id }),
    createFakePoolItemNote({ leaguePlayerId: player.id }),
  ];

  const service = createPoolItemNoteService({
    poolItemNoteRepo: createFakePoolItemNoteRepo({
      findByLeaguePlayerId: (_id) => Promise.resolve(notes),
    }),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
      findPlayer: (_leagueId, _userId) => Promise.resolve(player),
    }),
  });

  const result = await service.list(player.userId, fakeLeague.id);
  assertEquals(result.length, 2);
});

Deno.test("poolItemNoteService.list: throws NOT_FOUND when league does not exist", async () => {
  const service = createPoolItemNoteService({
    poolItemNoteRepo: createFakePoolItemNoteRepo(),
    leagueRepo: createFakeLeagueRepo(),
  });

  const error = await assertRejects(
    () => service.list("user-1", "nonexistent"),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("poolItemNoteService.list: throws FORBIDDEN when user is not a member", async () => {
  const fakeLeague = createFakeLeague();

  const service = createPoolItemNoteService({
    poolItemNoteRepo: createFakePoolItemNoteRepo(),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
    }),
  });

  const error = await assertRejects(
    () => service.list("user-1", fakeLeague.id),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

// --- upsert ---

Deno.test("poolItemNoteService.upsert: creates or updates a note", async () => {
  const fakeLeague = createFakeLeague();
  const player = createMemberPlayer(fakeLeague.id);
  let capturedData:
    | { leaguePlayerId: string; draftPoolItemId: string; content: string }
    | undefined;

  const service = createPoolItemNoteService({
    poolItemNoteRepo: createFakePoolItemNoteRepo({
      upsert: (data) => {
        capturedData = data;
        return Promise.resolve(createFakePoolItemNote(data));
      },
    }),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
      findPlayer: (_leagueId, _userId) => Promise.resolve(player),
    }),
  });

  const draftPoolItemId = crypto.randomUUID();
  await service.upsert(player.userId, {
    leagueId: fakeLeague.id,
    draftPoolItemId,
    content: "Great sleeper pick",
  });

  assertEquals(capturedData?.leaguePlayerId, player.id);
  assertEquals(capturedData?.draftPoolItemId, draftPoolItemId);
  assertEquals(capturedData?.content, "Great sleeper pick");
});

Deno.test("poolItemNoteService.upsert: throws NOT_FOUND when league does not exist", async () => {
  const service = createPoolItemNoteService({
    poolItemNoteRepo: createFakePoolItemNoteRepo(),
    leagueRepo: createFakeLeagueRepo(),
  });

  const error = await assertRejects(
    () =>
      service.upsert("user-1", {
        leagueId: "nonexistent",
        draftPoolItemId: crypto.randomUUID(),
        content: "test",
      }),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("poolItemNoteService.upsert: throws FORBIDDEN when user is not a member", async () => {
  const fakeLeague = createFakeLeague();

  const service = createPoolItemNoteService({
    poolItemNoteRepo: createFakePoolItemNoteRepo(),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
    }),
  });

  const error = await assertRejects(
    () =>
      service.upsert("user-1", {
        leagueId: fakeLeague.id,
        draftPoolItemId: crypto.randomUUID(),
        content: "test",
      }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

// --- delete ---

Deno.test("poolItemNoteService.delete: deletes a note", async () => {
  const fakeLeague = createFakeLeague();
  const player = createMemberPlayer(fakeLeague.id);
  let deleteCalledWith:
    | { leaguePlayerId: string; draftPoolItemId: string }
    | undefined;

  const service = createPoolItemNoteService({
    poolItemNoteRepo: createFakePoolItemNoteRepo({
      deleteByLeaguePlayerIdAndDraftPoolItemId: (lpId, dpiId) => {
        deleteCalledWith = { leaguePlayerId: lpId, draftPoolItemId: dpiId };
        return Promise.resolve();
      },
    }),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
      findPlayer: (_leagueId, _userId) => Promise.resolve(player),
    }),
  });

  const draftPoolItemId = crypto.randomUUID();
  await service.delete(player.userId, {
    leagueId: fakeLeague.id,
    draftPoolItemId,
  });

  assertEquals(deleteCalledWith?.leaguePlayerId, player.id);
  assertEquals(deleteCalledWith?.draftPoolItemId, draftPoolItemId);
});

Deno.test("poolItemNoteService.delete: throws NOT_FOUND when league does not exist", async () => {
  const service = createPoolItemNoteService({
    poolItemNoteRepo: createFakePoolItemNoteRepo(),
    leagueRepo: createFakeLeagueRepo(),
  });

  const error = await assertRejects(
    () =>
      service.delete("user-1", {
        leagueId: "nonexistent",
        draftPoolItemId: crypto.randomUUID(),
      }),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("poolItemNoteService.delete: throws FORBIDDEN when user is not a member", async () => {
  const fakeLeague = createFakeLeague();

  const service = createPoolItemNoteService({
    poolItemNoteRepo: createFakePoolItemNoteRepo(),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
    }),
  });

  const error = await assertRejects(
    () =>
      service.delete("user-1", {
        leagueId: fakeLeague.id,
        draftPoolItemId: crypto.randomUUID(),
      }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});
