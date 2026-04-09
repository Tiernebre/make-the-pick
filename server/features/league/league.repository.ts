import { and, eq } from "drizzle-orm";
import type { db } from "../../db/mod.ts";
import { league, leaguePlayer, user } from "../../db/mod.ts";
import { logger } from "../../logger.ts";

export type Database = typeof db;

const log = logger.child({ module: "league.repository" });

type LeagueRow = typeof league.$inferSelect;
type LeaguePlayerRow = typeof leaguePlayer.$inferSelect;

export function createLeagueRepository(db: Database) {
  return {
    createWithCreator(
      userId: string,
      data: { name: string; inviteCode: string },
    ): Promise<LeagueRow> {
      log.debug(
        { userId, name: data.name },
        "inserting league + creator player",
      );
      return db.transaction(async (tx) => {
        const [newLeague] = await tx.insert(league).values({
          id: crypto.randomUUID(),
          name: data.name,
          inviteCode: data.inviteCode,
          createdBy: userId,
        }).returning();
        log.debug({ leagueId: newLeague.id }, "league row inserted");
        await tx.insert(leaguePlayer).values({
          id: crypto.randomUUID(),
          leagueId: newLeague.id,
          userId,
          role: "creator",
        });
        log.debug(
          { leagueId: newLeague.id, userId },
          "creator player row inserted",
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

    async findAllByUserId(userId: string): Promise<LeagueRow[]> {
      log.debug({ userId }, "finding all leagues for user");
      const rows = await db
        .select({ league })
        .from(league)
        .innerJoin(leaguePlayer, eq(league.id, leaguePlayer.leagueId))
        .where(eq(leaguePlayer.userId, userId));
      log.debug({ userId, count: rows.length }, "findAllByUserId result");
      return rows.map((row) => row.league);
    },

    async addPlayer(
      leagueId: string,
      userId: string,
    ): Promise<LeaguePlayerRow> {
      log.debug({ leagueId, userId }, "inserting league player");
      const [player] = await db.insert(leaguePlayer).values({
        id: crypto.randomUUID(),
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
  };
}

export type LeagueRepository = ReturnType<typeof createLeagueRepository>;
