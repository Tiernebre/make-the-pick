import { assertEquals, assertRejects } from "@std/assert";
import { TRPCError } from "@trpc/server";
import type { DraftEvent } from "@make-the-pick/shared";
import type { DraftPoolRepository } from "../draft-pool/draft-pool.repository.ts";
import type { LeagueRepository } from "../league/league.repository.ts";
import {
  type CreateDraftInput,
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
) {
  return {
    id: crypto.randomUUID(),
    userId,
    name: userId,
    image: null,
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
    incrementCurrentPick: (_id) => Promise.resolve(1),
    listPicks: (_draftId) => Promise.resolve([]),
    createPick: (_input) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        draftId: _input.draftId,
        leaguePlayerId: _input.leaguePlayerId,
        poolItemId: _input.poolItemId,
        pickNumber: _input.pickNumber,
        pickedAt: new Date(),
      }),
    findPickByPoolItem: (_draftId, _poolItemId) =>
      Promise.resolve(null as FakeDraftPick | null),
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
    },
    {
      id: crypto.randomUUID(),
      draftId: fx.draft.id,
      leaguePlayerId: fx.playerB.id,
      poolItemId: fx.poolItems[1].id,
      pickNumber: 1,
      pickedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      draftId: fx.draft.id,
      leaguePlayerId: fx.playerB.id,
      poolItemId: fx.poolItems[2].id,
      pickNumber: 2,
      pickedAt: new Date(),
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
    },
    {
      id: crypto.randomUUID(),
      draftId: fx.draft.id,
      leaguePlayerId: fx.playerB.id,
      poolItemId: fx.poolItems[1].id,
      pickNumber: 1,
      pickedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      draftId: fx.draft.id,
      leaguePlayerId: fx.playerB.id,
      poolItemId: fx.poolItems[2].id,
      pickNumber: 2,
      pickedAt: new Date(),
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
