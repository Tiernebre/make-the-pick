import { and, count, eq, notInArray, sql } from "drizzle-orm";
import type { db } from "../../db/mod.ts";
import { league, leaguePlayer, user } from "../../db/mod.ts";
import { logger } from "../../logger.ts";

export type Database = typeof db;

const log = logger.child({ module: "league.repository" });

type LeagueRow = typeof league.$inferSelect;
type LeaguePlayerRow = typeof leaguePlayer.$inferSelect;

export type LeagueListRow = LeagueRow & {
  playerCount: number;
  userRole: "commissioner" | "member";
};

export function createLeagueRepository(db: Database) {
  return {
    createWithCommissioner(
      userId: string,
      data: {
        name: string;
        inviteCode: string;
        sportType: "pokemon";
        maxPlayers: number;
        rulesConfig: unknown;
      },
    ): Promise<LeagueRow> {
      log.debug(
        { userId, name: data.name },
        "inserting league + commissioner player",
      );
      return db.transaction(async (tx) => {
        const [newLeague] = await tx.insert(league).values({
          name: data.name,
          inviteCode: data.inviteCode,
          sportType: data.sportType,
          maxPlayers: data.maxPlayers,
          rulesConfig: data.rulesConfig,
          createdBy: userId,
        }).returning();
        log.debug({ leagueId: newLeague.id }, "league row inserted");
        await tx.insert(leaguePlayer).values({
          leagueId: newLeague.id,
          userId,
          role: "commissioner",
        });
        log.debug(
          { leagueId: newLeague.id, userId },
          "commissioner player row inserted",
        );
        return newLeague;
      });
    },

    async findById(id: string): Promise<LeagueRow | null> {
      log.debug({ leagueId: id }, "finding league by id");
      const [result] = await db.select().from(league).where(
        eq(league.id, id),
      );
      log.debug({ leagueId: id, found: !!result }, "findById result");
      return result ?? null;
    },

    async findByInviteCode(inviteCode: string): Promise<LeagueRow | null> {
      log.debug({ inviteCode }, "finding league by invite code");
      const [result] = await db.select().from(league).where(
        eq(league.inviteCode, inviteCode),
      );
      log.debug({ inviteCode, found: !!result }, "findByInviteCode result");
      return result ?? null;
    },

    async findAllByUserId(userId: string): Promise<LeagueListRow[]> {
      log.debug({ userId }, "finding all leagues for user");
      const playerCountSql = sql<number>`(
        SELECT COUNT(*)::int FROM ${leaguePlayer} lp
        WHERE lp.league_id = ${league.id}
      )`.as("player_count");
      const rows = await db
        .select({
          league,
          userRole: leaguePlayer.role,
          playerCount: playerCountSql,
        })
        .from(league)
        .innerJoin(leaguePlayer, eq(league.id, leaguePlayer.leagueId))
        .where(eq(leaguePlayer.userId, userId));
      log.debug({ userId, count: rows.length }, "findAllByUserId result");
      return rows.map((row) => ({
        ...row.league,
        userRole: row.userRole as "commissioner" | "member",
        playerCount: Number(row.playerCount),
      }));
    },

    async addPlayer(
      leagueId: string,
      userId: string,
    ): Promise<LeaguePlayerRow> {
      log.debug({ leagueId, userId }, "inserting league player");
      const [player] = await db.insert(leaguePlayer).values({
        leagueId,
        userId,
        role: "member",
      }).returning();
      log.debug({ playerId: player.id }, "league player inserted");
      return player;
    },

    async deleteById(id: string): Promise<void> {
      log.debug({ leagueId: id }, "deleting league");
      await db.delete(league).where(eq(league.id, id));
      log.debug({ leagueId: id }, "league deleted");
    },

    async findPlayersByLeagueId(leagueId: string) {
      log.debug({ leagueId }, "finding players for league");
      const rows = await db
        .select({
          id: leaguePlayer.id,
          userId: leaguePlayer.userId,
          name: user.name,
          image: user.image,
          isNpc: user.isNpc,
          npcStrategy: user.npcStrategy,
          role: leaguePlayer.role,
          joinedAt: leaguePlayer.joinedAt,
        })
        .from(leaguePlayer)
        .innerJoin(user, eq(leaguePlayer.userId, user.id))
        .where(eq(leaguePlayer.leagueId, leagueId));
      log.debug(
        { leagueId, count: rows.length },
        "findPlayersByLeagueId result",
      );
      return rows;
    },

    async findAvailableNpcUsers(leagueId: string) {
      log.debug({ leagueId }, "finding available NPC users");
      const existing = await db
        .select({ userId: leaguePlayer.userId })
        .from(leaguePlayer)
        .where(eq(leaguePlayer.leagueId, leagueId));
      const existingIds = existing.map((r) => r.userId);
      const rows = await db.select().from(user).where(
        existingIds.length > 0
          ? and(eq(user.isNpc, true), notInArray(user.id, existingIds))
          : eq(user.isNpc, true),
      );
      log.debug(
        { leagueId, count: rows.length },
        "findAvailableNpcUsers result",
      );
      return rows;
    },

    async updateSettings(
      id: string,
      data: {
        sportType: string;
        maxPlayers: number;
        rulesConfig: unknown;
      },
    ): Promise<LeagueRow> {
      log.debug({ leagueId: id }, "updating league settings");
      const [updated] = await db.update(league).set({
        sportType: data.sportType as "pokemon",
        maxPlayers: data.maxPlayers,
        rulesConfig: data.rulesConfig,
        updatedAt: new Date(),
      }).where(eq(league.id, id)).returning();
      log.debug({ leagueId: id }, "league settings updated");
      return updated;
    },

    async updateStatus(
      id: string,
      status: string,
    ): Promise<LeagueRow> {
      log.debug({ leagueId: id, status }, "updating league status");
      const [updated] = await db.update(league).set({
        status: status as "setup",
        updatedAt: new Date(),
      }).where(eq(league.id, id)).returning();
      log.debug({ leagueId: id }, "league status updated");
      return updated;
    },

    async countPlayers(leagueId: string): Promise<number> {
      log.debug({ leagueId }, "counting players in league");
      const [result] = await db.select({ count: count() }).from(leaguePlayer)
        .where(eq(leaguePlayer.leagueId, leagueId));
      const playerCount = result?.count ?? 0;
      log.debug({ leagueId, count: playerCount }, "countPlayers result");
      return playerCount;
    },

    async findPlayer(
      leagueId: string,
      userId: string,
    ): Promise<LeaguePlayerRow | null> {
      log.debug({ leagueId, userId }, "finding player in league");
      const [result] = await db.select().from(leaguePlayer).where(
        and(
          eq(leaguePlayer.leagueId, leagueId),
          eq(leaguePlayer.userId, userId),
        ),
      );
      log.debug({ leagueId, userId, found: !!result }, "findPlayer result");
      return result ?? null;
    },

    async replacePlayerUser(
      leagueId: string,
      oldUserId: string,
      newUserId: string,
    ): Promise<void> {
      log.debug(
        { leagueId, oldUserId, newUserId },
        "replacing player user in league",
      );
      await db.update(leaguePlayer).set({ userId: newUserId }).where(
        and(
          eq(leaguePlayer.leagueId, leagueId),
          eq(leaguePlayer.userId, oldUserId),
        ),
      );
      log.debug(
        { leagueId, oldUserId, newUserId },
        "player user replaced in league",
      );
    },

    async deletePlayer(leagueId: string, userId: string): Promise<void> {
      log.debug({ leagueId, userId }, "deleting player from league");
      await db.delete(leaguePlayer).where(
        and(
          eq(leaguePlayer.leagueId, leagueId),
          eq(leaguePlayer.userId, userId),
        ),
      );
      log.debug({ leagueId, userId }, "player deleted from league");
    },
  };
}

export type LeagueRepository = ReturnType<typeof createLeagueRepository>;
