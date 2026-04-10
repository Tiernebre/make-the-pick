import { assertEquals, assertRejects } from "@std/assert";
import { TRPCError } from "@trpc/server";
import type {
  Pokemon,
  PokemonVersion,
  RegionalPokedexEntry,
} from "@make-the-pick/shared";
import type { LeagueRepository } from "../league/league.repository.ts";
import type { DraftPoolRepository } from "./draft-pool.repository.ts";
import { createDraftPoolService } from "./draft-pool.service.ts";

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
        })),
      ),
    findByLeagueId: (_leagueId) => Promise.resolve(null as FakePool),
    findItemsByPoolId: (_poolId) => Promise.resolve([] as FakePoolItem[]),
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
