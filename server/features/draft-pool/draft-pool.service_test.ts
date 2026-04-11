import { assertEquals, assertRejects } from "@std/assert";
import { TRPCError } from "@trpc/server";
import type {
  Pokemon,
  PokemonEncountersData,
  PokemonEvolutionsData,
  PokemonGiftsData,
  PokemonVersion,
  RegionalPokedexEntry,
  SpeciesPoolItemMetadata,
} from "@make-the-pick/shared";
import type { LeagueRepository } from "../league/league.repository.ts";
import type { DraftPoolRepository } from "./draft-pool.repository.ts";
import { computeEffort, createDraftPoolService } from "./draft-pool.service.ts";

type FakeLeague = Awaited<ReturnType<LeagueRepository["findById"]>>;
type FakePlayer = Awaited<ReturnType<LeagueRepository["findPlayer"]>>;
type FakePool = Awaited<ReturnType<DraftPoolRepository["findByLeagueId"]>>;
type FakePoolItem = Awaited<
  ReturnType<DraftPoolRepository["findItemsByPoolId"]>
>[number];

function createFakeLeague(
  overrides: Partial<NonNullable<FakeLeague>> = {},
): NonNullable<FakeLeague> {
  return {
    id: crypto.randomUUID(),
    name: "Test League",
    status: "setup",
    sportType: "pokemon",
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 5,
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

function createCommissionerPlayer(
  leagueId: string,
  userId = "user-1",
): NonNullable<FakePlayer> {
  return {
    id: crypto.randomUUID(),
    leagueId,
    userId,
    role: "commissioner" as const,
    joinedAt: new Date(),
  };
}

function createMemberPlayer(
  leagueId: string,
  userId = "user-2",
): NonNullable<FakePlayer> {
  return {
    id: crypto.randomUUID(),
    leagueId,
    userId,
    role: "member" as const,
    joinedAt: new Date(),
  };
}

function createFakePokemonData(count: number): Pokemon[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `pokemon-${i + 1}`,
    types: ["normal"],
    baseStats: {
      hp: 50,
      attack: 50,
      defense: 50,
      specialAttack: 50,
      specialDefense: 50,
      speed: 50,
    },
    generation: "generation-i",
    captureRate: 190,
    spriteUrl: `https://example.com/sprite-${i + 1}.png`,
  }));
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
    findAvailableNpcUsers: (_leagueId) => Promise.resolve([]),
    updateSettings: (_id, _data) => Promise.resolve(createFakeLeague()),
    updateStatus: (_id, _status) => Promise.resolve(createFakeLeague()),
    countPlayers: (_leagueId) => Promise.resolve(0),
    ...overrides,
  };
}

function createFakeDraftPoolRepo(
  overrides: Partial<DraftPoolRepository> = {},
): DraftPoolRepository {
  return {
    create: (_leagueId, _name) =>
      Promise.resolve({
        id: crypto.randomUUID(),
        leagueId: _leagueId,
        name: _name,
        createdAt: new Date(),
      }),
    createItems: (items) =>
      Promise.resolve(
        items.map((item) => ({
          id: crypto.randomUUID(),
          draftPoolId: item.draftPoolId as string,
          name: item.name as string,
          thumbnailUrl: (item.thumbnailUrl as string) ?? null,
          metadata: item.metadata ?? null,
          revealOrder: item.revealOrder ?? 0,
          revealedAt: item.revealedAt ?? null,
        })),
      ),
    findByLeagueId: (_leagueId) => Promise.resolve(null as FakePool),
    findItemsByPoolId: (_poolId, _opts) =>
      Promise.resolve([] as FakePoolItem[]),
    countUnrevealedItems: (_poolId) => Promise.resolve(0),
    revealNextItem: (_poolId, _now) => Promise.resolve(null),
    revealAllItems: (_poolId, _now) => Promise.resolve(0),
    deleteByLeagueId: (_leagueId) => Promise.resolve(),
    ...overrides,
  };
}

// --- generate ---

Deno.test("draftPoolService.generate: returns pool with correct number of items", async () => {
  const fakeLeague = createFakeLeague();
  const pokemonData = createFakePokemonData(100);
  let capturedItems: unknown[] = [];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(3),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    createItems: (items) => {
      capturedItems = items;
      return Promise.resolve(
        items.map((item) => ({
          id: crypto.randomUUID(),
          draftPoolId: item.draftPoolId as string,
          name: item.name as string,
          thumbnailUrl: (item.thumbnailUrl as string) ?? null,
          metadata: item.metadata ?? null,
          revealOrder: item.revealOrder ?? 0,
          revealedAt: item.revealedAt ?? null,
        })),
      );
    },
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // 5 rounds * 3 players * 2 multiplier = 30
  assertEquals(result.items.length, 30);
  assertEquals(capturedItems.length, 30);
});

Deno.test("draftPoolService.generate: items are unique (no duplicates)", async () => {
  const fakeLeague = createFakeLeague();
  const pokemonData = createFakePokemonData(100);

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(3),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  const names = result.items.map((i) => i.name);
  assertEquals(names.length, new Set(names).size);
});

Deno.test("draftPoolService.generate: clamps pool size to max pokemon count", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 100,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 3,
    },
  });
  const pokemonData = createFakePokemonData(20);

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(10),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // 100 * 10 * 3 = 3000, clamped to 20
  assertEquals(result.items.length, 20);
});

Deno.test("draftPoolService.generate: throws NOT_FOUND when league does not exist", async () => {
  const leagueRepo = createFakeLeagueRepo();
  const draftPoolRepo = createFakeDraftPoolRepo();
  const pokemonData = createFakePokemonData(10);

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  const error = await assertRejects(
    () => service.generate("user-1", { leagueId: "nonexistent" }),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("draftPoolService.generate: throws BAD_REQUEST when league is not in setup status", async () => {
  const fakeLeague = createFakeLeague({ status: "drafting" });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();
  const pokemonData = createFakePokemonData(10);

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  const error = await assertRejects(
    () => service.generate("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftPoolService.generate: throws FORBIDDEN when user is not commissioner", async () => {
  const fakeLeague = createFakeLeague();
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();
  const pokemonData = createFakePokemonData(10);

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  const error = await assertRejects(
    () => service.generate("user-2", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("draftPoolService.generate: throws FORBIDDEN when user is not a member", async () => {
  const fakeLeague = createFakeLeague();
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();
  const pokemonData = createFakePokemonData(10);

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  const error = await assertRejects(
    () => service.generate("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("draftPoolService.generate: throws BAD_REQUEST when fewer than 2 players", async () => {
  const fakeLeague = createFakeLeague();
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(1),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();
  const pokemonData = createFakePokemonData(10);

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  const error = await assertRejects(
    () => service.generate("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftPoolService.generate: throws BAD_REQUEST when rulesConfig is null", async () => {
  const fakeLeague = createFakeLeague({ rulesConfig: null });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(3),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();
  const pokemonData = createFakePokemonData(10);

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  const error = await assertRejects(
    () => service.generate("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftPoolService.generate: deletes existing pool before creating new one", async () => {
  const fakeLeague = createFakeLeague();
  let deleteCalledForLeague: string | undefined;

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(3),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    deleteByLeagueId: (leagueId) => {
      deleteCalledForLeague = leagueId;
      return Promise.resolve();
    },
  });
  const pokemonData = createFakePokemonData(100);

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  await service.generate("user-1", { leagueId: fakeLeague.id });

  assertEquals(deleteCalledForLeague, fakeLeague.id);
});

Deno.test("draftPoolService.generate: maps Pokemon metadata correctly", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 1.5,
    },
  });
  const pokemonData: Pokemon[] = [{
    id: 25,
    name: "pikachu",
    types: ["electric"],
    baseStats: {
      hp: 35,
      attack: 55,
      defense: 40,
      specialAttack: 50,
      specialDefense: 50,
      speed: 90,
    },
    generation: "generation-i",
    captureRate: 190,
    spriteUrl: "https://example.com/pikachu.png",
  }, {
    id: 6,
    name: "charizard",
    types: ["fire", "flying"],
    baseStats: {
      hp: 78,
      attack: 84,
      defense: 78,
      specialAttack: 109,
      specialDefense: 85,
      speed: 100,
    },
    generation: "generation-i",
    captureRate: 45,
    spriteUrl: "https://example.com/charizard.png",
  }];

  let capturedItems: unknown[] = [];
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    createItems: (items) => {
      capturedItems = items;
      return Promise.resolve(
        items.map((item) => ({
          id: crypto.randomUUID(),
          draftPoolId: item.draftPoolId as string,
          name: item.name as string,
          thumbnailUrl: (item.thumbnailUrl as string) ?? null,
          metadata: item.metadata ?? null,
          revealOrder: item.revealOrder ?? 0,
          revealedAt: item.revealedAt ?? null,
        })),
      );
    },
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  // 1 round * 2 players * 1.5 = 3, clamped to 2 (only 2 pokemon)
  await service.generate("user-1", { leagueId: fakeLeague.id });

  assertEquals(capturedItems.length, 2);

  // Items should contain the Pokemon data in metadata
  const item = capturedItems.find(
    (i: unknown) => (i as { name: string }).name === "pikachu",
  ) as {
    name: string;
    thumbnailUrl: string;
    metadata: {
      pokemonId: number;
      types: string[];
      baseStats: { hp: number };
      generation: string;
    };
  };
  assertEquals(item.thumbnailUrl, "https://example.com/pikachu.png");
  assertEquals(item.metadata.pokemonId, 25);
  assertEquals(item.metadata.types, ["electric"]);
  assertEquals(item.metadata.baseStats.hp, 35);
  assertEquals(item.metadata.generation, "generation-i");
});

Deno.test("draftPoolService.generate: defaults poolSizeMultiplier to 2 when not set", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 5,
      pickTimeLimitSeconds: null,
      // no poolSizeMultiplier
    },
  });
  const pokemonData = createFakePokemonData(100);

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(3),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // 5 rounds * 3 players * 2 (default) = 30
  assertEquals(result.items.length, 30);
});

// --- getByLeagueId ---

Deno.test("draftPoolService.getByLeagueId: returns pool with items", async () => {
  const fakeLeague = createFakeLeague();
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pokemon Pool",
    createdAt: new Date(),
  };
  const fakeItems = [
    {
      id: crypto.randomUUID(),
      draftPoolId: fakePool.id,
      name: "pikachu",
      thumbnailUrl: null,
      metadata: null,
      revealOrder: 0,
      revealedAt: null,
    },
  ];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    findItemsByPoolId: (_poolId) => Promise.resolve(fakeItems),
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: [],
  });

  const result = await service.getByLeagueId("user-2", fakeLeague.id);
  assertEquals(result.id, fakePool.id);
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].name, "pikachu");
});

Deno.test("draftPoolService.getByLeagueId: throws NOT_FOUND when league missing", async () => {
  const leagueRepo = createFakeLeagueRepo();
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: [],
  });

  const error = await assertRejects(
    () => service.getByLeagueId("user-1", "nonexistent"),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

Deno.test("draftPoolService.getByLeagueId: throws FORBIDDEN when user not a member", async () => {
  const fakeLeague = createFakeLeague();
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: [],
  });

  const error = await assertRejects(
    () => service.getByLeagueId("user-1", fakeLeague.id),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("draftPoolService.getByLeagueId: throws NOT_FOUND when no pool generated yet", async () => {
  const fakeLeague = createFakeLeague();
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: [],
  });

  const error = await assertRejects(
    () => service.getByLeagueId("user-2", fakeLeague.id),
    TRPCError,
  );
  assertEquals(error.code, "NOT_FOUND");
});

// --- generate with gameVersion (regional dex filtering) ---

const fakePokemonVersions: PokemonVersion[] = [
  {
    id: "leafgreen",
    name: "Pokemon LeafGreen",
    versionGroup: "firered-leafgreen",
    region: "Kanto",
    generation: 3,
  },
  {
    id: "firered",
    name: "Pokemon FireRed",
    versionGroup: "firered-leafgreen",
    region: "Kanto",
    generation: 3,
  },
  {
    id: "emerald",
    name: "Pokemon Emerald",
    versionGroup: "emerald",
    region: "Hoenn",
    generation: 3,
  },
];

const fakeRegionalPokedexes: Record<string, RegionalPokedexEntry[]> = {
  "firered-leafgreen": [
    { pokemonId: 1, dexNumber: 1 },
    { pokemonId: 2, dexNumber: 2 },
    { pokemonId: 3, dexNumber: 3 },
    { pokemonId: 4, dexNumber: 4 },
    { pokemonId: 5, dexNumber: 5 },
  ],
  "emerald": [
    { pokemonId: 1, dexNumber: 1 },
    { pokemonId: 3, dexNumber: 2 },
    { pokemonId: 6, dexNumber: 3 },
    { pokemonId: 7, dexNumber: 4 },
    { pokemonId: 8, dexNumber: 5 },
  ],
};

Deno.test("draftPoolService.generate: filters Pokemon by regional dex when gameVersion is set", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      gameVersion: "leafgreen",
    },
  });
  // Pokemon 1-10, but only 1-5 are in the firered-leafgreen regional dex
  const pokemonData = createFakePokemonData(10);
  let capturedItems: unknown[] = [];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    createItems: (items) => {
      capturedItems = items;
      return Promise.resolve(
        items.map((item) => ({
          id: crypto.randomUUID(),
          draftPoolId: item.draftPoolId as string,
          name: item.name as string,
          thumbnailUrl: (item.thumbnailUrl as string) ?? null,
          metadata: item.metadata ?? null,
          revealOrder: item.revealOrder ?? 0,
          revealedAt: item.revealedAt ?? null,
        })),
      );
    },
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: fakeRegionalPokedexes,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // 1 round * 2 players * 2 multiplier = 4, but only 5 eligible Pokemon
  assertEquals(result.items.length, 4);

  // All items should be from the regional dex (IDs 1-5)
  const itemNames = capturedItems.map((i: unknown) =>
    (i as { name: string }).name
  );
  for (const name of itemNames) {
    const pokemonId = parseInt(name.replace("pokemon-", ""));
    assertEquals(
      [1, 2, 3, 4, 5].includes(pokemonId),
      true,
      `Pokemon ${name} (id ${pokemonId}) should be in regional dex`,
    );
  }
});

Deno.test("draftPoolService.generate: clamps pool size to regional dex size when gameVersion is set", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 100,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 3,
      gameVersion: "leafgreen",
    },
  });
  const pokemonData = createFakePokemonData(100);

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(10),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: fakeRegionalPokedexes,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // 100 * 10 * 3 = 3000, clamped to 5 (regional dex size for firered-leafgreen)
  assertEquals(result.items.length, 5);
});

Deno.test("draftPoolService.generate: uses all Pokemon when gameVersion is not set", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      // no gameVersion
    },
  });
  const pokemonData = createFakePokemonData(10);

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: fakeRegionalPokedexes,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // 1 round * 2 players * 2 = 4, all 10 Pokemon eligible
  assertEquals(result.items.length, 4);
});

// --- generate with exclusion filters ---

Deno.test("draftPoolService.generate: excludes legendary Pokemon when excludeLegendaries is true", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 3,
      excludeLegendaries: true,
    },
  });
  // Pokemon 1-10, where IDs 5 and 8 are "legendaries"
  const pokemonData = createFakePokemonData(10);
  const legendaryPokemonIds = [5, 8];
  let capturedItems: unknown[] = [];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    createItems: (items) => {
      capturedItems = items;
      return Promise.resolve(
        items.map((item) => ({
          id: crypto.randomUUID(),
          draftPoolId: item.draftPoolId as string,
          name: item.name as string,
          thumbnailUrl: (item.thumbnailUrl as string) ?? null,
          metadata: item.metadata ?? null,
          revealOrder: item.revealOrder ?? 0,
          revealedAt: item.revealedAt ?? null,
        })),
      );
    },
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    legendaryPokemonIds,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // 1 round * 2 players * 3 multiplier = 6, but only 8 eligible (10 - 2 legendaries)
  assertEquals(result.items.length, 6);

  // No legendary Pokemon should be in the pool
  const itemNames = capturedItems.map((i: unknown) =>
    (i as { name: string }).name
  );
  for (const name of itemNames) {
    const pokemonId = parseInt(name.replace("pokemon-", ""));
    assertEquals(
      legendaryPokemonIds.includes(pokemonId),
      false,
      `Legendary Pokemon ${name} (id ${pokemonId}) should not be in pool`,
    );
  }
});

Deno.test("draftPoolService.generate: excludes starter Pokemon when excludeStarters is true", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 3,
      excludeStarters: true,
    },
  });
  const pokemonData = createFakePokemonData(10);
  const starterPokemonIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let capturedItems: unknown[] = [];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    createItems: (items) => {
      capturedItems = items;
      return Promise.resolve(
        items.map((item) => ({
          id: crypto.randomUUID(),
          draftPoolId: item.draftPoolId as string,
          name: item.name as string,
          thumbnailUrl: (item.thumbnailUrl as string) ?? null,
          metadata: item.metadata ?? null,
          revealOrder: item.revealOrder ?? 0,
          revealedAt: item.revealedAt ?? null,
        })),
      );
    },
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    starterPokemonIds,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // Only pokemon-10 is eligible (1-9 are starters), clamped to 1
  assertEquals(result.items.length, 1);

  const itemNames = capturedItems.map((i: unknown) =>
    (i as { name: string }).name
  );
  assertEquals(itemNames, ["pokemon-10"]);
});

Deno.test("draftPoolService.generate: excludes trade evolution Pokemon when excludeTradeEvolutions is true", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 3,
      excludeTradeEvolutions: true,
    },
  });
  const pokemonData = createFakePokemonData(10);
  const tradeEvolutionPokemonIds = [3, 7];
  let capturedItems: unknown[] = [];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    createItems: (items) => {
      capturedItems = items;
      return Promise.resolve(
        items.map((item) => ({
          id: crypto.randomUUID(),
          draftPoolId: item.draftPoolId as string,
          name: item.name as string,
          thumbnailUrl: (item.thumbnailUrl as string) ?? null,
          metadata: item.metadata ?? null,
          revealOrder: item.revealOrder ?? 0,
          revealedAt: item.revealedAt ?? null,
        })),
      );
    },
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    tradeEvolutionPokemonIds,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // 1 * 2 * 3 = 6, 8 eligible (10 - 2 trade evos)
  assertEquals(result.items.length, 6);

  const itemNames = capturedItems.map((i: unknown) =>
    (i as { name: string }).name
  );
  for (const name of itemNames) {
    const pokemonId = parseInt(name.replace("pokemon-", ""));
    assertEquals(
      tradeEvolutionPokemonIds.includes(pokemonId),
      false,
      `Trade evolution Pokemon ${name} (id ${pokemonId}) should not be in pool`,
    );
  }
});

Deno.test("draftPoolService.generate: applies multiple exclusions together", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 3,
      excludeLegendaries: true,
      excludeStarters: true,
      excludeTradeEvolutions: true,
    },
  });
  const pokemonData = createFakePokemonData(10);
  const legendaryPokemonIds = [1, 2];
  const starterPokemonIds = [3, 4];
  const tradeEvolutionPokemonIds = [5, 6];
  let capturedItems: unknown[] = [];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    createItems: (items) => {
      capturedItems = items;
      return Promise.resolve(
        items.map((item) => ({
          id: crypto.randomUUID(),
          draftPoolId: item.draftPoolId as string,
          name: item.name as string,
          thumbnailUrl: (item.thumbnailUrl as string) ?? null,
          metadata: item.metadata ?? null,
          revealOrder: item.revealOrder ?? 0,
          revealedAt: item.revealedAt ?? null,
        })),
      );
    },
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    legendaryPokemonIds,
    starterPokemonIds,
    tradeEvolutionPokemonIds,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // 4 eligible (10 - 2 - 2 - 2), clamped from 6
  assertEquals(result.items.length, 4);

  const itemIds = capturedItems.map((i: unknown) => {
    const name = (i as { name: string }).name;
    return parseInt(name.replace("pokemon-", ""));
  });
  // Only 7, 8, 9, 10 should remain
  assertEquals(itemIds.sort((a, b) => a - b), [7, 8, 9, 10]);
});

Deno.test("draftPoolService.generate: does not exclude when flags are false", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 3,
      excludeLegendaries: false,
      excludeStarters: false,
      excludeTradeEvolutions: false,
    },
  });
  const pokemonData = createFakePokemonData(10);

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    legendaryPokemonIds: [1, 2, 3],
    starterPokemonIds: [4, 5, 6],
    tradeEvolutionPokemonIds: [7, 8],
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // All 10 eligible since flags are false: 1 * 2 * 3 = 6
  assertEquals(result.items.length, 6);
});

Deno.test("draftPoolService.generate: throws BAD_REQUEST for invalid gameVersion", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 5,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      gameVersion: "nonexistent-version",
    },
  });
  const pokemonData = createFakePokemonData(100);

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(3),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: fakeRegionalPokedexes,
  });

  const error = await assertRejects(
    () => service.generate("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

// --- getByLeagueId availability derivation ---

const nineEntryRegionalPokedexes: Record<string, RegionalPokedexEntry[]> = {
  "firered-leafgreen": Array.from({ length: 9 }, (_, i) => ({
    pokemonId: i + 1,
    dexNumber: i + 1,
  })),
};

function createFakeStoredPoolItem(
  poolId: string,
  pokemonId: number,
): FakePoolItem {
  return {
    id: crypto.randomUUID(),
    draftPoolId: poolId,
    name: `pokemon-${pokemonId}`,
    thumbnailUrl: null,
    metadata: {
      pokemonId,
      types: ["normal"],
      baseStats: {
        hp: 50,
        attack: 50,
        defense: 50,
        specialAttack: 50,
        specialDefense: 50,
        speed: 50,
      },
      generation: "generation-i",
    },
    revealOrder: 0,
    revealedAt: null,
  };
}

Deno.test("draftPoolService.getByLeagueId: derives availability from regional dex thirds", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 5,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      gameVersion: "leafgreen",
    },
  });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  // Dex size 9 → early [1-3], mid [4-6], late [7-9]
  const storedItems = [
    createFakeStoredPoolItem(fakePool.id, 1),
    createFakeStoredPoolItem(fakePool.id, 3),
    createFakeStoredPoolItem(fakePool.id, 4),
    createFakeStoredPoolItem(fakePool.id, 6),
    createFakeStoredPoolItem(fakePool.id, 7),
    createFakeStoredPoolItem(fakePool.id, 9),
  ];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    findItemsByPoolId: (_poolId) => Promise.resolve(storedItems),
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: [],
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: nineEntryRegionalPokedexes,
  });

  const result = await service.getByLeagueId("user-2", fakeLeague.id);
  const byPokemonId = new Map(
    result.items.map((
      item,
    ) => [
      item.metadata && item.metadata.mode !== "species"
        ? item.metadata.pokemonId
        : undefined,
      item.availability,
    ]),
  );
  assertEquals(byPokemonId.get(1), "early");
  assertEquals(byPokemonId.get(3), "early");
  assertEquals(byPokemonId.get(4), "mid");
  assertEquals(byPokemonId.get(6), "mid");
  assertEquals(byPokemonId.get(7), "late");
  assertEquals(byPokemonId.get(9), "late");
});

Deno.test("draftPoolService.getByLeagueId: returns null availability when league has no gameVersion", async () => {
  const fakeLeague = createFakeLeague();
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  const storedItems = [createFakeStoredPoolItem(fakePool.id, 1)];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    findItemsByPoolId: (_poolId) => Promise.resolve(storedItems),
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: [],
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: fakeRegionalPokedexes,
  });

  const result = await service.getByLeagueId("user-2", fakeLeague.id);
  assertEquals(result.items[0].availability, null);
});

Deno.test("draftPoolService.getByLeagueId: returns null availability for pool items not in the regional dex", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 5,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      gameVersion: "leafgreen",
    },
  });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  // pokemonId 999 is not in any regional dex
  const storedItems = [createFakeStoredPoolItem(fakePool.id, 999)];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    findItemsByPoolId: (_poolId) => Promise.resolve(storedItems),
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: [],
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: nineEntryRegionalPokedexes,
  });

  const result = await service.getByLeagueId("user-2", fakeLeague.id);
  assertEquals(result.items[0].availability, null);
});

Deno.test("draftPoolService.generate: populates availability on returned items", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      gameVersion: "leafgreen",
    },
  });
  const pokemonData = createFakePokemonData(9);

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: nineEntryRegionalPokedexes,
  });

  const result = await service.generate("user-1", { leagueId: fakeLeague.id });
  for (const item of result.items) {
    const bucket = item.availability;
    assertEquals(
      bucket === "early" || bucket === "mid" || bucket === "late",
      true,
      `item ${item.name} should have an availability bucket, got ${bucket}`,
    );
  }
});

// --- encounter, effort, evolution derivation ---

const fakeEncounters: PokemonEncountersData = {
  emerald: {
    "1": {
      primary: { location: "Route 101", method: "Walk" },
      encounters: [
        {
          location: "Route 101",
          method: "Walk",
          minLevel: 3,
          maxLevel: 5,
          chance: 30,
        },
      ],
    },
    "2": {
      primary: { location: "Rare Cave", method: "Walk" },
      encounters: [
        {
          location: "Rare Cave",
          method: "Walk",
          minLevel: 25,
          maxLevel: 30,
          chance: 5,
        },
      ],
    },
  },
};

const fakeEvolutions: PokemonEvolutionsData = {
  "1": {
    pokemonId: 1,
    chainId: 1,
    evolvesFromId: null,
    triggers: [],
  },
  "2": {
    pokemonId: 2,
    chainId: 1,
    evolvesFromId: 1,
    triggers: [
      {
        trigger: "level-up",
        minLevel: 45,
        item: null,
        heldItem: null,
        knownMove: null,
        minHappiness: null,
        timeOfDay: null,
        needsOverworldRain: false,
        location: null,
        tradeSpecies: null,
      },
    ],
  },
};

Deno.test("computeEffort: low score when the Pokemon is easy to obtain", () => {
  const result = computeEffort({
    captureRate: 190,
    encounter: {
      primary: { location: "Route 101", method: "Walk" },
      all: [
        {
          location: "Route 101",
          method: "Walk",
          minLevel: 3,
          maxLevel: 5,
          chance: 30,
        },
      ],
    },
    evolution: null,
    isTradeEvolution: false,
  });
  assertEquals(result.score, 1);
});

Deno.test("computeEffort: high score when the Pokemon is rare, trade-evo, and late-level", () => {
  const result = computeEffort({
    captureRate: 25,
    encounter: {
      primary: { location: "Secret Cave", method: "Walk" },
      all: [
        {
          location: "Secret Cave",
          method: "Walk",
          minLevel: 40,
          maxLevel: 45,
          chance: 3,
        },
      ],
    },
    evolution: {
      pokemonId: 68,
      chainId: 36,
      evolvesFromId: 67,
      triggers: [
        {
          trigger: "trade",
          minLevel: null,
          item: null,
          heldItem: null,
          knownMove: null,
          minHappiness: null,
          timeOfDay: null,
          needsOverworldRain: false,
          location: null,
          tradeSpecies: null,
        },
      ],
    },
    isTradeEvolution: true,
  });
  assertEquals(result.score, 5);
});

Deno.test("computeEffort: bumps score when pre-evolution must be caught", () => {
  const result = computeEffort({
    captureRate: 190,
    encounter: {
      primary: { location: "Route 111", method: "Walk" },
      all: [
        {
          location: "Route 111",
          method: "Walk",
          minLevel: 18,
          maxLevel: 22,
          chance: 20,
        },
      ],
      source: { pokemonId: 111, name: "Rhyhorn" },
    },
    evolution: {
      pokemonId: 112,
      chainId: 50,
      evolvesFromId: 111,
      triggers: [
        {
          trigger: "level-up",
          minLevel: 42,
          item: null,
          heldItem: null,
          knownMove: null,
          minHappiness: null,
          timeOfDay: null,
          needsOverworldRain: false,
          location: null,
          tradeSpecies: null,
        },
      ],
    },
    isTradeEvolution: false,
  });
  assertEquals(result.score, 4);
});

Deno.test("computeEffort: mid-level evolution adds one point", () => {
  const result = computeEffort({
    captureRate: 190,
    encounter: {
      primary: { location: "Route 104", method: "Walk" },
      all: [
        {
          location: "Route 104",
          method: "Walk",
          minLevel: 5,
          maxLevel: 7,
          chance: 25,
        },
      ],
    },
    evolution: {
      pokemonId: 20,
      chainId: 11,
      evolvesFromId: 19,
      triggers: [
        {
          trigger: "level-up",
          minLevel: 31,
          item: null,
          heldItem: null,
          knownMove: null,
          minHappiness: null,
          timeOfDay: null,
          needsOverworldRain: false,
          location: null,
          tradeSpecies: null,
        },
      ],
    },
    isTradeEvolution: false,
  });
  assertEquals(result.score, 2);
});

Deno.test("computeEffort: flags held-item trade evolutions as complex", () => {
  const result = computeEffort({
    captureRate: 190,
    encounter: {
      primary: { location: "Route 1", method: "Walk" },
      all: [
        {
          location: "Route 1",
          method: "Walk",
          minLevel: 3,
          maxLevel: 5,
          chance: 30,
        },
      ],
    },
    evolution: {
      pokemonId: 199,
      chainId: 41,
      evolvesFromId: 79,
      triggers: [
        {
          trigger: "trade",
          minLevel: null,
          item: null,
          heldItem: "kings-rock",
          knownMove: null,
          minHappiness: null,
          timeOfDay: null,
          needsOverworldRain: false,
          location: null,
          tradeSpecies: null,
        },
      ],
    },
    isTradeEvolution: false,
  });
  assertEquals(result.score, 2);
  assertEquals(
    result.reasons.some((r) => r.toLowerCase().includes("complex")),
    true,
  );
});

Deno.test("draftPoolService.getByLeagueId: attaches encounter, effort, and evolution", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 5,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      gameVersion: "emerald",
    },
  });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  const storedItems = [
    createFakeStoredPoolItem(fakePool.id, 1),
    createFakeStoredPoolItem(fakePool.id, 2),
  ];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    findItemsByPoolId: (_poolId) => Promise.resolve(storedItems),
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(5),
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: fakeRegionalPokedexes,
    pokemonEncounters: fakeEncounters,
    pokemonEvolutions: fakeEvolutions,
  });

  const result = await service.getByLeagueId("user-2", fakeLeague.id);
  const byId = new Map(
    result.items.map((
      item,
    ) => [
      item.metadata && item.metadata.mode !== "species"
        ? item.metadata.pokemonId
        : undefined,
      item,
    ]),
  );

  const commonMon = byId.get(1)!;
  assertEquals(commonMon.encounter?.primary?.location, "Route 101");
  assertEquals(commonMon.encounter?.all.length, 1);
  assertEquals(commonMon.effort?.score, 1);
  assertEquals(commonMon.evolution?.pokemonId, 1);

  const rareMon = byId.get(2)!;
  assertEquals(rareMon.encounter?.primary?.location, "Rare Cave");
  assertEquals(rareMon.effort !== null && rareMon.effort.score > 1, true);
  assertEquals(rareMon.evolution?.evolvesFromId, 1);
});

Deno.test("draftPoolService.getByLeagueId: returns null encounter when species has no data in this version", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 5,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      gameVersion: "emerald",
    },
  });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  const storedItems = [createFakeStoredPoolItem(fakePool.id, 999)];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    findItemsByPoolId: (_poolId) => Promise.resolve(storedItems),
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(5),
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: fakeRegionalPokedexes,
    pokemonEncounters: fakeEncounters,
    pokemonEvolutions: fakeEvolutions,
  });

  const result = await service.getByLeagueId("user-2", fakeLeague.id);
  assertEquals(result.items[0].encounter, null);
  assertEquals(result.items[0].evolution, null);
});

Deno.test("draftPoolService.getByLeagueId: falls back to pre-evolution encounters when evolved Pokemon has none", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 5,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      gameVersion: "emerald",
    },
  });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  // pokemonId 3 evolves from 2, which evolves from 1. Only 1 has wild encounters.
  const chainEncounters: PokemonEncountersData = {
    emerald: {
      "1": {
        primary: { location: "Route 101", method: "Walk" },
        encounters: [
          {
            location: "Route 101",
            method: "Walk",
            minLevel: 3,
            maxLevel: 5,
            chance: 30,
          },
        ],
      },
    },
  };
  const chainEvolutions: PokemonEvolutionsData = {
    "1": { pokemonId: 1, chainId: 1, evolvesFromId: null, triggers: [] },
    "2": {
      pokemonId: 2,
      chainId: 1,
      evolvesFromId: 1,
      triggers: [
        {
          trigger: "level-up",
          minLevel: 16,
          item: null,
          heldItem: null,
          knownMove: null,
          minHappiness: null,
          timeOfDay: null,
          needsOverworldRain: false,
          location: null,
          tradeSpecies: null,
        },
      ],
    },
    "3": {
      pokemonId: 3,
      chainId: 1,
      evolvesFromId: 2,
      triggers: [
        {
          trigger: "level-up",
          minLevel: 36,
          item: null,
          heldItem: null,
          knownMove: null,
          minHappiness: null,
          timeOfDay: null,
          needsOverworldRain: false,
          location: null,
          tradeSpecies: null,
        },
      ],
    },
  };
  const storedItems = [
    createFakeStoredPoolItem(fakePool.id, 2),
    createFakeStoredPoolItem(fakePool.id, 3),
  ];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    findItemsByPoolId: (_poolId) => Promise.resolve(storedItems),
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(5),
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: fakeRegionalPokedexes,
    pokemonEncounters: chainEncounters,
    pokemonEvolutions: chainEvolutions,
  });

  const result = await service.getByLeagueId("user-2", fakeLeague.id);
  const byId = new Map(
    result.items.map((
      item,
    ) => [
      item.metadata && item.metadata.mode !== "species"
        ? item.metadata.pokemonId
        : undefined,
      item,
    ]),
  );

  const firstStage = byId.get(2)!;
  assertEquals(firstStage.encounter?.primary?.location, "Route 101");
  assertEquals(firstStage.encounter?.source?.pokemonId, 1);
  assertEquals(firstStage.encounter?.source?.name, "pokemon-1");

  const secondStage = byId.get(3)!;
  assertEquals(secondStage.encounter?.primary?.location, "Route 101");
  assertEquals(secondStage.encounter?.all.length, 1);
  assertEquals(secondStage.encounter?.source?.pokemonId, 1);
  assertEquals(secondStage.encounter?.source?.name, "pokemon-1");
});

Deno.test("draftPoolService.getByLeagueId: base-stage encounters have no source", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 5,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      gameVersion: "emerald",
    },
  });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  const storedItems = [createFakeStoredPoolItem(fakePool.id, 1)];

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    findItemsByPoolId: (_poolId) => Promise.resolve(storedItems),
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(5),
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes: fakeRegionalPokedexes,
    pokemonEncounters: fakeEncounters,
    pokemonEvolutions: fakeEvolutions,
  });

  const result = await service.getByLeagueId("user-2", fakeLeague.id);
  assertEquals(result.items[0].encounter?.source ?? null, null);
});

Deno.test("draftPoolService.generate: throws when all Pokemon are excluded by filters", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 5,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      excludeLegendaries: true,
    },
  });
  // All Pokemon are legendary, so all will be excluded
  const pokemonData = createFakePokemonData(10);
  const allPokemonIds = pokemonData.map((p) => p.id);

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(3),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    legendaryPokemonIds: allPokemonIds,
  });

  const error = await assertRejects(
    () => service.generate("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

// --- generate: catchability filter (regional-dex-present but not catchable) ---
//
// The Hoenn regional dex is shared by Ruby / Sapphire / Emerald, but each
// version locks some species behind the other cartridge's wild encounters
// (Zangoose is Ruby-only, Seviper is Sapphire-only, etc.). The generator
// must drop those species in favor of ones the player can actually obtain,
// while still keeping Pokemon that are only available via gift / static /
// in-game-trade (Beldum, Castform, fossils, Lapras, Eevee, etc.) since
// PokeAPI's encounter endpoint does not expose those sources.

Deno.test("draftPoolService.generate: drops Pokemon with no wild encounter and no gift entry in the chosen version", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 1,
      gameVersion: "emerald",
    },
  });
  // Pokemon ids 10, 20, 30 are all in the "emerald" regional dex below.
  // 10 has a wild encounter in emerald.
  // 20 has NO wild encounter and NO gift entry -> should be dropped.
  // 30 has NO wild encounter but IS in the gift list -> should be kept.
  const pokemonData = createFakePokemonData(40);
  const regionalPokedexes: Record<string, RegionalPokedexEntry[]> = {
    "emerald": [
      { pokemonId: 10, dexNumber: 1 },
      { pokemonId: 20, dexNumber: 2 },
      { pokemonId: 30, dexNumber: 3 },
    ],
  };
  const encounters: PokemonEncountersData = {
    emerald: {
      "10": {
        primary: { location: "Route 101", method: "Walk" },
        encounters: [{
          location: "Route 101",
          method: "Walk",
          minLevel: 3,
          maxLevel: 5,
          chance: 30,
        }],
      },
    },
  };
  const gifts: PokemonGiftsData = {
    emerald: [30],
  };

  let capturedItems: unknown[] = [];
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    createItems: (items) => {
      capturedItems = items;
      return Promise.resolve(
        items.map((item) => ({
          id: crypto.randomUUID(),
          draftPoolId: item.draftPoolId as string,
          name: item.name as string,
          thumbnailUrl: (item.thumbnailUrl as string) ?? null,
          metadata: item.metadata ?? null,
          revealOrder: item.revealOrder ?? 0,
          revealedAt: item.revealedAt ?? null,
        })),
      );
    },
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes,
    pokemonEncounters: encounters,
    pokemonGifts: gifts,
  });

  await service.generate("user-1", { leagueId: fakeLeague.id });

  const pickedIds = capturedItems
    .map((i) => (i as { metadata: { pokemonId: number } }).metadata.pokemonId)
    .sort((a, b) => a - b);
  assertEquals(pickedIds, [10, 30]);
});

Deno.test("draftPoolService.generate: keeps Pokemon whose pre-evolution has a wild encounter in the chosen version", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 1,
      gameVersion: "emerald",
    },
  });
  // Pokemon 2 has no direct encounter, but evolves from 1 which does.
  // It should still be eligible for the draft pool.
  const pokemonData = createFakePokemonData(5);
  const regionalPokedexes: Record<string, RegionalPokedexEntry[]> = {
    "emerald": [
      { pokemonId: 1, dexNumber: 1 },
      { pokemonId: 2, dexNumber: 2 },
    ],
  };
  const encounters: PokemonEncountersData = {
    emerald: {
      "1": {
        primary: { location: "Route 101", method: "Walk" },
        encounters: [{
          location: "Route 101",
          method: "Walk",
          minLevel: 3,
          maxLevel: 5,
          chance: 30,
        }],
      },
    },
  };
  const evolutions: PokemonEvolutionsData = {
    "1": { pokemonId: 1, chainId: 1, evolvesFromId: null, triggers: [] },
    "2": {
      pokemonId: 2,
      chainId: 1,
      evolvesFromId: 1,
      triggers: [{
        trigger: "level-up",
        minLevel: 16,
        item: null,
        heldItem: null,
        knownMove: null,
        minHappiness: null,
        timeOfDay: null,
        needsOverworldRain: false,
        location: null,
        tradeSpecies: null,
      }],
    },
  };

  let capturedItems: unknown[] = [];
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    createItems: (items) => {
      capturedItems = items;
      return Promise.resolve(
        items.map((item) => ({
          id: crypto.randomUUID(),
          draftPoolId: item.draftPoolId as string,
          name: item.name as string,
          thumbnailUrl: (item.thumbnailUrl as string) ?? null,
          metadata: item.metadata ?? null,
          revealOrder: item.revealOrder ?? 0,
          revealedAt: item.revealedAt ?? null,
        })),
      );
    },
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes,
    pokemonEncounters: encounters,
    pokemonEvolutions: evolutions,
  });

  await service.generate("user-1", { leagueId: fakeLeague.id });

  const pickedIds = capturedItems
    .map((i) => (i as { metadata: { pokemonId: number } }).metadata.pokemonId)
    .sort((a, b) => a - b);
  assertEquals(pickedIds, [1, 2]);
});

Deno.test("draftPoolService.generate: catchability filter is a no-op when pokemonEncounters is not provided", async () => {
  // Back-compat: legacy tests instantiate the service without encounter data;
  // they should still succeed even with a gameVersion set.
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 1,
      gameVersion: "emerald",
    },
  });
  const pokemonData = createFakePokemonData(10);
  const regionalPokedexes: Record<string, RegionalPokedexEntry[]> = {
    "emerald": [
      { pokemonId: 1, dexNumber: 1 },
      { pokemonId: 2, dexNumber: 2 },
      { pokemonId: 3, dexNumber: 3 },
    ],
  };

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonVersions: fakePokemonVersions,
    regionalPokedexes,
    // no pokemonEncounters, no pokemonGifts
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });
  assertEquals(result.items.length, 2);
});

// --- revealNext ---

Deno.test("draftPoolService.revealNext: publishes draftPool:item_revealed event", async () => {
  const fakeLeague = createFakeLeague({ status: "pooling" });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  const revealedItem = {
    id: crypto.randomUUID(),
    draftPoolId: fakePool.id,
    name: "pikachu",
    thumbnailUrl: null,
    metadata: null,
    revealOrder: 2,
    revealedAt: new Date(),
  };

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    revealNextItem: (_poolId, _now) =>
      Promise.resolve({ item: revealedItem, remaining: 1 }),
  });

  const published: Array<{ leagueId: string; event: unknown }> = [];
  const eventPublisher = {
    subscribe: () => () => {},
    publish: (leagueId: string, event: unknown) => {
      published.push({ leagueId, event });
    },
    subscriberCount: () => 0,
  };

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(1),
    eventPublisher,
  });

  await service.revealNext("user-1", { leagueId: fakeLeague.id });

  assertEquals(published.length, 1);
  assertEquals(published[0].leagueId, fakeLeague.id);
  assertEquals(
    (published[0].event as { type: string }).type,
    "draftPool:item_revealed",
  );
  assertEquals(
    (published[0].event as { data: { remaining: number } }).data.remaining,
    1,
  );
});

Deno.test("draftPoolService.revealNext: auto-advances to scouting when the last item is revealed", async () => {
  const fakeLeague = createFakeLeague({ status: "pooling" });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  const lastItem = {
    id: crypto.randomUUID(),
    draftPoolId: fakePool.id,
    name: "mewtwo",
    thumbnailUrl: null,
    metadata: null,
    revealOrder: 9,
    revealedAt: new Date(),
  };

  let updatedStatus: string | undefined;
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    updateStatus: (_id, status) => {
      updatedStatus = status;
      return Promise.resolve(
        createFakeLeague({ status: status as "scouting" }),
      );
    },
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    revealNextItem: (_poolId, _now) =>
      Promise.resolve({ item: lastItem, remaining: 0 }),
  });

  const publishedTypes: string[] = [];
  const eventPublisher = {
    subscribe: () => () => {},
    publish: (_leagueId: string, event: { type: string }) => {
      publishedTypes.push(event.type);
    },
    subscriberCount: () => 0,
  };

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(1),
    eventPublisher,
  });

  await service.revealNext("user-1", { leagueId: fakeLeague.id });

  assertEquals(updatedStatus, "scouting");
  assertEquals(publishedTypes, [
    "draftPool:item_revealed",
    "draftPool:reveal_completed",
  ]);
});

Deno.test("draftPoolService.revealNext: reveals the next item in pooling phase", async () => {
  const fakeLeague = createFakeLeague({ status: "pooling" });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  const revealedItem = {
    id: crypto.randomUUID(),
    draftPoolId: fakePool.id,
    name: "pikachu",
    thumbnailUrl: null,
    metadata: null,
    revealOrder: 0,
    revealedAt: new Date(),
  };

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    revealNextItem: (_poolId, _now) =>
      Promise.resolve({ item: revealedItem, remaining: 4 }),
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(1),
  });

  const result = await service.revealNext("user-1", {
    leagueId: fakeLeague.id,
  });
  assertEquals(result.itemId, revealedItem.id);
  assertEquals(result.revealOrder, 0);
  assertEquals(result.remaining, 4);
});

Deno.test("draftPoolService.revealNext: rejects non-commissioners", async () => {
  const fakeLeague = createFakeLeague({ status: "pooling" });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(1),
  });

  const error = await assertRejects(
    () => service.revealNext("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "FORBIDDEN");
});

Deno.test("draftPoolService.revealNext: rejects when league is not in pooling", async () => {
  const fakeLeague = createFakeLeague({ status: "scouting" });
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(1),
  });

  const error = await assertRejects(
    () => service.revealNext("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftPoolService.revealNext: rejects when all items are already revealed", async () => {
  const fakeLeague = createFakeLeague({ status: "pooling" });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    revealNextItem: (_poolId, _now) => Promise.resolve(null),
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(1),
  });

  const error = await assertRejects(
    () => service.revealNext("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftPoolService.getByLeagueId: filters to revealed items during pooling", async () => {
  const fakeLeague = createFakeLeague({ status: "pooling" });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  let capturedOpts: { onlyRevealed?: boolean } | undefined;

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    findItemsByPoolId: (_poolId, opts) => {
      capturedOpts = opts;
      return Promise.resolve([]);
    },
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(1),
  });

  await service.getByLeagueId("user-1", fakeLeague.id);
  assertEquals(capturedOpts?.onlyRevealed, true);
});

Deno.test("draftPoolService.getByLeagueId: does not filter during scouting", async () => {
  const fakeLeague = createFakeLeague({ status: "scouting" });
  const fakePool = {
    id: crypto.randomUUID(),
    leagueId: fakeLeague.id,
    name: "Pool",
    createdAt: new Date(),
  };
  let capturedOpts: { onlyRevealed?: boolean } | undefined;

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createMemberPlayer(fakeLeague.id)),
  });
  const draftPoolRepo = createFakeDraftPoolRepo({
    findByLeagueId: (_leagueId) => Promise.resolve(fakePool),
    findItemsByPoolId: (_poolId, opts) => {
      capturedOpts = opts;
      return Promise.resolve([]);
    },
  });

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData: createFakePokemonData(1),
  });

  await service.getByLeagueId("user-1", fakeLeague.id);
  assertEquals(capturedOpts?.onlyRevealed, false);
});

// --- generate: species mode ---

// Three-species fixture:
//   pokemon-1 — single-stage terminal → species {1}
//   pokemon-2 → pokemon-3            → species {3} owning {2, 3}
//   pokemon-4 — single-stage terminal → species {4}
function createSpeciesFixture(): {
  pokemonData: Pokemon[];
  pokemonEvolutions: PokemonEvolutionsData;
} {
  const base = createFakePokemonData(4);
  const pokemonEvolutions: PokemonEvolutionsData = {
    "1": { pokemonId: 1, chainId: 1, evolvesFromId: null, triggers: [] },
    "2": { pokemonId: 2, chainId: 2, evolvesFromId: null, triggers: [] },
    "3": { pokemonId: 3, chainId: 2, evolvesFromId: 2, triggers: [] },
    "4": { pokemonId: 4, chainId: 3, evolvesFromId: null, triggers: [] },
  };
  return { pokemonData: base, pokemonEvolutions };
}

Deno.test("draftPoolService.generate: species mode emits species-shaped pool items", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 1.5,
      draftMode: "species",
    },
  });
  const { pokemonData, pokemonEvolutions } = createSpeciesFixture();

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonEvolutions,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // 1 round * 2 players * 1.5 multiplier = 3, clamped against 3 species.
  assertEquals(result.items.length, 3);

  for (const item of result.items) {
    const metadata = item.metadata as SpeciesPoolItemMetadata;
    assertEquals(metadata.mode, "species");
    assertEquals(metadata.finals.length >= 1, true);
    const terminalName = metadata.finals[0].name;
    assertEquals(item.name, terminalName);
    // Non-terminal base forms must never become pool items.
    assertEquals(item.name === "pokemon-2", false);
  }

  // Species universe shape: {1}, {3 owning 2,3}, {4}.
  const names = new Set(result.items.map((i) => i.name));
  assertEquals(names.has("pokemon-1"), true);
  assertEquals(names.has("pokemon-3"), true);
  assertEquals(names.has("pokemon-4"), true);
});

Deno.test("draftPoolService.generate: species mode includes members for branching/linear chains", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 10,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 3,
      draftMode: "species",
    },
  });
  const { pokemonData, pokemonEvolutions } = createSpeciesFixture();

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(4),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonEvolutions,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  const byName = new Map(
    result.items.map((i) => [
      i.name,
      i.metadata as SpeciesPoolItemMetadata,
    ]),
  );

  const linear = byName.get("pokemon-3");
  assertEquals(linear !== undefined, true);
  assertEquals(linear!.members.length, 2);
  assertEquals(linear!.members.map((m) => m.pokemonId).sort(), [2, 3]);
  assertEquals(linear!.members.find((m) => m.pokemonId === 3)?.stage, "final");
  assertEquals(linear!.members.find((m) => m.pokemonId === 2)?.stage, "base");

  const single = byName.get("pokemon-1");
  assertEquals(single!.members.length, 1);
  assertEquals(single!.members[0].stage, "final");
});

Deno.test("draftPoolService.generate: species mode clamps pool size to the species universe", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 100,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 3,
      draftMode: "species",
    },
  });
  const { pokemonData, pokemonEvolutions } = createSpeciesFixture();

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(10),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonEvolutions,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // 100 * 10 * 3 = 3000 — clamped to 3 species, not 4 pokemon.
  assertEquals(result.items.length, 3);
});

Deno.test("draftPoolService.generate: species mode thumbnailUrl comes from the terminal final", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 10,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 3,
      draftMode: "species",
    },
  });
  const { pokemonData, pokemonEvolutions } = createSpeciesFixture();

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(4),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    pokemonEvolutions,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  // pokemon-3 is a linear-chain terminal — its thumbnail must be the
  // terminal final's sprite, not the base form (pokemon-2)'s.
  const pokemon3 = result.items.find((i) => i.name === "pokemon-3");
  assertEquals(pokemon3?.thumbnailUrl, "https://example.com/sprite-3.png");
});

Deno.test("draftPoolService.generate: species mode throws when evolution data is missing", async () => {
  const fakeLeague = createFakeLeague({
    rulesConfig: {
      draftFormat: "snake",
      numberOfRounds: 1,
      pickTimeLimitSeconds: null,
      poolSizeMultiplier: 2,
      draftMode: "species",
    },
  });
  const { pokemonData } = createSpeciesFixture();

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
    // intentionally omit pokemonEvolutions
  });

  const error = await assertRejects(
    () => service.generate("user-1", { leagueId: fakeLeague.id }),
    TRPCError,
  );
  assertEquals(error.code, "BAD_REQUEST");
});

Deno.test("draftPoolService.generate: individual mode (default) emits mode: 'individual' metadata", async () => {
  const fakeLeague = createFakeLeague();
  const pokemonData = createFakePokemonData(10);

  const leagueRepo = createFakeLeagueRepo({
    findById: (_id) => Promise.resolve(fakeLeague),
    findPlayer: (_leagueId, _userId) =>
      Promise.resolve(createCommissionerPlayer(fakeLeague.id)),
    countPlayers: (_leagueId) => Promise.resolve(2),
  });
  const draftPoolRepo = createFakeDraftPoolRepo();

  const service = createDraftPoolService({
    draftPoolRepo,
    leagueRepo,
    pokemonData,
  });

  const result = await service.generate("user-1", {
    leagueId: fakeLeague.id,
  });

  for (const item of result.items) {
    const metadata = item.metadata as { mode: string; pokemonId: number };
    assertEquals(metadata.mode, "individual");
    assertEquals(typeof metadata.pokemonId, "number");
  }
});
