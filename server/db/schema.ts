import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const healthChecks = pgTable("health_checks", {
  id: serial("id").primaryKey(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow()
    .notNull(),
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade",
  }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade",
  }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const leagueStatusEnum = pgEnum("league_status", [
  "setup",
  "drafting",
  "competing",
  "complete",
]);

export const sportTypeEnum = pgEnum("sport_type", ["pokemon"]);

export const leaguePlayerRoleEnum = pgEnum("league_player_role", [
  "commissioner",
  "member",
]);

export const league = pgTable("league", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  status: leagueStatusEnum("status").notNull().default("setup"),
  sportType: sportTypeEnum("sport_type"),
  rulesConfig: jsonb("rules_config"),
  maxPlayers: integer("max_players"),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
    .notNull(),
});

export const draftPool = pgTable("draft_pool", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").notNull().references(() => league.id, {
    onDelete: "cascade",
  }).unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
    .notNull(),
});

export const draftPoolItem = pgTable("draft_pool_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  draftPoolId: uuid("draft_pool_id").notNull().references(() => draftPool.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  metadata: jsonb("metadata"),
}, (table) => [
  unique("draft_pool_item_unique").on(table.draftPoolId, table.name),
]);

export const leaguePlayer = pgTable("league_player", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").notNull().references(() => league.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id").notNull().references(() => user.id, {
    onDelete: "cascade",
  }),
  role: leaguePlayerRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow()
    .notNull(),
}, (table) => [
  unique("league_player_unique").on(table.leagueId, table.userId),
]);
