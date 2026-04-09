const FIRST_NAMES = [
  "Ash",
  "Misty",
  "Brock",
  "Gary",
  "Dawn",
  "May",
  "Cynthia",
  "Leon",
  "Serena",
  "Iris",
  "Clemont",
  "Lillie",
  "Gladion",
  "Hau",
  "Marnie",
  "Hop",
  "Raihan",
  "Nessa",
  "Elesa",
  "Skyla",
  "Cilan",
  "Steven",
  "Wallace",
  "Diantha",
  "Zinnia",
  "Lusamine",
  "Guzma",
  "Piers",
  "Oleana",
  "Penny",
];

const LAST_NAMES = [
  "Ketchum",
  "Waterflower",
  "Harrison",
  "Oak",
  "Berlitz",
  "Maple",
  "Shirona",
  "Dande",
  "Yvonne",
  "Draconid",
  "Citron",
  "Aether",
  "Gladius",
  "Mahalo",
  "Spikemuth",
  "Champion",
  "Hammerlocke",
  "Hulbury",
  "Nimbasa",
  "Mistralton",
  "Striaton",
  "Stone",
  "Sootopolis",
  "Kalos",
  "Lorekeeper",
  "Foundation",
  "Skull",
  "Yell",
  "Macro",
  "Star",
];

const LEAGUE_ADJECTIVES = [
  "Elite",
  "Champion",
  "Rising",
  "Legendary",
  "Thunder",
  "Shadow",
  "Cosmic",
  "Iron",
  "Crystal",
  "Mystic",
  "Blazing",
  "Frozen",
  "Storm",
  "Golden",
  "Neon",
];

const LEAGUE_NOUNS = [
  "Trainers",
  "Masters",
  "Rivals",
  "Challengers",
  "Contenders",
  "Tacticians",
  "Strategists",
  "Battlers",
  "Champions",
  "Legends",
  "Drafters",
  "Picks",
  "Squad",
  "Alliance",
  "Circuit",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomId(): string {
  return crypto.randomUUID();
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface FakeUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: null;
  createdAt: Date;
  updatedAt: Date;
}

export const CLI_USER_ID = "dev-cli-user";
export const CLI_USER_EMAIL = "cli@dev.local";

export function generateCliUser(): FakeUser {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const now = new Date();

  return {
    id: CLI_USER_ID,
    name: `${firstName} ${lastName}`,
    email: CLI_USER_EMAIL,
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function generateFakeUser(): FakeUser {
  const id = randomId();
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const now = new Date();

  return {
    id,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}-${id.slice(0, 8)}@fake.local`,
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function generateFakeUsers(count: number): FakeUser[] {
  return Array.from({ length: count }, () => generateFakeUser());
}

export interface FakeLeague {
  id: string;
  name: string;
  status: "setup";
  sportType: "pokemon";
  rulesConfig: {
    draftFormat: "snake" | "linear";
    numberOfRounds: number;
    pickTimeLimitSeconds: number | null;
  };
  maxPlayers: number;
  inviteCode: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function generateFakeLeague(createdBy: string): FakeLeague {
  const now = new Date();
  const draftFormat = randomItem(["snake", "linear"] as const);
  const maxPlayers = randomItem([4, 6, 8, 10, 12]);

  return {
    id: randomId(),
    name: `${randomItem(LEAGUE_ADJECTIVES)} ${randomItem(LEAGUE_NOUNS)}`,
    status: "setup",
    sportType: "pokemon",
    rulesConfig: {
      draftFormat,
      numberOfRounds: randomInt(4, 12),
      pickTimeLimitSeconds: randomItem([null, 60, 90, 120, 180]),
    },
    maxPlayers,
    inviteCode: `FAKE-${randomId().slice(0, 8).toUpperCase()}`,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}
