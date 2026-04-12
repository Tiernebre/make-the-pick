import postgres from "postgres";
import { TEST_USER } from "./seed-data.ts";

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
];

export interface SeededLeagueWithPool {
  leagueId: string;
  leaguePlayerId: string;
  draftPoolId: string;
  poolItemIds: string[];
  poolItemNames: string[];
}

export async function seedLeagueWithPool(): Promise<SeededLeagueWithPool> {
  const now = new Date();

  const [league] = await sql`
    INSERT INTO "league" (name, status, sport_type, rules_config, max_players, invite_code, created_by, created_at, updated_at)
    VALUES (
      'E2E Pool League',
      'scouting',
      'pokemon',
      ${{
    draftFormat: "snake",
    draftMode: "individual",
    numberOfRounds: 6,
    pickTimeLimitSeconds: null,
    poolSizeMultiplier: 2,
    excludeLegendaries: false,
    excludeStarters: false,
    excludeTradeEvolutions: false,
  }},
      4,
      ${"e2e-invite-" + Date.now()},
      ${TEST_USER.id},
      ${now},
      ${now}
    )
    RETURNING id
  `;

  const [player] = await sql`
    INSERT INTO "league_player" (league_id, user_id, role, joined_at)
    VALUES (${league.id}, ${TEST_USER.id}, 'commissioner', ${now})
    RETURNING id
  `;

  const [pool] = await sql`
    INSERT INTO "draft_pool" (league_id, name, created_at)
    VALUES (${league.id}, 'Draft Pool', ${now})
    RETURNING id
  `;

  const poolItemIds: string[] = [];
  const poolItemNames: string[] = [];

  for (let i = 0; i < FAKE_POKEMON.length; i++) {
    const p = FAKE_POKEMON[i];
    const total = p.stats.hp + p.stats.attack + p.stats.defense +
      p.stats.spAtk + p.stats.spDef + p.stats.speed;
    const [item] = await sql`
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
      RETURNING id
    `;
    poolItemIds.push(item.id);
    poolItemNames.push(p.name);
  }

  return {
    leagueId: league.id,
    leaguePlayerId: player.id,
    draftPoolId: pool.id,
    poolItemIds,
    poolItemNames,
  };
}
