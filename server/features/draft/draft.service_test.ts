import { assertEquals, assertRejects } from "@std/assert";
import { TRPCError } from "@trpc/server";
import type { DraftEvent } from "@make-the-pick/shared";
import type { DraftPoolRepository } from "../draft-pool/draft-pool.repository.ts";
import type { LeagueRepository } from "../league/league.repository.ts";
import {
  type CreateDraftInput,
  type CreatePickInput,
  DraftPickConflictError,
  type DraftRepository,
} from "./draft.repository.ts";
import type { DraftEventPublisher } from "./draft.events.ts";
import { createDraftService } from "./draft.service.ts";

interface PublishedEvent {
  leagueId: string;
  event: DraftEvent;
}

function createRecordingPublisher(): DraftEventPublisher & {
  published: PublishedEvent[];
} {
  const published: PublishedEvent[] = [];
  return {
    published,
    subscribe: () => () => {},
    publish: (leagueId, event) => {
      published.push({ leagueId, event });
    },
    subscriberCount: () => 0,
  };
}

type FakeLeague = Awaited<ReturnType<LeagueRepository["findById"]>>;
type FakePlayer = Awaited<ReturnType<LeagueRepository["findPlayer"]>>;
type FakeDraft = Awaited<ReturnType<DraftRepository["findByLeagueId"]>>;
type FakeDraftPick = Awaited<
  ReturnType<DraftRepository["listPicks"]>
>[number];
type FakePool = Awaited<
  ReturnType<DraftPoolRepository["findByLeagueId"]>
>;
type FakePoolItem = Awaited<
  ReturnType<DraftPoolRepository["findItemsByPoolId"]>
>[number];

function createFakeLeague(
  overrides: Partial<NonNullable<FakeLeague>> = {},
): NonNullable<FakeLeague> {
  return {
    id: crypto.randomUUID(),
    name: "Test League",
    status: "drafting",
    sportType: "pokemon",
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 2,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
    },
    maxPlayers: 4,
    inviteCode: "ABCD1234",
    createdBy: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createFakeDraft(
  overrides: Partial<NonNullable<FakeDraft>> = {},
): NonNullable<FakeDraft> {
  return {
    id: crypto.randomUUID(),
    leagueId: crypto.randomUUID(),
    poolId: crypto.randomUUID(),
    format: "snake",
    status: "pending",
    pickOrder: [],
    currentPick: 0,
    startedAt: null,
    completedAt: null,
    currentTurnDeadline: null,
    pausedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function createFakePool(
  leagueId: string,
  overrides: Partial<NonNullable<FakePool>> = {},
): NonNullable<FakePool> {
  return {
    id: crypto.randomUUID(),
    leagueId,
    name: "Draft Pool",
    createdAt: new Date(),
    ...overrides,
  };
}

function createFakePoolItem(
  draftPoolId: string,
  overrides: Partial<FakePoolItem> = {},
): FakePoolItem {
  return {
    id: crypto.randomUUID(),
    draftPoolId,
    name: "pikachu",
    thumbnailUrl: null,
    metadata: null,
    ...overrides,
  };
}

function createLeaguePlayerRow(
  _leagueId: string,
  userId: string,
  role: "commissioner" | "member" = "member",
  isNpc = false,
  npcStrategy: string | null = null,
) {
  return {
    id: crypto.randomUUID(),
    userId,
    name: userId,
    image: null as string | null,
    isNpc,
    npcStrategy,
    role,
    joinedAt: new Date(),
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
    updateSettings: (_id, _data) => Promise.resolve(createFakeLeague()),
    updateStatus: (_id, _status) => Promise.resolve(createFakeLeague()),
    countPlayers: (_leagueId) => Promise.resolve(0),
    deletePlayer: (_leagueId, _userId) => Promise.resolve(),
    findAvailableNpcUsers: (_leagueId) => Promise.resolve([]),
    ...overrides,
  };
}

function createFakeDraftRepo(
  overrides: Partial<DraftRepository> = {},
): DraftRepository {
  return {
    findByLeagueId: (_leagueId) => Promise.resolve(null as FakeDraft),
    findById: (_id) => Promise.resolve(null as FakeDraft),
    create: (_input: CreateDraftInput) => Promise.resolve(createFakeDraft()),
    updateStatus: (_id, _status, _timestamps) =>
      Promise.resolve(createFakeDraft()),
    pauseDraft: (_id, _pausedAt) => Promise.resolve(createFakeDraft()),
    resumeDraft: (_id, _deadline) => Promise.resolve(createFakeDraft()),
    reopenCompletedDraft: (_id, _deadline) =>
      Promise.resolve(createFakeDraft()),
    incrementCurrentPick: (_id) => Promise.resolve(1),
    undoLastPick: (_id) =>
      Promise.resolve({
        pick: {
          id: crypto.randomUUID(),
          draftId: _id,
          leaguePlayerId: crypto.randomUUID(),
          poolItemId: crypto.randomUUID(),
          pickNumber: 0,
          pickedAt: new Date(),
          autoPicked: false,
        },
        currentPick: 0,
      }),
    findLastPick: (_draftId) => Promise.resolve(null as FakeDraftPick | null),
    listPicks: (_draftId) => Promise.resolve([]),
    createPick: (_input) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        draftId: _input.draftId,
        leaguePlayerId: _input.leaguePlayerId,
        poolItemId: _input.poolItemId,
        pickNumber: _input.pickNumber,
        pickedAt: new Date(),
        autoPicked: false,
      }),
    findPickByPoolItem: (_draftId, _poolItemId) =>
      Promise.resolve(null as FakeDraftPick | null),
    updateTurnDeadline: (_id, _deadline) => Promise.resolve(),
    listActiveDraftsWithDeadlines: () => Promise.resolve([]),
    ...overrides,
  };
}

function createFakeDraftPoolRepo(
  overrides: Partial<DraftPoolRepository> = {},
): DraftPoolRepository {
  return {
    create: (leagueId, name) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId,
        name,
        createdAt: new Date(),
      }),
    createItems: (_items) => Promise.resolve([]),
    findByLeagueId: (_leagueId) => Promise.resolve(null as FakePool),
    findItemsByPoolId: (_poolId) => Promise.resolve([]),
    deleteByLeagueId: (_leagueId) => Promise.resolve(),
    ...overrides,
  };
}

// --- startDraft -----------------------------------------------------------

Deno.test("draftService.startDraft: commissioner starts draft sets in_progress, startedAt, pickOrder", async () => {
  const league = createFakeLeague({ status: "drafting" });
  const pool = createFakePool(league.id);
  const playerA = createLeaguePlayerRow(league.id, "user-1", "commissioner");
  const playerB = createLeaguePlayerRow(league.id, "user-2", "member");

  let createdDraft: ReturnType<typeof createFakeDraft> | null = null;
  let capturedStatus: string | undefined;
  let capturedTimestamps: { startedAt?: Date; completedAt?: Date } | undefined;

  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(null as FakeDraft),
    create: (input) => {
      createdDraft = createFakeDraft({
        leagueId: input.leagueId,
        poolId: input.poolId,
        pickOrder: input.pickOrder,
        format: input.format,
      });
      return Promise.resolve(createdDraft);
    },
    updateStatus: (id, status, timestamps) => {
      capturedStatus = status;
      capturedTimestamps = timestamps;
      return Promise.resolve({
        ...createdDraft!,
        id,
        status: status as "in_progress",
        startedAt: timestamps.startedAt ?? null,
        completedAt: timestamps.completedAt ?? null,
      });
    },
    listPicks: (_id) => Promise.resolve([]),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(league),
    findPlayer: (_leagueId, userId) =>
      Promise.resolve(
        userId === "user-1"
          ? { ...playerA, leagueId: league.id }
          : null as FakePlayer,
      ),
    findPlayersByLeagueId: (_id) => Promise.resolve([playerA, playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(pool),
    findItemsByPoolId: (poolId) =>
      Promise.resolve([
        createFakePoolItem(poolId),
        createFakePoolItem(poolId),
      ]),
  });

  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });
  const state = await service.startDraft({
    userId: "user-1",
    leagueId: league.id,
  });

  assertEquals(capturedStatus, "in_progress");
  assertEquals(capturedTimestamps?.startedAt instanceof Date, true);
  assertEquals(state.draft.status, "in_progress");
  assertEquals(state.draft.pickOrder.length, 2);
  assertEquals(
    new Set(state.draft.pickOrder),
    new Set([playerA.id, playerB.id]),
  );
});

Deno.test("draftService.startDraft: non-commissioner → FORBIDDEN", async () => {
  const league = createFakeLeague({ status: "drafting" });
  const draftRepo = createFakeDraftRepo();
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(league),
    findPlayer: (_leagueId, userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: league.id,
        userId,
        role: "member" as const,
        joinedAt: new Date(),
      }),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () => service.startDraft({ userId: "user-2", leagueId: league.id }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("draftService.startDraft: missing pool → BAD_REQUEST", async () => {
  const league = createFakeLeague({ status: "drafting" });
  const playerA = createLeaguePlayerRow(league.id, "user-1", "commissioner");
  const draftRepo = createFakeDraftRepo();
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...playerA, leagueId: league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([playerA]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(null as FakePool),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () => service.startDraft({ userId: "user-1", leagueId: league.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftService.startDraft: already in_progress → CONFLICT", async () => {
  const league = createFakeLeague({ status: "drafting" });
  const pool = createFakePool(league.id);
  const playerA = createLeaguePlayerRow(league.id, "user-1", "commissioner");
  const existingDraft = createFakeDraft({
    leagueId: league.id,
    poolId: pool.id,
    status: "in_progress",
    pickOrder: [playerA.id],
    startedAt: new Date(),
  });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(existingDraft),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...playerA, leagueId: league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([playerA]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(pool),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () => service.startDraft({ userId: "user-1", leagueId: league.id }),
    TRPCError,
  );
  assertEquals(error.code, "CONFLICT");
});

// --- makePick -------------------------------------------------------------

function setupMakePickFakes(opts: {
  leagueStatus?: "setup" | "drafting" | "competing" | "complete";
  draftStatus?: "pending" | "in_progress" | "complete";
  currentPick?: number;
  numberOfRounds?: number;
  pickedPoolItemIds?: string[];
  pickerUserId?: string;
  useFirstPickerAsCurrent?: boolean;
}) {
  const league = createFakeLeague({
    status: opts.leagueStatus ?? "drafting",
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: opts.numberOfRounds ?? 2,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
    },
  });
  const pool = createFakePool(league.id);
  const playerA = createLeaguePlayerRow(league.id, "user-1", "commissioner");
  const playerB = createLeaguePlayerRow(league.id, "user-2", "member");
  const poolItem1 = createFakePoolItem(pool.id, { name: "pikachu" });
  const poolItem2 = createFakePoolItem(pool.id, { name: "charmander" });
  const poolItem3 = createFakePoolItem(pool.id, { name: "bulbasaur" });
  const poolItem4 = createFakePoolItem(pool.id, { name: "squirtle" });

  const draft = createFakeDraft({
    leagueId: league.id,
    poolId: pool.id,
    status: opts.draftStatus ?? "in_progress",
    pickOrder: [playerA.id, playerB.id],
    currentPick: opts.currentPick ?? 0,
    startedAt: new Date(),
  });

  const picks: FakeDraftPick[] = (opts.pickedPoolItemIds ?? []).map((
    poolItemId,
    i,
  ) => ({
    id: crypto.randomUUID(),
    draftId: draft.id,
    leaguePlayerId: playerA.id,
    poolItemId,
    pickNumber: i,
    pickedAt: new Date(),
    autoPicked: false,
  }));

  return {
    league,
    pool,
    playerA,
    playerB,
    poolItems: [poolItem1, poolItem2, poolItem3, poolItem4],
    draft,
    picks,
  };
}

Deno.test("draftService.makePick: happy path creates a pick and increments currentPick", async () => {
  const fx = setupMakePickFakes({ currentPick: 0 });
  let createdPick: {
    leaguePlayerId: string;
    poolItemId: string;
    pickNumber: number;
  } | null = null;
  let incrementCalledForDraft: string | undefined;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.draft),
    findById: (_id) => Promise.resolve(fx.draft),
    listPicks: (_id) => Promise.resolve(fx.picks),
    createPick: (input) => {
      createdPick = {
        leaguePlayerId: input.leaguePlayerId,
        poolItemId: input.poolItemId,
        pickNumber: input.pickNumber,
      };
      return Promise.resolve({
        id: crypto.randomUUID(),
        draftId: input.draftId,
        leaguePlayerId: input.leaguePlayerId,
        poolItemId: input.poolItemId,
        pickNumber: input.pickNumber,
        pickedAt: new Date(),
        autoPicked: false,
      });
    },
    incrementCurrentPick: (id) => {
      incrementCalledForDraft = id;
      return Promise.resolve(1);
    },
    findPickByPoolItem: (_draftId, _poolItemId) =>
      Promise.resolve(null as FakeDraftPick | null),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, userId) =>
      Promise.resolve(
        userId === "user-1"
          ? { ...fx.playerA, leagueId: fx.league.id }
          : { ...fx.playerB, leagueId: fx.league.id },
      ),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });

  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });
  const state = await service.makePick({
    userId: "user-1",
    leagueId: fx.league.id,
    poolItemId: fx.poolItems[0].id,
  });

  const captured = createdPick as unknown as {
    leaguePlayerId: string;
    poolItemId: string;
    pickNumber: number;
  } | null;
  assertEquals(captured?.leaguePlayerId, fx.playerA.id);
  assertEquals(captured?.poolItemId, fx.poolItems[0].id);
  assertEquals(captured?.pickNumber, 0);
  assertEquals(incrementCalledForDraft, fx.draft.id);
  assertEquals(state.draft.status, "in_progress");
});

Deno.test("draftService.makePick: not your turn → FORBIDDEN", async () => {
  const fx = setupMakePickFakes({ currentPick: 0 });
  // currentPick 0 → playerA's turn, but user-2 (playerB) calls
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.draft),
    listPicks: (_id) => Promise.resolve([]),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...fx.playerB, leagueId: fx.league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () =>
      service.makePick({
        userId: "user-2",
        leagueId: fx.league.id,
        poolItemId: fx.poolItems[0].id,
      }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("draftService.makePick: pool item already picked → CONFLICT", async () => {
  const fx = setupMakePickFakes({ currentPick: 0 });
  const alreadyPickedItem = fx.poolItems[0];
  const existingPick: FakeDraftPick = {
    id: crypto.randomUUID(),
    draftId: fx.draft.id,
    leaguePlayerId: fx.playerA.id,
    poolItemId: alreadyPickedItem.id,
    pickNumber: 0,
    pickedAt: new Date(),
    autoPicked: false,
  };
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve({ ...fx.draft, currentPick: 1 }),
    listPicks: (_id) => Promise.resolve([existingPick]),
    findPickByPoolItem: (_draftId, poolItemId) =>
      Promise.resolve(
        poolItemId === alreadyPickedItem.id ? existingPick : null,
      ),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...fx.playerB, leagueId: fx.league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  // currentPick=1 → playerB (user-2)'s turn, tries to pick the already-picked item
  const error = await assertRejects(
    () =>
      service.makePick({
        userId: "user-2",
        leagueId: fx.league.id,
        poolItemId: alreadyPickedItem.id,
      }),
    TRPCError,
  );
  assertEquals(error.code, "CONFLICT");
});

Deno.test("draftService.makePick: createPick race → DraftPickConflictError mapped to CONFLICT", async () => {
  const fx = setupMakePickFakes({ currentPick: 0 });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.draft),
    listPicks: (_id) => Promise.resolve([]),
    findPickByPoolItem: (_draftId, _poolItemId) =>
      Promise.resolve(null as FakeDraftPick | null),
    createPick: (_input) => {
      throw new DraftPickConflictError("already picked");
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () =>
      service.makePick({
        userId: "user-1",
        leagueId: fx.league.id,
        poolItemId: fx.poolItems[0].id,
      }),
    TRPCError,
  );
  assertEquals(error.code, "CONFLICT");
});

Deno.test("draftService.makePick: pool item not in draft's pool → BAD_REQUEST", async () => {
  const fx = setupMakePickFakes({ currentPick: 0 });
  const foreignItemId = crypto.randomUUID();
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.draft),
    listPicks: (_id) => Promise.resolve([]),
    findPickByPoolItem: (_draftId, _poolItemId) =>
      Promise.resolve(null as FakeDraftPick | null),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () =>
      service.makePick({
        userId: "user-1",
        leagueId: fx.league.id,
        poolItemId: foreignItemId,
      }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftService.makePick: draft not in_progress → BAD_REQUEST", async () => {
  const fx = setupMakePickFakes({
    currentPick: 0,
    draftStatus: "pending",
  });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.draft),
    listPicks: (_id) => Promise.resolve([]),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () =>
      service.makePick({
        userId: "user-1",
        leagueId: fx.league.id,
        poolItemId: fx.poolItems[0].id,
      }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftService.makePick: final pick transitions draft to complete with completedAt", async () => {
  // 2 players, 2 rounds → 4 picks total. Already 3 picks made, currentPick=3.
  // resolveSnakeTurn([A,B], 3) → round 1 (reversed), position 1 → playerA.
  const fx = setupMakePickFakes({ currentPick: 3, numberOfRounds: 2 });
  const existingPicks: FakeDraftPick[] = [
    {
      id: crypto.randomUUID(),
      draftId: fx.draft.id,
      leaguePlayerId: fx.playerA.id,
      poolItemId: fx.poolItems[0].id,
      pickNumber: 0,
      pickedAt: new Date(),
      autoPicked: false,
    },
    {
      id: crypto.randomUUID(),
      draftId: fx.draft.id,
      leaguePlayerId: fx.playerB.id,
      poolItemId: fx.poolItems[1].id,
      pickNumber: 1,
      pickedAt: new Date(),
      autoPicked: false,
    },
    {
      id: crypto.randomUUID(),
      draftId: fx.draft.id,
      leaguePlayerId: fx.playerB.id,
      poolItemId: fx.poolItems[2].id,
      pickNumber: 2,
      pickedAt: new Date(),
      autoPicked: false,
    },
  ];

  let capturedStatus: string | undefined;
  let capturedTimestamps: { startedAt?: Date; completedAt?: Date } | undefined;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.draft),
    listPicks: (_id) => Promise.resolve(existingPicks),
    findPickByPoolItem: (_draftId, poolItemId) =>
      Promise.resolve(
        existingPicks.find((p) => p.poolItemId === poolItemId) ??
          null as FakeDraftPick | null,
      ),
    incrementCurrentPick: (_id) => Promise.resolve(4),
    updateStatus: (id, status, timestamps) => {
      capturedStatus = status;
      capturedTimestamps = timestamps;
      return Promise.resolve({
        ...fx.draft,
        id,
        status: status as "complete",
        completedAt: timestamps.completedAt ?? null,
        currentPick: 4,
      });
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const state = await service.makePick({
    userId: "user-1",
    leagueId: fx.league.id,
    poolItemId: fx.poolItems[3].id,
  });

  assertEquals(capturedStatus, "complete");
  assertEquals(capturedTimestamps?.completedAt instanceof Date, true);
  assertEquals(state.draft.status, "complete");
});

// --- getState -------------------------------------------------------------

Deno.test("draftService.getState: returns draft + picks + availableItemIds", async () => {
  const fx = setupMakePickFakes({ currentPick: 1 });
  const existingPick: FakeDraftPick = {
    id: crypto.randomUUID(),
    draftId: fx.draft.id,
    leaguePlayerId: fx.playerA.id,
    poolItemId: fx.poolItems[0].id,
    pickNumber: 0,
    pickedAt: new Date(),
    autoPicked: false,
  };
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve({ ...fx.draft, currentPick: 1 }),
    listPicks: (_id) => Promise.resolve([existingPick]),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const state = await service.getState({
    userId: "user-1",
    leagueId: fx.league.id,
  });

  assertEquals(state.picks.length, 1);
  assertEquals(state.availableItemIds.length, fx.poolItems.length - 1);
  assertEquals(
    state.availableItemIds.includes(fx.poolItems[0].id),
    false,
  );
  assertEquals(state.draft.currentPick, 1);
  assertEquals(state.players.length, 2);
});

Deno.test("draftService.getState: non-member → FORBIDDEN", async () => {
  const fx = setupMakePickFakes({});
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.draft),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) => Promise.resolve(null as FakePlayer),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () => service.getState({ userId: "stranger", leagueId: fx.league.id }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

// --- validatePick ---------------------------------------------------------

Deno.test("draftService.validatePick: returns valid=true for legal pick", async () => {
  const fx = setupMakePickFakes({ currentPick: 0 });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.draft),
    listPicks: (_id) => Promise.resolve([]),
    findPickByPoolItem: (_draftId, _poolItemId) =>
      Promise.resolve(null as FakeDraftPick | null),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const result = await service.validatePick({
    userId: "user-1",
    leagueId: fx.league.id,
    poolItemId: fx.poolItems[0].id,
  });
  assertEquals(result.valid, true);
});

// --- event publishing ----------------------------------------------------

Deno.test("draftService.startDraft: publishes draft:started then draft:turn_change", async () => {
  const league = createFakeLeague({ status: "drafting" });
  const pool = createFakePool(league.id);
  const playerA = createLeaguePlayerRow(league.id, "user-1", "commissioner");
  const playerB = createLeaguePlayerRow(league.id, "user-2", "member");

  let createdDraft: ReturnType<typeof createFakeDraft> | null = null;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(null as FakeDraft),
    create: (input) => {
      createdDraft = createFakeDraft({
        leagueId: input.leagueId,
        poolId: input.poolId,
        pickOrder: input.pickOrder,
        format: input.format,
      });
      return Promise.resolve(createdDraft);
    },
    updateStatus: (id, status, timestamps) =>
      Promise.resolve({
        ...createdDraft!,
        id,
        status: status as "in_progress",
        startedAt: timestamps.startedAt ?? null,
        completedAt: timestamps.completedAt ?? null,
      }),
    listPicks: (_id) => Promise.resolve([]),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...playerA, leagueId: league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([playerA, playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(pool),
    findItemsByPoolId: (poolId) =>
      Promise.resolve([
        createFakePoolItem(poolId),
        createFakePoolItem(poolId),
      ]),
  });
  const publisher = createRecordingPublisher();

  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
  });
  await service.startDraft({ userId: "user-1", leagueId: league.id });

  assertEquals(publisher.published.length, 2);
  assertEquals(publisher.published[0].leagueId, league.id);
  assertEquals(publisher.published[0].event.type, "draft:started");
  assertEquals(publisher.published[1].leagueId, league.id);
  assertEquals(publisher.published[1].event.type, "draft:turn_change");
  if (publisher.published[1].event.type === "draft:turn_change") {
    assertEquals(publisher.published[1].event.data.pickNumber, 0);
    assertEquals(publisher.published[1].event.data.round, 0);
  }
});

Deno.test("draftService.makePick: non-final pick publishes pick_made then turn_change", async () => {
  const fx = setupMakePickFakes({ currentPick: 0 });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.draft),
    listPicks: (_id) => Promise.resolve([]),
    createPick: (input) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        draftId: input.draftId,
        leaguePlayerId: input.leaguePlayerId,
        poolItemId: input.poolItemId,
        pickNumber: input.pickNumber,
        pickedAt: new Date(),
        autoPicked: false,
      }),
    incrementCurrentPick: (_id) => Promise.resolve(1),
    findPickByPoolItem: (_d, _p) =>
      Promise.resolve(null as FakeDraftPick | null),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const publisher = createRecordingPublisher();

  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
  });
  await service.makePick({
    userId: "user-1",
    leagueId: fx.league.id,
    poolItemId: fx.poolItems[0].id,
  });

  assertEquals(publisher.published.length, 2);
  assertEquals(publisher.published[0].event.type, "draft:pick_made");
  if (publisher.published[0].event.type === "draft:pick_made") {
    assertEquals(
      publisher.published[0].event.data.poolItemId,
      fx.poolItems[0].id,
    );
    assertEquals(publisher.published[0].event.data.itemName, "pikachu");
    assertEquals(publisher.published[0].event.data.playerName, fx.playerA.name);
    assertEquals(publisher.published[0].event.data.pickNumber, 0);
    assertEquals(publisher.published[0].event.data.round, 0);
  }
  assertEquals(publisher.published[1].event.type, "draft:turn_change");
  if (publisher.published[1].event.type === "draft:turn_change") {
    assertEquals(publisher.published[1].event.data.pickNumber, 1);
    assertEquals(
      publisher.published[1].event.data.currentLeaguePlayerId,
      fx.playerB.id,
    );
  }
});

Deno.test("draftService.makePick: final pick publishes pick_made then draft:completed", async () => {
  const fx = setupMakePickFakes({ currentPick: 3, numberOfRounds: 2 });
  const existingPicks: FakeDraftPick[] = [
    {
      id: crypto.randomUUID(),
      draftId: fx.draft.id,
      leaguePlayerId: fx.playerA.id,
      poolItemId: fx.poolItems[0].id,
      pickNumber: 0,
      pickedAt: new Date(),
      autoPicked: false,
    },
    {
      id: crypto.randomUUID(),
      draftId: fx.draft.id,
      leaguePlayerId: fx.playerB.id,
      poolItemId: fx.poolItems[1].id,
      pickNumber: 1,
      pickedAt: new Date(),
      autoPicked: false,
    },
    {
      id: crypto.randomUUID(),
      draftId: fx.draft.id,
      leaguePlayerId: fx.playerB.id,
      poolItemId: fx.poolItems[2].id,
      pickNumber: 2,
      pickedAt: new Date(),
      autoPicked: false,
    },
  ];

  const completedAt = new Date();
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.draft),
    listPicks: (_id) => Promise.resolve(existingPicks),
    findPickByPoolItem: (_d, poolItemId) =>
      Promise.resolve(
        existingPicks.find((p) => p.poolItemId === poolItemId) ??
          (null as FakeDraftPick | null),
      ),
    incrementCurrentPick: (_id) => Promise.resolve(4),
    updateStatus: (id, status, _ts) =>
      Promise.resolve({
        ...fx.draft,
        id,
        status: status as "complete",
        completedAt,
        currentPick: 4,
      }),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const publisher = createRecordingPublisher();

  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
  });
  await service.makePick({
    userId: "user-1",
    leagueId: fx.league.id,
    poolItemId: fx.poolItems[3].id,
  });

  assertEquals(publisher.published.length, 2);
  assertEquals(publisher.published[0].event.type, "draft:pick_made");
  assertEquals(publisher.published[1].event.type, "draft:completed");
});

// --- validatePick ---------------------------------------------------------

Deno.test("draftService.validatePick: returns valid=false when not caller's turn", async () => {
  const fx = setupMakePickFakes({ currentPick: 0 });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.draft),
    listPicks: (_id) => Promise.resolve([]),
    findPickByPoolItem: (_draftId, _poolItemId) =>
      Promise.resolve(null as FakeDraftPick | null),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fx.league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...fx.playerB, leagueId: fx.league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(fx.pool),
    findItemsByPoolId: (_id) => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const result = await service.validatePick({
    userId: "user-2",
    leagueId: fx.league.id,
    poolItemId: fx.poolItems[0].id,
  });
  assertEquals(result.valid, false);
  assertEquals(typeof result.reason, "string");
});

// --- pick timer & auto-pick ----------------------------------------------

function createFixedClock(isoStart: string) {
  let current = new Date(isoStart);
  return {
    now: () => current,
    advance(ms: number) {
      current = new Date(current.getTime() + ms);
    },
    set(date: Date) {
      current = date;
    },
  };
}

interface RecordingScheduler {
  scheduled: Array<
    { draftId: string; leagueId: string; deadline: Date | null }
  >;
  cancelled: string[];
  schedule(draftId: string, leagueId: string, deadline: Date | null): void;
  cancel(draftId: string): void;
  triggerNowForTest(draftId: string): Promise<void>;
  setAutoPickHandler(): void;
  recoverTimers(): Promise<void>;
  activeTimerCount(): number;
}

function createRecordingScheduler(): RecordingScheduler {
  return {
    scheduled: [],
    cancelled: [],
    schedule(draftId, leagueId, deadline) {
      this.scheduled.push({ draftId, leagueId, deadline });
    },
    cancel(draftId) {
      this.cancelled.push(draftId);
    },
    triggerNowForTest: () => Promise.resolve(),
    setAutoPickHandler: () => {},
    recoverTimers: () => Promise.resolve(),
    activeTimerCount: () => 0,
  };
}

Deno.test("draftService.startDraft: with pickTimeLimitSeconds sets deadline, emits turn_change with deadline, schedules timer", async () => {
  const league = createFakeLeague({
    status: "drafting",
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 2,
      pickTimeLimitSeconds: 60,
      poolSizeMultiplier: 2,
    },
  });
  const pool = createFakePool(league.id);
  const playerA = createLeaguePlayerRow(league.id, "user-1", "commissioner");
  const playerB = createLeaguePlayerRow(league.id, "user-2", "member");

  let persistedDeadline: Date | null | undefined;
  let createdDraft: ReturnType<typeof createFakeDraft> | null = null;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(null as FakeDraft),
    create: (input) => {
      createdDraft = createFakeDraft({
        leagueId: input.leagueId,
        poolId: input.poolId,
        pickOrder: input.pickOrder,
        format: input.format,
      });
      return Promise.resolve(createdDraft);
    },
    updateStatus: (id, status, timestamps) =>
      Promise.resolve({
        ...createdDraft!,
        id,
        status: status as "in_progress",
        startedAt: timestamps.startedAt ?? null,
      }),
    updateTurnDeadline: (_id, deadline) => {
      persistedDeadline = deadline;
      return Promise.resolve();
    },
    listPicks: (_id) => Promise.resolve([]),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(league),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({ ...playerA, leagueId: league.id }),
    findPlayersByLeagueId: (_id) => Promise.resolve([playerA, playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_id) => Promise.resolve(pool),
    findItemsByPoolId: (poolId) =>
      Promise.resolve([
        createFakePoolItem(poolId),
        createFakePoolItem(poolId),
      ]),
  });
  const publisher = createRecordingPublisher();
  const clock = createFixedClock("2026-04-10T00:00:00.000Z");
  const scheduler = createRecordingScheduler();

  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
    clock,
    timerScheduler: scheduler,
  });
  const state = await service.startDraft({
    userId: "user-1",
    leagueId: league.id,
  });

  const expectedDeadline = new Date("2026-04-10T00:01:00.000Z");
  assertEquals(
    (persistedDeadline as Date | null | undefined)?.getTime(),
    expectedDeadline.getTime(),
  );
  assertEquals(state.draft.currentTurnDeadline, expectedDeadline.toISOString());

  const turnChange = publisher.published.find((p) =>
    p.event.type === "draft:turn_change"
  );
  if (turnChange && turnChange.event.type === "draft:turn_change") {
    assertEquals(
      turnChange.event.data.turnDeadline,
      expectedDeadline.toISOString(),
    );
  } else {
    throw new Error("expected turn_change event");
  }

  assertEquals(scheduler.scheduled.length, 1);
  assertEquals(
    scheduler.scheduled[0].deadline?.getTime(),
    expectedDeadline.getTime(),
  );
});

Deno.test("draftService.startDraft: null pickTimeLimitSeconds persists null deadline", async () => {
  const league = createFakeLeague({ status: "drafting" });
  const pool = createFakePool(league.id);
  const playerA = createLeaguePlayerRow(league.id, "user-1", "commissioner");
  let persistedDeadline: Date | null | undefined = undefined;
  let createdDraft: ReturnType<typeof createFakeDraft> | null = null;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_id) => Promise.resolve(null as FakeDraft),
    create: (input) => {
      createdDraft = createFakeDraft({
        leagueId: input.leagueId,
        poolId: input.poolId,
        pickOrder: input.pickOrder,
        format: input.format,
      });
      return Promise.resolve(createdDraft);
    },
    updateStatus: (id, status, _ts) =>
      Promise.resolve({
        ...createdDraft!,
        id,
        status: status as "in_progress",
      }),
    updateTurnDeadline: (_id, deadline) => {
      persistedDeadline = deadline;
      return Promise.resolve();
    },
    listPicks: () => Promise.resolve([]),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(league),
    findPlayer: () => Promise.resolve({ ...playerA, leagueId: league.id }),
    findPlayersByLeagueId: () => Promise.resolve([playerA]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(pool),
    findItemsByPoolId: (poolId) =>
      Promise.resolve([createFakePoolItem(poolId)]),
  });
  const publisher = createRecordingPublisher();
  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
  });

  await service.startDraft({ userId: "user-1", leagueId: league.id });

  assertEquals(persistedDeadline, null);
  const turnChange = publisher.published.find((p) =>
    p.event.type === "draft:turn_change"
  );
  if (turnChange && turnChange.event.type === "draft:turn_change") {
    assertEquals(turnChange.event.data.turnDeadline, null);
  }
});

Deno.test("draftService.makePick: non-final reschedules deadline and includes it in turn_change", async () => {
  const fx = setupMakePickFakes({ currentPick: 0 });
  fx.league.rulesConfig = {
    draftFormat: "snake",
    numberOfRounds: 2,
    pickTimeLimitSeconds: 30,
    poolSizeMultiplier: 2,
  };
  let persistedDeadline: Date | null | undefined = undefined;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
    listPicks: () => Promise.resolve([]),
    createPick: (input) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        draftId: input.draftId,
        leaguePlayerId: input.leaguePlayerId,
        poolItemId: input.poolItemId,
        pickNumber: input.pickNumber,
        pickedAt: new Date(),
        autoPicked: false,
      }),
    incrementCurrentPick: () => Promise.resolve(1),
    findPickByPoolItem: () => Promise.resolve(null as FakeDraftPick | null),
    updateTurnDeadline: (_id, d) => {
      persistedDeadline = d;
      return Promise.resolve();
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const publisher = createRecordingPublisher();
  const clock = createFixedClock("2026-04-10T12:00:00.000Z");
  const scheduler = createRecordingScheduler();

  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
    clock,
    timerScheduler: scheduler,
  });
  await service.makePick({
    userId: "user-1",
    leagueId: fx.league.id,
    poolItemId: fx.poolItems[0].id,
  });

  const expected = new Date("2026-04-10T12:00:30.000Z");
  assertEquals(
    (persistedDeadline as Date | null | undefined)?.getTime(),
    expected.getTime(),
  );
  const turnChange = publisher.published.find((p) =>
    p.event.type === "draft:turn_change"
  );
  if (turnChange && turnChange.event.type === "draft:turn_change") {
    assertEquals(turnChange.event.data.turnDeadline, expected.toISOString());
  } else {
    throw new Error("expected turn_change event");
  }
  assertEquals(scheduler.scheduled.length, 1);
});

Deno.test("draftService.makePick: final pick clears deadline and cancels scheduler", async () => {
  const fx = setupMakePickFakes({ currentPick: 3, numberOfRounds: 2 });
  fx.league.rulesConfig = {
    draftFormat: "snake",
    numberOfRounds: 2,
    pickTimeLimitSeconds: 30,
    poolSizeMultiplier: 2,
  };
  const existingPicks: FakeDraftPick[] = [0, 1, 2].map((i) => ({
    id: crypto.randomUUID(),
    draftId: fx.draft.id,
    leaguePlayerId: i === 0 ? fx.playerA.id : fx.playerB.id,
    poolItemId: fx.poolItems[i].id,
    pickNumber: i,
    pickedAt: new Date(),
    autoPicked: false,
  }));
  let deadlineCleared = false;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
    listPicks: () => Promise.resolve(existingPicks),
    findPickByPoolItem: (_d, poolItemId) =>
      Promise.resolve(
        existingPicks.find((p) => p.poolItemId === poolItemId) ??
          (null as FakeDraftPick | null),
      ),
    incrementCurrentPick: () => Promise.resolve(4),
    updateStatus: (id, status, ts) =>
      Promise.resolve({
        ...fx.draft,
        id,
        status: status as "complete",
        completedAt: ts.completedAt ?? null,
        currentPick: 4,
      }),
    updateTurnDeadline: (_id, d) => {
      if (d === null) deadlineCleared = true;
      return Promise.resolve();
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const publisher = createRecordingPublisher();
  const scheduler = createRecordingScheduler();
  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
    timerScheduler: scheduler,
  });

  await service.makePick({
    userId: "user-1",
    leagueId: fx.league.id,
    poolItemId: fx.poolItems[3].id,
  });

  assertEquals(deadlineCleared, true);
  assertEquals(scheduler.cancelled, [fx.draft.id]);
  // Should not publish a turn_change on the final pick
  assertEquals(
    publisher.published.filter((p) => p.event.type === "draft:turn_change")
      .length,
    0,
  );
});

Deno.test("draftService.runAutoPick: picks highest-BST available item with autoPicked=true", async () => {
  const fx = setupMakePickFakes({ currentPick: 0 });
  fx.league.rulesConfig = {
    draftFormat: "snake",
    numberOfRounds: 2,
    pickTimeLimitSeconds: 10,
    poolSizeMultiplier: 2,
  };
  // Two items: weak (total 100) vs strong (total 700). Put weaker first to
  // make sure we sort, not just "pick first".
  const weakItem = {
    ...fx.poolItems[0],
    metadata: {
      pokemonId: 1,
      types: ["normal"],
      baseStats: {
        hp: 10,
        attack: 20,
        defense: 20,
        specialAttack: 20,
        specialDefense: 20,
        speed: 10,
      },
      generation: "gen-1",
    },
  };
  const strongItem = {
    ...fx.poolItems[1],
    metadata: {
      pokemonId: 150,
      types: ["psychic"],
      baseStats: {
        hp: 106,
        attack: 110,
        defense: 90,
        specialAttack: 154,
        specialDefense: 90,
        speed: 130,
      },
      generation: "gen-1",
    },
  };
  const items = [weakItem, strongItem];

  // Draft with expired deadline
  const draftWithDeadline = {
    ...fx.draft,
    currentTurnDeadline: new Date(Date.now() - 1000),
  };

  let createdPickInput:
    | {
      poolItemId: string;
      autoPicked?: boolean;
      leaguePlayerId: string;
    }
    | null = null;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(draftWithDeadline),
    listPicks: () => Promise.resolve([]),
    createPick: (input) => {
      createdPickInput = input;
      return Promise.resolve({
        id: crypto.randomUUID(),
        draftId: input.draftId,
        leaguePlayerId: input.leaguePlayerId,
        poolItemId: input.poolItemId,
        pickNumber: input.pickNumber,
        pickedAt: new Date(),
        autoPicked: input.autoPicked ?? false,
      });
    },
    incrementCurrentPick: () => Promise.resolve(1),
    updateTurnDeadline: () => Promise.resolve(),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () => Promise.resolve(null as FakePlayer),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(items),
  });
  const publisher = createRecordingPublisher();
  const scheduler = createRecordingScheduler();
  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
    timerScheduler: scheduler,
  });

  await service.runAutoPick({ leagueId: fx.league.id });

  assertEquals(
    (createdPickInput as unknown as { poolItemId: string } | null)?.poolItemId,
    strongItem.id,
  );
  assertEquals(
    (createdPickInput as unknown as { autoPicked?: boolean } | null)
      ?.autoPicked,
    true,
  );
  // playerA (index 0) is the current turn at pick 0
  assertEquals(
    (createdPickInput as unknown as { leaguePlayerId: string } | null)
      ?.leaguePlayerId,
    fx.playerA.id,
  );

  const pickMade = publisher.published.find((p) =>
    p.event.type === "draft:pick_made"
  );
  if (pickMade && pickMade.event.type === "draft:pick_made") {
    assertEquals(pickMade.event.data.autoPicked, true);
  } else {
    throw new Error("expected pick_made event");
  }
  assertEquals(
    publisher.published.some((p) => p.event.type === "draft:turn_change"),
    true,
  );
});

Deno.test("draftService.runAutoPick: no-op when deadline not yet passed", async () => {
  const fx = setupMakePickFakes({ currentPick: 0 });
  const draftWithFutureDeadline = {
    ...fx.draft,
    currentTurnDeadline: new Date(Date.now() + 60_000),
  };
  let createCalled = false;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(draftWithFutureDeadline),
    listPicks: () => Promise.resolve([]),
    createPick: (input) => {
      createCalled = true;
      return Promise.resolve({
        id: crypto.randomUUID(),
        draftId: input.draftId,
        leaguePlayerId: input.leaguePlayerId,
        poolItemId: input.poolItemId,
        pickNumber: input.pickNumber,
        pickedAt: new Date(),
        autoPicked: true,
      });
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  await service.runAutoPick({ leagueId: fx.league.id });

  assertEquals(createCalled, false);
});

Deno.test("draftService.runAutoPick: no-op when draft not in_progress", async () => {
  const fx = setupMakePickFakes({ currentPick: 0, draftStatus: "complete" });
  const draft = {
    ...fx.draft,
    currentTurnDeadline: new Date(Date.now() - 1000),
  };
  let createCalled = false;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(draft),
    listPicks: () => Promise.resolve([]),
    createPick: (input) => {
      createCalled = true;
      return Promise.resolve({
        id: crypto.randomUUID(),
        draftId: input.draftId,
        leaguePlayerId: input.leaguePlayerId,
        poolItemId: input.poolItemId,
        pickNumber: input.pickNumber,
        pickedAt: new Date(),
        autoPicked: true,
      });
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  await service.runAutoPick({ leagueId: fx.league.id });

  assertEquals(createCalled, false);
});

Deno.test("draftService.runAutoPick: completing auto-pick publishes draft:completed", async () => {
  const fx = setupMakePickFakes({ currentPick: 3, numberOfRounds: 2 });
  const draft = {
    ...fx.draft,
    currentTurnDeadline: new Date(Date.now() - 1000),
  };
  const existingPicks: FakeDraftPick[] = [0, 1, 2].map((i) => ({
    id: crypto.randomUUID(),
    draftId: fx.draft.id,
    leaguePlayerId: i === 0 ? fx.playerA.id : fx.playerB.id,
    poolItemId: fx.poolItems[i].id,
    pickNumber: i,
    pickedAt: new Date(),
    autoPicked: false,
  }));
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(draft),
    listPicks: () => Promise.resolve(existingPicks),
    incrementCurrentPick: () => Promise.resolve(4),
    updateStatus: (id, status, ts) =>
      Promise.resolve({
        ...draft,
        id,
        status: status as "complete",
        completedAt: ts.completedAt ?? null,
        currentPick: 4,
      }),
    updateTurnDeadline: () => Promise.resolve(),
    createPick: (input) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        draftId: input.draftId,
        leaguePlayerId: input.leaguePlayerId,
        poolItemId: input.poolItemId,
        pickNumber: input.pickNumber,
        pickedAt: new Date(),
        autoPicked: true,
      }),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const publisher = createRecordingPublisher();
  const scheduler = createRecordingScheduler();
  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
    timerScheduler: scheduler,
  });

  await service.runAutoPick({ leagueId: fx.league.id });

  assertEquals(
    publisher.published.some((p) => p.event.type === "draft:completed"),
    true,
  );
  assertEquals(scheduler.cancelled, [draft.id]);
});

// --- pauseDraft ----------------------------------------------------------

function setupCommissionerFakes(opts: {
  draftStatus?: "pending" | "in_progress" | "paused" | "complete";
  currentPick?: number;
  pickTimeLimitSeconds?: number | null;
  completedAt?: Date | null;
}) {
  const league = createFakeLeague({
    status: "drafting",
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 2,
      pickTimeLimitSeconds: "pickTimeLimitSeconds" in opts
        ? opts.pickTimeLimitSeconds
        : 60,
      poolSizeMultiplier: 2,
    },
  });
  const pool = createFakePool(league.id);
  const playerA = createLeaguePlayerRow(league.id, "user-1", "commissioner");
  const playerB = createLeaguePlayerRow(league.id, "user-2", "member");
  const poolItems = [
    createFakePoolItem(pool.id, { name: "pikachu" }),
    createFakePoolItem(pool.id, { name: "charmander" }),
    createFakePoolItem(pool.id, { name: "bulbasaur" }),
    createFakePoolItem(pool.id, { name: "squirtle" }),
  ];
  const draft = createFakeDraft({
    leagueId: league.id,
    poolId: pool.id,
    status: opts.draftStatus ?? "in_progress",
    pickOrder: [playerA.id, playerB.id],
    currentPick: opts.currentPick ?? 1,
    startedAt: new Date("2026-04-10T00:00:00.000Z"),
    completedAt: opts.completedAt ?? null,
    currentTurnDeadline: opts.draftStatus === "paused"
      ? null
      : new Date("2026-04-10T00:00:30.000Z"),
  });
  return { league, pool, playerA, playerB, poolItems, draft };
}

Deno.test("draftService.pauseDraft: commissioner pauses in_progress draft → status paused, deadline cleared, timer cancelled, event published", async () => {
  const fx = setupCommissionerFakes({
    draftStatus: "in_progress",
    currentPick: 1,
  });
  let paused = false;
  let pausedAtArg: Date | undefined;
  let deadlineCleared = false;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
    listPicks: () => Promise.resolve([]),
    pauseDraft: (_id, pausedAt) => {
      paused = true;
      pausedAtArg = pausedAt;
      return Promise.resolve({
        ...fx.draft,
        status: "paused",
        pausedAt,
        currentTurnDeadline: null,
      });
    },
    updateTurnDeadline: (_id, d) => {
      if (d === null) deadlineCleared = true;
      return Promise.resolve();
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const publisher = createRecordingPublisher();
  const clock = createFixedClock("2026-04-10T00:00:15.000Z");
  const scheduler = createRecordingScheduler();

  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
    clock,
    timerScheduler: scheduler,
  });
  const state = await service.pauseDraft({
    userId: "user-1",
    leagueId: fx.league.id,
  });

  assertEquals(paused, true);
  assertEquals(
    pausedAtArg?.getTime(),
    new Date("2026-04-10T00:00:15.000Z").getTime(),
  );
  assertEquals(state.draft.status, "paused");
  assertEquals(state.draft.currentTurnDeadline, null);
  assertEquals(scheduler.cancelled, [fx.draft.id]);
  // pauseDraft repo call clears deadline on its own; service may or may not
  // additionally call updateTurnDeadline. Either is fine.
  assertEquals(deadlineCleared || paused, true);
  assertEquals(publisher.published[0].event.type, "draft:paused");
});

Deno.test("draftService.pauseDraft: non-commissioner → FORBIDDEN", async () => {
  const fx = setupCommissionerFakes({ draftStatus: "in_progress" });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerB, leagueId: fx.league.id }),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () => service.pauseDraft({ userId: "user-2", leagueId: fx.league.id }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("draftService.pauseDraft: draft not in_progress → BAD_REQUEST", async () => {
  const fx = setupCommissionerFakes({ draftStatus: "pending" });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () => service.pauseDraft({ userId: "user-1", leagueId: fx.league.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftService.pauseDraft: already paused → BAD_REQUEST", async () => {
  const fx = setupCommissionerFakes({ draftStatus: "paused" });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () => service.pauseDraft({ userId: "user-1", leagueId: fx.league.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftService.pauseDraft: complete draft → BAD_REQUEST", async () => {
  const fx = setupCommissionerFakes({
    draftStatus: "complete",
    completedAt: new Date(),
  });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () => service.pauseDraft({ userId: "user-1", leagueId: fx.league.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

// --- resumeDraft ---------------------------------------------------------

Deno.test("draftService.resumeDraft: commissioner resumes paused draft → fresh deadline, scheduler scheduled, resumed+turn_change events", async () => {
  const fx = setupCommissionerFakes({
    draftStatus: "paused",
    currentPick: 1,
    pickTimeLimitSeconds: 60,
  });
  let resumedDeadline: Date | null | undefined;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
    listPicks: () => Promise.resolve([]),
    resumeDraft: (_id, deadline) => {
      resumedDeadline = deadline;
      return Promise.resolve({
        ...fx.draft,
        status: "in_progress",
        pausedAt: null,
        currentTurnDeadline: deadline,
      });
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const publisher = createRecordingPublisher();
  const clock = createFixedClock("2026-04-10T01:00:00.000Z");
  const scheduler = createRecordingScheduler();
  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
    clock,
    timerScheduler: scheduler,
  });

  const state = await service.resumeDraft({
    userId: "user-1",
    leagueId: fx.league.id,
  });

  const expected = new Date("2026-04-10T01:01:00.000Z");
  assertEquals(resumedDeadline?.getTime(), expected.getTime());
  assertEquals(state.draft.status, "in_progress");
  assertEquals(state.draft.currentTurnDeadline, expected.toISOString());
  assertEquals(scheduler.scheduled.length, 1);
  assertEquals(
    scheduler.scheduled[0].deadline?.getTime(),
    expected.getTime(),
  );
  const types = publisher.published.map((p) => p.event.type);
  assertEquals(types.includes("draft:resumed"), true);
  assertEquals(types.includes("draft:turn_change"), true);
});

Deno.test("draftService.resumeDraft: non-commissioner → FORBIDDEN", async () => {
  const fx = setupCommissionerFakes({ draftStatus: "paused" });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerB, leagueId: fx.league.id }),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () => service.resumeDraft({ userId: "user-2", leagueId: fx.league.id }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("draftService.resumeDraft: draft not paused → BAD_REQUEST", async () => {
  const fx = setupCommissionerFakes({ draftStatus: "in_progress" });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });

  const error = await assertRejects(
    () => service.resumeDraft({ userId: "user-1", leagueId: fx.league.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftService.resumeDraft: null pickTimeLimitSeconds → deadline stays null, still transitions", async () => {
  const fx = setupCommissionerFakes({
    draftStatus: "paused",
    pickTimeLimitSeconds: null,
  });
  let resumedDeadline: Date | null | undefined = undefined;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
    listPicks: () => Promise.resolve([]),
    resumeDraft: (_id, deadline) => {
      resumedDeadline = deadline;
      return Promise.resolve({
        ...fx.draft,
        status: "in_progress",
        pausedAt: null,
        currentTurnDeadline: deadline,
      });
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });
  const state = await service.resumeDraft({
    userId: "user-1",
    leagueId: fx.league.id,
  });
  assertEquals(resumedDeadline, null);
  assertEquals(state.draft.status, "in_progress");
  assertEquals(state.draft.currentTurnDeadline, null);
});

// --- undoLastPick --------------------------------------------------------

Deno.test("draftService.undoLastPick: in_progress → removes pick, decrements currentPick, publishes pick_undone + turn_change, reschedules timer", async () => {
  const fx = setupCommissionerFakes({
    draftStatus: "in_progress",
    currentPick: 2,
  });
  const lastPick: FakeDraftPick = {
    id: crypto.randomUUID(),
    draftId: fx.draft.id,
    leaguePlayerId: fx.playerB.id,
    poolItemId: fx.poolItems[1].id,
    pickNumber: 1,
    pickedAt: new Date(),
    autoPicked: false,
  };
  let undoCalled = false;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
    listPicks: () => Promise.resolve([]),
    findLastPick: () => Promise.resolve(lastPick),
    undoLastPick: (_id) => {
      undoCalled = true;
      return Promise.resolve({ pick: lastPick, currentPick: 1 });
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const publisher = createRecordingPublisher();
  const scheduler = createRecordingScheduler();
  const clock = createFixedClock("2026-04-10T03:00:00.000Z");
  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
    clock,
    timerScheduler: scheduler,
  });

  const state = await service.undoLastPick({
    userId: "user-1",
    leagueId: fx.league.id,
  });

  assertEquals(undoCalled, true);
  assertEquals(state.draft.currentPick, 1);
  const types = publisher.published.map((p) => p.event.type);
  assertEquals(types[0], "draft:pick_undone");
  assertEquals(types.includes("draft:turn_change"), true);
  const undone = publisher.published[0];
  if (undone.event.type === "draft:pick_undone") {
    assertEquals(undone.event.data.pickNumber, 1);
    assertEquals(undone.event.data.poolItemId, fx.poolItems[1].id);
    assertEquals(undone.event.data.leaguePlayerId, fx.playerB.id);
  }
  assertEquals(scheduler.scheduled.length, 1);
});

Deno.test("draftService.undoLastPick: paused → pick removed, status stays paused, no turn_change, no scheduler re-schedule", async () => {
  const fx = setupCommissionerFakes({
    draftStatus: "paused",
    currentPick: 2,
  });
  const lastPick: FakeDraftPick = {
    id: crypto.randomUUID(),
    draftId: fx.draft.id,
    leaguePlayerId: fx.playerB.id,
    poolItemId: fx.poolItems[1].id,
    pickNumber: 1,
    pickedAt: new Date(),
    autoPicked: false,
  };
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
    listPicks: () => Promise.resolve([]),
    findLastPick: () => Promise.resolve(lastPick),
    undoLastPick: (_id) => Promise.resolve({ pick: lastPick, currentPick: 1 }),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const publisher = createRecordingPublisher();
  const scheduler = createRecordingScheduler();
  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
    timerScheduler: scheduler,
  });
  const state = await service.undoLastPick({
    userId: "user-1",
    leagueId: fx.league.id,
  });
  assertEquals(state.draft.status, "paused");
  const types = publisher.published.map((p) => p.event.type);
  assertEquals(types.includes("draft:pick_undone"), true);
  assertEquals(types.includes("draft:turn_change"), false);
  assertEquals(scheduler.scheduled.length, 0);
});

Deno.test("draftService.undoLastPick: complete → pick removed, status flipped to in_progress, completedAt cleared, fresh deadline, turn_change emitted", async () => {
  const fx = setupCommissionerFakes({
    draftStatus: "complete",
    currentPick: 4,
    completedAt: new Date("2026-04-10T05:00:00.000Z"),
    pickTimeLimitSeconds: 60,
  });
  const lastPick: FakeDraftPick = {
    id: crypto.randomUUID(),
    draftId: fx.draft.id,
    leaguePlayerId: fx.playerA.id,
    poolItemId: fx.poolItems[3].id,
    pickNumber: 3,
    pickedAt: new Date(),
    autoPicked: false,
  };
  let reopenCalled = false;
  let reopenDeadline: Date | null | undefined;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
    listPicks: () => Promise.resolve([]),
    findLastPick: () => Promise.resolve(lastPick),
    undoLastPick: (_id) => Promise.resolve({ pick: lastPick, currentPick: 3 }),
    reopenCompletedDraft: (_id, deadline) => {
      reopenCalled = true;
      reopenDeadline = deadline;
      return Promise.resolve({
        ...fx.draft,
        status: "in_progress",
        completedAt: null,
        currentPick: 3,
        currentTurnDeadline: deadline,
      });
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
    findPlayersByLeagueId: () => Promise.resolve([fx.playerA, fx.playerB]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const publisher = createRecordingPublisher();
  const scheduler = createRecordingScheduler();
  const clock = createFixedClock("2026-04-10T06:00:00.000Z");
  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
    clock,
    timerScheduler: scheduler,
  });
  const state = await service.undoLastPick({
    userId: "user-1",
    leagueId: fx.league.id,
  });
  assertEquals(reopenCalled, true);
  const expected = new Date("2026-04-10T06:01:00.000Z");
  assertEquals(reopenDeadline?.getTime(), expected.getTime());
  assertEquals(state.draft.status, "in_progress");
  assertEquals(state.draft.completedAt, null);
  assertEquals(state.draft.currentTurnDeadline, expected.toISOString());
  const types = publisher.published.map((p) => p.event.type);
  assertEquals(types.includes("draft:pick_undone"), true);
  assertEquals(types.includes("draft:turn_change"), true);
  assertEquals(scheduler.scheduled.length, 1);
});

Deno.test("draftService.undoLastPick: non-commissioner → FORBIDDEN", async () => {
  const fx = setupCommissionerFakes({ draftStatus: "in_progress" });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerB, leagueId: fx.league.id }),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });
  const error = await assertRejects(
    () => service.undoLastPick({ userId: "user-2", leagueId: fx.league.id }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("draftService.undoLastPick: no picks to undo → BAD_REQUEST", async () => {
  const fx = setupCommissionerFakes({
    draftStatus: "in_progress",
    currentPick: 0,
  });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
    findLastPick: () => Promise.resolve(null as FakeDraftPick | null),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });
  const error = await assertRejects(
    () => service.undoLastPick({ userId: "user-1", leagueId: fx.league.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftService.undoLastPick: pending draft → BAD_REQUEST", async () => {
  const fx = setupCommissionerFakes({ draftStatus: "pending" });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(fx.draft),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(fx.league),
    findPlayer: () =>
      Promise.resolve({ ...fx.playerA, leagueId: fx.league.id }),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(fx.pool),
    findItemsByPoolId: () => Promise.resolve(fx.poolItems),
  });
  const service = createDraftService({ draftRepo, leagueRepo, draftPoolRepo });
  const error = await assertRejects(
    () => service.undoLastPick({ userId: "user-1", leagueId: fx.league.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

// --- NPC auto-pick --------------------------------------------------------

interface RecordingNpcScheduler {
  scheduled: Array<{ draftId: string; leagueId: string; delayMs: number }>;
  cancelled: string[];
  schedule(draftId: string, leagueId: string, delayMs: number): void;
  cancel(draftId: string): void;
  triggerNowForTest(draftId: string): Promise<void>;
  setHandler(): void;
  activeTimerCount(): number;
}

function createRecordingNpcScheduler(): RecordingNpcScheduler {
  return {
    scheduled: [],
    cancelled: [],
    schedule(draftId, leagueId, delayMs) {
      this.scheduled.push({ draftId, leagueId, delayMs });
    },
    cancel(draftId) {
      this.cancelled.push(draftId);
    },
    triggerNowForTest: () => Promise.resolve(),
    setHandler: () => {},
    activeTimerCount: () => 0,
  };
}

Deno.test("draftService.makePick: schedules NPC pick when next player is an NPC", async () => {
  // Human picks first, NPC is next on the clock after this human pick lands.
  const league = createFakeLeague({
    status: "drafting",
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 2,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
    },
  });
  const pool = createFakePool(league.id);
  const human = createLeaguePlayerRow(league.id, "user-1", "commissioner");
  const npc = createLeaguePlayerRow(league.id, "npc-oak", "member", true);
  const poolItems = [
    createFakePoolItem(pool.id, { name: "pikachu" }),
    createFakePoolItem(pool.id, { name: "charmander" }),
    createFakePoolItem(pool.id, { name: "bulbasaur" }),
    createFakePoolItem(pool.id, { name: "squirtle" }),
  ];
  const draft = createFakeDraft({
    leagueId: league.id,
    poolId: pool.id,
    status: "in_progress",
    pickOrder: [human.id, npc.id],
    currentPick: 0,
    startedAt: new Date(),
  });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(draft),
    listPicks: () => Promise.resolve([]),
    incrementCurrentPick: () => Promise.resolve(1),
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(league),
    findPlayer: () => Promise.resolve({ ...human, leagueId: league.id }),
    findPlayersByLeagueId: () => Promise.resolve([human, npc]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(pool),
    findItemsByPoolId: () => Promise.resolve(poolItems),
  });
  const npcScheduler = createRecordingNpcScheduler();

  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    npcScheduler,
    randomFn: () => 0.5,
  });

  await service.makePick({
    userId: "user-1",
    leagueId: league.id,
    poolItemId: poolItems[0].id,
  });

  assertEquals(npcScheduler.scheduled.length, 1);
  assertEquals(npcScheduler.scheduled[0].draftId, draft.id);
  assertEquals(npcScheduler.scheduled[0].leagueId, league.id);
  const delay = npcScheduler.scheduled[0].delayMs;
  assertEquals(delay >= 300 && delay <= 1500, true);
});

Deno.test("draftService.runNpcPick: creates random autoPicked pick and emits pick_made", async () => {
  const league = createFakeLeague({
    status: "drafting",
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 2,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
    },
  });
  const pool = createFakePool(league.id);
  const human = createLeaguePlayerRow(league.id, "user-1", "commissioner");
  const npc = createLeaguePlayerRow(league.id, "npc-oak", "member", true);
  const poolItems = [
    createFakePoolItem(pool.id, { name: "pikachu" }),
    createFakePoolItem(pool.id, { name: "charmander" }),
    createFakePoolItem(pool.id, { name: "bulbasaur" }),
    createFakePoolItem(pool.id, { name: "squirtle" }),
  ];
  // NPC is on the clock (currentPick=1).
  const draft = createFakeDraft({
    leagueId: league.id,
    poolId: pool.id,
    status: "in_progress",
    pickOrder: [human.id, npc.id],
    currentPick: 1,
    startedAt: new Date(),
  });
  let createdPick: CreatePickInput | null = null;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(draft),
    listPicks: () => Promise.resolve([]),
    incrementCurrentPick: () => Promise.resolve(2),
    createPick: (input) => {
      createdPick = input;
      return Promise.resolve({
        id: crypto.randomUUID(),
        draftId: input.draftId,
        leaguePlayerId: input.leaguePlayerId,
        poolItemId: input.poolItemId,
        pickNumber: input.pickNumber,
        pickedAt: new Date(),
        autoPicked: input.autoPicked ?? false,
      });
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(league),
    findPlayersByLeagueId: () => Promise.resolve([human, npc]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(pool),
    findItemsByPoolId: () => Promise.resolve(poolItems),
  });
  const publisher = createRecordingPublisher();
  const npcScheduler = createRecordingNpcScheduler();

  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    draftEventPublisher: publisher,
    npcScheduler,
    // Deterministic randomFn: picks index 0 of the 4-item available pool.
    randomFn: () => 0,
  });

  await service.runNpcPick({ leagueId: league.id });

  assertEquals(createdPick !== null, true);
  assertEquals(createdPick!.leaguePlayerId, npc.id);
  assertEquals(createdPick!.autoPicked, true);
  assertEquals(createdPick!.poolItemId, poolItems[0].id);
  const pickEvent = publisher.published.find((p) =>
    p.event.type === "draft:pick_made"
  );
  assertEquals(pickEvent !== undefined, true);
});

Deno.test("draftService.runNpcPick: no-op when current player is not an NPC", async () => {
  const league = createFakeLeague({ status: "drafting" });
  const pool = createFakePool(league.id);
  const human = createLeaguePlayerRow(league.id, "user-1", "commissioner");
  const poolItems = [createFakePoolItem(pool.id)];
  const draft = createFakeDraft({
    leagueId: league.id,
    poolId: pool.id,
    status: "in_progress",
    pickOrder: [human.id],
    currentPick: 0,
    startedAt: new Date(),
  });
  let createPickCalled = false;
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: () => Promise.resolve(draft),
    listPicks: () => Promise.resolve([]),
    createPick: (input) => {
      createPickCalled = true;
      return Promise.resolve({
        id: crypto.randomUUID(),
        draftId: input.draftId,
        leaguePlayerId: input.leaguePlayerId,
        poolItemId: input.poolItemId,
        pickNumber: input.pickNumber,
        pickedAt: new Date(),
        autoPicked: false,
      });
    },
  });
  const leagueRepo = createFakeLeagueRepo({
    findById: () => Promise.resolve(league),
    findPlayersByLeagueId: () => Promise.resolve([human]),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: () => Promise.resolve(pool),
    findItemsByPoolId: () => Promise.resolve(poolItems),
  });
  const service = createDraftService({
    draftRepo,
    leagueRepo,
    draftPoolRepo,
    npcScheduler: createRecordingNpcScheduler(),
  });

  await service.runNpcPick({ leagueId: league.id });

  assertEquals(createPickCalled, false);
});
