import postgres from "postgres";
import { TEST_USER, TEST_USER_2 } from "./seed-data.ts";

const DATABASE_URL_E2E = process.env.DATABASE_URL_E2E ??
  "postgres://make_the_pick:make_the_pick@localhost:5432/make_the_pick_e2e";

const sql = postgres(DATABASE_URL_E2E);

const FAKE_POKEMON = [
  {
    name: "Bulbasaur",
    types: ["grass", "poison"],
    stats: { hp: 45, attack: 49, defense: 49, spAtk: 65, spDef: 65, speed: 45 },
  },
  {
    name: "Charmander",
    types: ["fire"],
    stats: { hp: 39, attack: 52, defense: 43, spAtk: 60, spDef: 50, speed: 65 },
  },
  {
    name: "Squirtle",
    types: ["water"],
    stats: { hp: 44, attack: 48, defense: 65, spAtk: 50, spDef: 64, speed: 43 },
  },
  {
    name: "Pikachu",
    types: ["electric"],
    stats: { hp: 35, attack: 55, defense: 40, spAtk: 50, spDef: 50, speed: 90 },
  },
  {
    name: "Eevee",
    types: ["normal"],
    stats: { hp: 55, attack: 55, defense: 50, spAtk: 45, spDef: 65, speed: 55 },
  },
  {
    name: "Jigglypuff",
    types: ["normal", "fairy"],
    stats: {
      hp: 115,
      attack: 45,
      defense: 20,
      spAtk: 45,
      spDef: 25,
      speed: 20,
    },
  },
  {
    name: "Meowth",
    types: ["normal"],
    stats: { hp: 40, attack: 45, defense: 35, spAtk: 40, spDef: 40, speed: 90 },
  },
  {
    name: "Psyduck",
    types: ["water"],
    stats: { hp: 50, attack: 52, defense: 48, spAtk: 65, spDef: 50, speed: 55 },
  },
  {
    name: "Growlithe",
    types: ["fire"],
    stats: { hp: 55, attack: 70, defense: 45, spAtk: 70, spDef: 50, speed: 60 },
  },
  {
    name: "Abra",
    types: ["psychic"],
    stats: {
      hp: 25,
      attack: 20,
      defense: 15,
      spAtk: 105,
      spDef: 55,
      speed: 90,
    },
  },
  {
    name: "Machop",
    types: ["fighting"],
    stats: { hp: 70, attack: 80, defense: 50, spAtk: 35, spDef: 35, speed: 35 },
  },
  {
    name: "Geodude",
    types: ["rock", "ground"],
    stats: {
      hp: 40,
      attack: 80,
      defense: 100,
      spAtk: 30,
      spDef: 30,
      speed: 20,
    },
  },
];

export interface SeededDraft {
  leagueId: string;
  draftId: string;
  player1Id: string;
  player2Id: string;
  poolItemNames: string[];
}

export async function seedDraftInProgress(): Promise<SeededDraft> {
  const now = new Date();

  const [league] = await sql`
    INSERT INTO "league" (name, status, sport_type, rules_config, max_players, invite_code, created_by, created_at, updated_at)
    VALUES (
      'E2E Draft League',
      'drafting',
      'pokemon',
      ${{
    draftFormat: "snake",
    draftMode: "individual",
    numberOfRounds: 3,
    pickTimeLimitSeconds: null,
    poolSizeMultiplier: 2,
    excludeLegendaries: false,
    excludeStarters: false,
    excludeTradeEvolutions: false,
  }},
      2,
      ${"e2e-draft-invite-" + Date.now()},
      ${TEST_USER.id},
      ${now},
      ${now}
    )
    RETURNING id
  `;

  const [player1] = await sql`
    INSERT INTO "league_player" (league_id, user_id, role, joined_at)
    VALUES (${league.id}, ${TEST_USER.id}, 'commissioner', ${now})
    RETURNING id
  `;
  const [player2] = await sql`
    INSERT INTO "league_player" (league_id, user_id, role, joined_at)
    VALUES (${league.id}, ${TEST_USER_2.id}, 'member', ${now})
    RETURNING id
  `;

  const [pool] = await sql`
    INSERT INTO "draft_pool" (league_id, name, created_at)
    VALUES (${league.id}, 'Draft Pool', ${now})
    RETURNING id
  `;

  const poolItemNames: string[] = [];
  for (let i = 0; i < FAKE_POKEMON.length; i++) {
    const p = FAKE_POKEMON[i];
    const total = p.stats.hp + p.stats.attack + p.stats.defense +
      p.stats.spAtk + p.stats.spDef + p.stats.speed;
    await sql`
      INSERT INTO "draft_pool_item" (draft_pool_id, name, thumbnail_url, metadata, reveal_order, revealed_at)
      VALUES (
        ${pool.id},
        ${p.name},
        NULL,
        ${{
      mode: "individual",
      pokemonId: i + 1,
      types: p.types,
      baseStats: p.stats,
      total,
      generation: 1,
    }},
        ${i},
        ${now}
      )
    `;
    poolItemNames.push(p.name);
  }

  // Player 1 picks first (index 0 in pickOrder).
  const pickOrder = [player1.id, player2.id];

  const [draft] = await sql`
    INSERT INTO "draft" (league_id, pool_id, format, status, pick_order, current_pick, started_at)
    VALUES (
      ${league.id},
      ${pool.id},
      'snake',
      'in_progress',
      ${JSON.stringify(pickOrder)},
      0,
      ${now}
    )
    RETURNING id
  `;

  return {
    leagueId: league.id,
    draftId: draft.id,
    player1Id: player1.id,
    player2Id: player2.id,
    poolItemNames,
  };
}
