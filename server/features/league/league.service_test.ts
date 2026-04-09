import { assertEquals, assertRejects } from "@std/assert";
import { TRPCError } from "@trpc/server";
import { createLeagueService } from "./league.service.ts";
import type { LeagueRepository } from "./league.repository.ts";
import type { DraftRepository } from "../draft/draft.repository.ts";
import type { DraftPoolService } from "../draft-pool/draft-pool.service.ts";

type FakeLeague = Awaited<ReturnType<LeagueRepository["findById"]>>;
type FakePlayer = Awaited<ReturnType<LeagueRepository["findPlayer"]>>;
type FakeDraft = Awaited<ReturnType<DraftRepository["findByLeagueId"]>>;

function createFakeLeague(
  overrides: Partial<NonNullable<FakeLeague>> = {},
): NonNullable<FakeLeague> {
  return {
    id: crypto.randomUUID(),
    name: "Test League",
    status: "setup",
    sportType: null,
    rulesConfig: null,
    maxPlayers: null,
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

function createFakeRepo(
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
    ...overrides,
  };
}

function createFakeDraftPoolService(
  overrides: Partial<DraftPoolService> = {},
): DraftPoolService {
  return {
    generate: (_userId, _input) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: _input.leagueId,
        name: "Draft Pool",
        createdAt: new Date(),
        items: [],
      }),
    getByLeagueId: (_userId, _leagueId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: _leagueId,
        name: "Draft Pool",
        createdAt: new Date(),
        items: [],
      }),
    ...overrides,
  };
}

Deno.test("leagueService.create: creates a league with generated invite code", async () => {
  let capturedData: { name: string; inviteCode: string } | undefined;
  const repo = createFakeRepo({
    createWithCommissioner: (_userId, data) => {
      capturedData = data as { name: string; inviteCode: string };
      return Promise.resolve(
        createFakeLeague({ name: data.name, inviteCode: data.inviteCode }),
      );
    },
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });
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

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });
  const result = await service.getById(fakeLeague.id);
  assertEquals(result.name, "Found League");
});

Deno.test("leagueService.getById: throws NOT_FOUND when missing", async () => {
  const repo = createFakeRepo();
  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

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

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });
  const result = await service.join("user-2", "JOIN1234");
  assertEquals(result.id, fakeLeague.id);
});

Deno.test("leagueService.join: throws NOT_FOUND for invalid invite code", async () => {
  const repo = createFakeRepo();
  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.join("user-1", "BADCODE1"),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("leagueService.delete: deletes a league when user is the commissioner", async () => {
  const fakeLeague = createFakeLeague();
  let deletedId: string | undefined;
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
    deleteById: (id) => {
      deletedId = id;
      return Promise.resolve();
    },
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });
  await service.delete("user-1", fakeLeague.id);
  assertEquals(deletedId, fakeLeague.id);
});

Deno.test("leagueService.delete: throws NOT_FOUND when league does not exist", async () => {
  const repo = createFakeRepo();
  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.delete("user-1", "nonexistent"),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("leagueService.delete: throws FORBIDDEN when user is not the commissioner", async () => {
  const fakeLeague = createFakeLeague();
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-2",
        role: "member" as const,
        joinedAt: new Date(),
      }),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.delete("user-2", fakeLeague.id),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("leagueService.listPlayers: returns players for a league", async () => {
  const fakeLeague = createFakeLeague();
  const fakePlayers = [
    {
      id: crypto.randomUUID(),
      userId: "user-1",
      name: "Commissioner",
      image: "https://example.com/avatar1.png",
      role: "commissioner" as const,
      joinedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      userId: "user-2",
      name: "Member",
      image: null,
      role: "member" as const,
      joinedAt: new Date(),
    },
  ];
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayersByLeagueId: (_leagueId) => Promise.resolve(fakePlayers),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });
  const result = await service.listPlayers(fakeLeague.id);
  assertEquals(result.length, 2);
  assertEquals(result[0].name, "Commissioner");
  assertEquals(result[1].name, "Member");
});

Deno.test("leagueService.listPlayers: throws NOT_FOUND when league does not exist", async () => {
  const repo = createFakeRepo();
  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.listPlayers("nonexistent"),
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
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.join("user-1", fakeLeague.inviteCode),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

const validSettingsInput = {
  leagueId: crypto.randomUUID(),
  sportType: "pokemon" as const,
  maxPlayers: 8,
  rulesConfig: {
    draftFormat: "snake" as const,
    numberOfRounds: 10,
    pickTimeLimitSeconds: null,
  },
};

Deno.test("leagueService.updateSettings: updates settings when user is commissioner and league is in setup", async () => {
  const fakeLeague = createFakeLeague({ id: validSettingsInput.leagueId });
  let capturedData:
    | { sportType: string; maxPlayers: number; rulesConfig: unknown }
    | undefined;
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
    updateSettings: (_id, data) => {
      capturedData = data;
      return Promise.resolve(
        createFakeLeague({
          sportType: data.sportType as "pokemon",
          maxPlayers: data.maxPlayers,
          rulesConfig: data.rulesConfig,
        }),
      );
    },
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });
  const result = await service.updateSettings("user-1", validSettingsInput);

  assertEquals(result.sportType, "pokemon");
  assertEquals(result.maxPlayers, 8);
  assertEquals(capturedData?.sportType, "pokemon");
  assertEquals(capturedData?.maxPlayers, 8);
});

Deno.test("leagueService.updateSettings: throws NOT_FOUND when league does not exist", async () => {
  const repo = createFakeRepo();
  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.updateSettings("user-1", validSettingsInput),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("leagueService.updateSettings: throws FORBIDDEN when user is not commissioner", async () => {
  const fakeLeague = createFakeLeague({ id: validSettingsInput.leagueId });
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-2",
        role: "member" as const,
        joinedAt: new Date(),
      }),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.updateSettings("user-2", validSettingsInput),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("leagueService.updateSettings: throws FORBIDDEN when user is not a member", async () => {
  const fakeLeague = createFakeLeague({ id: validSettingsInput.leagueId });
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.updateSettings("user-1", validSettingsInput),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("leagueService.join: throws BAD_REQUEST when league is full", async () => {
  const fakeLeague = createFakeLeague({
    maxPlayers: 2,
    inviteCode: "FULL0001",
  });
  const repo = createFakeRepo({
    findByInviteCode: (_code) => Promise.resolve(fakeLeague),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.join("user-3", "FULL0001"),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("leagueService.join: allows join when under max_players", async () => {
  const fakeLeague = createFakeLeague({
    maxPlayers: 4,
    inviteCode: "OPEN0001",
  });
  const repo = createFakeRepo({
    findByInviteCode: (_code) => Promise.resolve(fakeLeague),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });
  const result = await service.join("user-3", "OPEN0001");
  assertEquals(result.id, fakeLeague.id);
});

Deno.test("leagueService.join: allows join when max_players is null", async () => {
  const fakeLeague = createFakeLeague({
    maxPlayers: null,
    inviteCode: "NOLIM001",
  });
  const repo = createFakeRepo({
    findByInviteCode: (_code) => Promise.resolve(fakeLeague),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });
  const result = await service.join("user-3", "NOLIM001");
  assertEquals(result.id, fakeLeague.id);
});

// --- advanceStatus ---

Deno.test("leagueService.advanceStatus: throws NOT_FOUND when league does not exist", async () => {
  const repo = createFakeRepo();
  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.advanceStatus("user-1", { leagueId: "nonexistent" }),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("leagueService.advanceStatus: throws FORBIDDEN when user is not commissioner", async () => {
  const fakeLeague = createFakeLeague();
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-2",
        role: "member" as const,
        joinedAt: new Date(),
      }),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.advanceStatus("user-2", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("leagueService.advanceStatus: throws FORBIDDEN when user is not a member", async () => {
  const fakeLeague = createFakeLeague();
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.advanceStatus("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("leagueService.advanceStatus: throws BAD_REQUEST when league is already complete", async () => {
  const fakeLeague = createFakeLeague({ status: "complete" });
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.advanceStatus("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("leagueService.advanceStatus: throws BAD_REQUEST when advancing from setup without settings", async () => {
  const fakeLeague = createFakeLeague({
    status: "setup",
    sportType: null,
    rulesConfig: null,
  });
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.advanceStatus("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("leagueService.advanceStatus: throws BAD_REQUEST when advancing from setup without rulesConfig", async () => {
  const fakeLeague = createFakeLeague({
    status: "setup",
    sportType: "pokemon",
    rulesConfig: null,
  });
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.advanceStatus("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("leagueService.advanceStatus: advances from setup to drafting and generates draft pool", async () => {
  const fakeLeague = createFakeLeague({
    status: "setup",
    sportType: "pokemon",
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 10,
      pickTimeLimitSeconds: null,
    },
  });
  let capturedStatus: string | undefined;
  let generateCalledWith: { userId: string; leagueId: string } | undefined;
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
    updateStatus: (_id, status) => {
      capturedStatus = status;
      return Promise.resolve(createFakeLeague({ status: status as "setup" }));
    },
  });
  const draftPoolService = createFakeDraftPoolService({
    generate: (userId, input) => {
      generateCalledWith = { userId, leagueId: input.leagueId };
      return Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: input.leagueId,
        name: "Draft Pool",
        createdAt: new Date(),
        items: [],
      });
    },
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService,
  });
  const result = await service.advanceStatus("user-1", {
    leagueId: fakeLeague.id,
  });

  assertEquals(capturedStatus, "drafting");
  assertEquals(result.status, "drafting");
  assertEquals(generateCalledWith?.userId, "user-1");
  assertEquals(generateCalledWith?.leagueId, fakeLeague.id);
});

Deno.test("leagueService.advanceStatus: does not advance from setup if draft pool generation fails", async () => {
  const fakeLeague = createFakeLeague({
    status: "setup",
    sportType: "pokemon",
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 10,
      pickTimeLimitSeconds: null,
    },
  });
  let statusUpdated = false;
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
    updateStatus: (_id, _status) => {
      statusUpdated = true;
      return Promise.resolve(createFakeLeague());
    },
  });
  const draftPoolService = createFakeDraftPoolService({
    generate: (_userId, _input) => {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "League needs at least 2 players to generate a draft pool",
      });
    },
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService,
  });

  const error = await assertRejects(
    () => service.advanceStatus("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
  assertEquals(statusUpdated, false);
});

Deno.test("leagueService.advanceStatus: advances from drafting to competing when draft is complete", async () => {
  const fakeLeague = createFakeLeague({ status: "drafting" });
  let capturedStatus: string | undefined;
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
    updateStatus: (_id, status) => {
      capturedStatus = status;
      return Promise.resolve(createFakeLeague({ status: status as "setup" }));
    },
  });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_leagueId) =>
      Promise.resolve(
        createFakeDraft({ leagueId: fakeLeague.id, status: "complete" }),
      ),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo,
    draftPoolService: createFakeDraftPoolService(),
  });
  const result = await service.advanceStatus("user-1", {
    leagueId: fakeLeague.id,
  });

  assertEquals(capturedStatus, "competing");
  assertEquals(result.status, "competing");
});

Deno.test("leagueService.advanceStatus: throws BAD_REQUEST when advancing from drafting with no draft", async () => {
  const fakeLeague = createFakeLeague({ status: "drafting" });
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
  });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(null),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo,
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.advanceStatus("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("leagueService.advanceStatus: throws BAD_REQUEST when advancing from drafting with pending draft", async () => {
  const fakeLeague = createFakeLeague({ status: "drafting" });
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
  });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_leagueId) =>
      Promise.resolve(
        createFakeDraft({ leagueId: fakeLeague.id, status: "pending" }),
      ),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo,
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.advanceStatus("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("leagueService.advanceStatus: throws BAD_REQUEST when advancing from drafting with in-progress draft", async () => {
  const fakeLeague = createFakeLeague({ status: "drafting" });
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
  });
  const draftRepo = createFakeDraftRepo({
    findByLeagueId: (_leagueId) =>
      Promise.resolve(
        createFakeDraft({ leagueId: fakeLeague.id, status: "in_progress" }),
      ),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo,
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () => service.advanceStatus("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("leagueService.advanceStatus: advances from competing to complete", async () => {
  const fakeLeague = createFakeLeague({ status: "competing" });
  let capturedStatus: string | undefined;
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "user-1",
        role: "commissioner" as const,
        joinedAt: new Date(),
      }),
    updateStatus: (_id, status) => {
      capturedStatus = status;
      return Promise.resolve(createFakeLeague({ status: status as "setup" }));
    },
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });
  const result = await service.advanceStatus("user-1", {
    leagueId: fakeLeague.id,
  });

  assertEquals(capturedStatus, "complete");
  assertEquals(result.status, "complete");
});

// --- removePlayer ---

Deno.test("leagueService.removePlayer: removes a player when user is commissioner", async () => {
  const fakeLeague = createFakeLeague();
  let deletedLeagueId: string | undefined;
  let deletedUserId: string | undefined;
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (leagueId, userId) => {
      if (userId === "commissioner-1") {
        return Promise.resolve({
          id: crypto.randomUUID(),
          leagueId,
          userId: "commissioner-1",
          role: "commissioner" as const,
          joinedAt: new Date(),
        });
      }
      return Promise.resolve({
        id: crypto.randomUUID(),
        leagueId,
        userId: "member-1",
        role: "member" as const,
        joinedAt: new Date(),
      });
    },
    deletePlayer: (leagueId, userId) => {
      deletedLeagueId = leagueId;
      deletedUserId = userId;
      return Promise.resolve();
    },
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });
  await service.removePlayer("commissioner-1", {
    leagueId: fakeLeague.id,
    playerUserId: "member-1",
  });

  assertEquals(deletedLeagueId, fakeLeague.id);
  assertEquals(deletedUserId, "member-1");
});

Deno.test("leagueService.removePlayer: throws NOT_FOUND when league does not exist", async () => {
  const repo = createFakeRepo();
  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () =>
      service.removePlayer("user-1", {
        leagueId: "nonexistent",
        playerUserId: "user-2",
      }),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("leagueService.removePlayer: throws FORBIDDEN when user is not commissioner", async () => {
  const fakeLeague = createFakeLeague();
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: fakeLeague.id,
        userId: "member-1",
        role: "member" as const,
        joinedAt: new Date(),
      }),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () =>
      service.removePlayer("member-1", {
        leagueId: fakeLeague.id,
        playerUserId: "member-2",
      }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("leagueService.removePlayer: throws FORBIDDEN when user is not a member", async () => {
  const fakeLeague = createFakeLeague();
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () =>
      service.removePlayer("outsider", {
        leagueId: fakeLeague.id,
        playerUserId: "member-1",
      }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("leagueService.removePlayer: throws BAD_REQUEST when trying to remove the commissioner", async () => {
  const fakeLeague = createFakeLeague();
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (leagueId, userId) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId,
        userId,
        role: userId === "commissioner-1"
          ? "commissioner" as const
          : "member" as const,
        joinedAt: new Date(),
      }),
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () =>
      service.removePlayer("commissioner-1", {
        leagueId: fakeLeague.id,
        playerUserId: "commissioner-1",
      }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("leagueService.removePlayer: throws NOT_FOUND when target player is not in league", async () => {
  const fakeLeague = createFakeLeague();
  const repo = createFakeRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, userId) => {
      if (userId === "commissioner-1") {
        return Promise.resolve({
          id: crypto.randomUUID(),
          leagueId: fakeLeague.id,
          userId: "commissioner-1",
          role: "commissioner" as const,
          joinedAt: new Date(),
        });
      }
      return Promise.resolve(null);
    },
  });

  const service = createLeagueService({
    leagueRepo: repo,
    draftRepo: createFakeDraftRepo(),
    draftPoolService: createFakeDraftPoolService(),
  });

  const error = await assertRejects(
    () =>
      service.removePlayer("commissioner-1", {
        leagueId: fakeLeague.id,
        playerUserId: "nonexistent-user",
      }),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});
