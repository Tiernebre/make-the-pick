import type { DraftEvent } from "@make-the-pick/shared";
import type { DraftPoolRepository } from "../draft-pool/draft-pool.repository.ts";
import type { LeagueRepository } from "../league/league.repository.ts";
import type { WatchlistRepository } from "../watchlist/watchlist.repository.ts";
import type { DraftEventPublisher } from "./draft.events.ts";
import type { CreateDraftInput, DraftRepository } from "./draft.repository.ts";

export function createFakeWatchlistRepo(
  overrides: Partial<WatchlistRepository> = {},
): WatchlistRepository {
  return {
    findByLeaguePlayerId: (_leaguePlayerId) => Promise.resolve([]),
    findByLeaguePlayerIdAndDraftPoolItemId: (_l, _d) => Promise.resolve(null),
    getMaxPosition: (_leaguePlayerId) => Promise.resolve(null),
    create: (data) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leaguePlayerId: data.leaguePlayerId,
        draftPoolItemId: data.draftPoolItemId,
        position: data.position,
        createdAt: new Date(),
      }),
    deleteByLeaguePlayerIdAndDraftPoolItemId: (_l, _d) => Promise.resolve(),
    replaceAllPositions: (_l, _ids) => Promise.resolve(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Shared type aliases
// ---------------------------------------------------------------------------

export type FakeLeague = Awaited<ReturnType<LeagueRepository["findById"]>>;
export type FakePlayer = Awaited<ReturnType<LeagueRepository["findPlayer"]>>;
export type FakeDraft = Awaited<ReturnType<DraftRepository["findByLeagueId"]>>;
export type FakeDraftPick = Awaited<
  ReturnType<DraftRepository["listPicks"]>
>[number];
export type FakePool = Awaited<
  ReturnType<DraftPoolRepository["findByLeagueId"]>
>;
export type FakePoolItem = Awaited<
  ReturnType<DraftPoolRepository["findItemsByPoolId"]>
>[number];

// ---------------------------------------------------------------------------
// Object builders
// ---------------------------------------------------------------------------

export function createFakeLeague(
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

export function createFakeDraft(
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

export function createFakePool(
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

export function createFakePoolItem(
  draftPoolId: string,
  overrides: Partial<FakePoolItem> = {},
): FakePoolItem {
  return {
    id: crypto.randomUUID(),
    draftPoolId,
    name: "pikachu",
    thumbnailUrl: null,
    metadata: null,
    revealOrder: 0,
    revealedAt: null,
    ...overrides,
  };
}

export function createLeaguePlayerRow(
  _leagueId: string,
  userId: string,
  role: "commissioner" | "member" = "member",
  isNpc = false,
  npcStrategy: string | null = null,
): {
  id: string;
  userId: string;
  name: string;
  image: string | null;
  isNpc: boolean;
  npcStrategy: string | null;
  role: "commissioner" | "member";
  joinedAt: Date;
} {
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

// ---------------------------------------------------------------------------
// Fake repository factories
// ---------------------------------------------------------------------------

export function createFakeLeagueRepo(
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

export function createFakeDraftRepo(
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

export function createFakeDraftPoolRepo(
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
    findItemsByPoolId: (_poolId, _opts) => Promise.resolve([]),
    countUnrevealedItems: (_poolId) => Promise.resolve(0),
    revealNextItem: (_poolId, _now) => Promise.resolve(null),
    revealAllItems: (_poolId, _now) => Promise.resolve(0),
    deleteByLeagueId: (_leagueId) => Promise.resolve(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Recording publisher
// ---------------------------------------------------------------------------

export interface PublishedEvent {
  leagueId: string;
  event: DraftEvent;
}

export function createRecordingPublisher(): DraftEventPublisher & {
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

// ---------------------------------------------------------------------------
// Fixed-clock helper
// ---------------------------------------------------------------------------

export function createFixedClock(isoStart: string): {
  now: () => Date;
  advance: (ms: number) => void;
  set: (date: Date) => void;
} {
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

// ---------------------------------------------------------------------------
// Recording scheduler (turn-timeout scheduler)
// ---------------------------------------------------------------------------

export interface RecordingScheduler {
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

export function createRecordingScheduler(): RecordingScheduler {
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

// ---------------------------------------------------------------------------
// Recording NPC scheduler
// ---------------------------------------------------------------------------

export interface RecordingNpcScheduler {
  scheduled: Array<{ draftId: string; leagueId: string; delayMs: number }>;
  cancelled: string[];
  schedule(draftId: string, leagueId: string, delayMs: number): void;
  cancel(draftId: string): void;
  triggerNowForTest(draftId: string): Promise<void>;
  setHandler(): void;
  activeTimerCount(): number;
}

export function createRecordingNpcScheduler(): RecordingNpcScheduler {
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

// ---------------------------------------------------------------------------
// High-level scenario builders
// ---------------------------------------------------------------------------

export function setupMakePickFakes(opts: {
  leagueStatus?: "setup" | "drafting" | "competing" | "complete";
  draftStatus?: "pending" | "in_progress" | "complete";
  currentPick?: number;
  numberOfRounds?: number;
  pickedPoolItemIds?: string[];
  pickerUserId?: string;
  useFirstPickerAsCurrent?: boolean;
}): {
  league: NonNullable<FakeLeague>;
  pool: NonNullable<FakePool>;
  playerA: ReturnType<typeof createLeaguePlayerRow>;
  playerB: ReturnType<typeof createLeaguePlayerRow>;
  poolItems: FakePoolItem[];
  draft: NonNullable<FakeDraft>;
  picks: FakeDraftPick[];
} {
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

export function setupCommissionerFakes(opts: {
  draftStatus?: "pending" | "in_progress" | "paused" | "complete";
  currentPick?: number;
  pickTimeLimitSeconds?: number | null;
  completedAt?: Date | null;
}): {
  league: NonNullable<FakeLeague>;
  pool: NonNullable<FakePool>;
  playerA: ReturnType<typeof createLeaguePlayerRow>;
  playerB: ReturnType<typeof createLeaguePlayerRow>;
  poolItems: FakePoolItem[];
  draft: NonNullable<FakeDraft>;
} {
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
