import { assertEquals, assertRejects } from "@std/assert";
import { TRPCError } from "@trpc/server";
import type { LeagueRepository } from "../league/league.repository.ts";
import type { WatchlistRepository } from "./watchlist.repository.ts";
import { createWatchlistService } from "./watchlist.service.ts";

type FakeLeague = Awaited<ReturnType<LeagueRepository["findById"]>>;
type FakePlayer = Awaited<ReturnType<LeagueRepository["findPlayer"]>>;
type FakeWatchlistItem = Awaited<
  ReturnType<WatchlistRepository["findByLeaguePlayerId"]>
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

function createFakeWatchlistItem(
  overrides: Partial<FakeWatchlistItem> = {},
): FakeWatchlistItem {
  return {
    id: crypto.randomUUID(),
    leaguePlayerId: crypto.randomUUID(),
    draftPoolItemId: crypto.randomUUID(),
    position: 0,
    createdAt: new Date(),
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
    replacePlayerUser: (_leagueId, _oldUserId, _newUserId) => Promise.resolve(),
    findAvailableNpcUsers: (_leagueId) => Promise.resolve([]),
    updateSettings: (_id, _data) => Promise.resolve(createFakeLeague()),
    updateStatus: (_id, _status) => Promise.resolve(createFakeLeague()),
    countPlayers: (_leagueId) => Promise.resolve(0),
    ...overrides,
  };
}

function createFakeWatchlistRepo(
  overrides: Partial<WatchlistRepository> = {},
): WatchlistRepository {
  return {
    findByLeaguePlayerId: (_leaguePlayerId) => Promise.resolve([]),
    findByLeaguePlayerIdAndDraftPoolItemId: (_lpId, _dpiId) =>
      Promise.resolve(null),
    getMaxPosition: (_leaguePlayerId) => Promise.resolve(null),
    create: (data) =>
      Promise.resolve(createFakeWatchlistItem({
        leaguePlayerId: data.leaguePlayerId,
        draftPoolItemId: data.draftPoolItemId,
        position: data.position,
      })),
    deleteByLeaguePlayerIdAndDraftPoolItemId: (_lpId, _dpiId) =>
      Promise.resolve(),
    replaceAllPositions: (_lpId, _itemIds) => Promise.resolve(),
    ...overrides,
  };
}

// --- list ---

Deno.test("watchlistService.list: returns items for a valid league member", async () => {
  const fakeLeague = createFakeLeague();
  const player = createMemberPlayer(fakeLeague.id);
  const items = [
    createFakeWatchlistItem({ leaguePlayerId: player.id, position: 0 }),
    createFakeWatchlistItem({ leaguePlayerId: player.id, position: 1 }),
  ];

  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo({
      findByLeaguePlayerId: (_id) => Promise.resolve(items),
    }),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
      findPlayer: (_leagueId, _userId) => Promise.resolve(player),
    }),
  });

  const result = await service.list(player.userId, fakeLeague.id);
  assertEquals(result.length, 2);
  assertEquals(result[0].position, 0);
  assertEquals(result[1].position, 1);
});

Deno.test("watchlistService.list: throws NOT_FOUND when league does not exist", async () => {
  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo(),
    leagueRepo: createFakeLeagueRepo(),
  });

  const error = await assertRejects(
    () => service.list("user-1", "nonexistent"),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("watchlistService.list: throws FORBIDDEN when user is not a member", async () => {
  const fakeLeague = createFakeLeague();

  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo(),
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

// --- add ---

Deno.test("watchlistService.add: adds item at next position", async () => {
  const fakeLeague = createFakeLeague();
  const player = createMemberPlayer(fakeLeague.id);
  let capturedData: {
    leaguePlayerId: string;
    draftPoolItemId: string;
    position: number;
  } | undefined;

  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo({
      getMaxPosition: (_id) => Promise.resolve(2),
      create: (data) => {
        capturedData = data;
        return Promise.resolve(createFakeWatchlistItem(data));
      },
    }),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
      findPlayer: (_leagueId, _userId) => Promise.resolve(player),
    }),
  });

  const draftPoolItemId = crypto.randomUUID();
  const result = await service.add(player.userId, {
    leagueId: fakeLeague.id,
    draftPoolItemId,
  });

  assertEquals(capturedData?.leaguePlayerId, player.id);
  assertEquals(capturedData?.draftPoolItemId, draftPoolItemId);
  assertEquals(capturedData?.position, 3);
  assertEquals(result.position, 3);
});

Deno.test("watchlistService.add: adds first item at position 0", async () => {
  const fakeLeague = createFakeLeague();
  const player = createMemberPlayer(fakeLeague.id);
  let capturedPosition: number | undefined;

  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo({
      create: (data) => {
        capturedPosition = data.position;
        return Promise.resolve(createFakeWatchlistItem(data));
      },
    }),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
      findPlayer: (_leagueId, _userId) => Promise.resolve(player),
    }),
  });

  await service.add(player.userId, {
    leagueId: fakeLeague.id,
    draftPoolItemId: crypto.randomUUID(),
  });

  assertEquals(capturedPosition, 0);
});

Deno.test("watchlistService.add: throws NOT_FOUND when league does not exist", async () => {
  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo(),
    leagueRepo: createFakeLeagueRepo(),
  });

  const error = await assertRejects(
    () =>
      service.add("user-1", {
        leagueId: "nonexistent",
        draftPoolItemId: crypto.randomUUID(),
      }),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("watchlistService.add: throws FORBIDDEN when user is not a member", async () => {
  const fakeLeague = createFakeLeague();

  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo(),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
    }),
  });

  const error = await assertRejects(
    () =>
      service.add("user-1", {
        leagueId: fakeLeague.id,
        draftPoolItemId: crypto.randomUUID(),
      }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("watchlistService.add: throws BAD_REQUEST when item already in watchlist", async () => {
  const fakeLeague = createFakeLeague();
  const player = createMemberPlayer(fakeLeague.id);
  const existingItem = createFakeWatchlistItem({ leaguePlayerId: player.id });

  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo({
      findByLeaguePlayerIdAndDraftPoolItemId: (_lpId, _dpiId) =>
        Promise.resolve(existingItem),
    }),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
      findPlayer: (_leagueId, _userId) => Promise.resolve(player),
    }),
  });

  const error = await assertRejects(
    () =>
      service.add(player.userId, {
        leagueId: fakeLeague.id,
        draftPoolItemId: existingItem.draftPoolItemId,
      }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

// --- remove ---

Deno.test("watchlistService.remove: removes a watchlisted item", async () => {
  const fakeLeague = createFakeLeague();
  const player = createMemberPlayer(fakeLeague.id);
  let deleteCalledWith:
    | { leaguePlayerId: string; draftPoolItemId: string }
    | undefined;

  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo({
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
  await service.remove(player.userId, {
    leagueId: fakeLeague.id,
    draftPoolItemId,
  });

  assertEquals(deleteCalledWith?.leaguePlayerId, player.id);
  assertEquals(deleteCalledWith?.draftPoolItemId, draftPoolItemId);
});

Deno.test("watchlistService.remove: throws NOT_FOUND when league does not exist", async () => {
  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo(),
    leagueRepo: createFakeLeagueRepo(),
  });

  const error = await assertRejects(
    () =>
      service.remove("user-1", {
        leagueId: "nonexistent",
        draftPoolItemId: crypto.randomUUID(),
      }),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("watchlistService.remove: throws FORBIDDEN when user is not a member", async () => {
  const fakeLeague = createFakeLeague();

  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo(),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
    }),
  });

  const error = await assertRejects(
    () =>
      service.remove("user-1", {
        leagueId: fakeLeague.id,
        draftPoolItemId: crypto.randomUUID(),
      }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

// --- reorder ---

Deno.test("watchlistService.reorder: updates positions and returns reordered list", async () => {
  const fakeLeague = createFakeLeague();
  const player = createMemberPlayer(fakeLeague.id);
  const reorderedItems = [
    createFakeWatchlistItem({ leaguePlayerId: player.id, position: 0 }),
    createFakeWatchlistItem({ leaguePlayerId: player.id, position: 1 }),
  ];
  let replaceCalledWith:
    | { leaguePlayerId: string; itemIds: string[] }
    | undefined;

  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo({
      replaceAllPositions: (lpId, itemIds) => {
        replaceCalledWith = { leaguePlayerId: lpId, itemIds };
        return Promise.resolve();
      },
      findByLeaguePlayerId: (_id) => Promise.resolve(reorderedItems),
    }),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
      findPlayer: (_leagueId, _userId) => Promise.resolve(player),
    }),
  });

  const itemIds = [crypto.randomUUID(), crypto.randomUUID()];
  const result = await service.reorder(player.userId, {
    leagueId: fakeLeague.id,
    itemIds,
  });

  assertEquals(replaceCalledWith?.leaguePlayerId, player.id);
  assertEquals(replaceCalledWith?.itemIds, itemIds);
  assertEquals(result.length, 2);
});

Deno.test("watchlistService.reorder: throws NOT_FOUND when league does not exist", async () => {
  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo(),
    leagueRepo: createFakeLeagueRepo(),
  });

  const error = await assertRejects(
    () =>
      service.reorder("user-1", {
        leagueId: "nonexistent",
        itemIds: [],
      }),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("watchlistService.reorder: throws FORBIDDEN when user is not a member", async () => {
  const fakeLeague = createFakeLeague();

  const service = createWatchlistService({
    watchlistRepo: createFakeWatchlistRepo(),
    leagueRepo: createFakeLeagueRepo({
      findById: (_id) => Promise.resolve(fakeLeague),
    }),
  });

  const error = await assertRejects(
    () =>
      service.reorder("user-1", {
        leagueId: fakeLeague.id,
        itemIds: [],
      }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});
