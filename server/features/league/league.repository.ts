import { and, eq } from "drizzle-orm";
import type { db } from "../../db/mod.ts";
import { league, leaguePlayer, user } from "../../db/mod.ts";

export type Database = typeof db;

type LeagueRow = typeof league.$inferSelect;
type LeaguePlayerRow = typeof leaguePlayer.$inferSelect;

export function createLeagueRepository(db: Database) {
  return {
    createWithCreator(
      userId: string,
      data: { name: string; inviteCode: string },
    ): Promise<LeagueRow> {
      return db.transaction(async (tx) => {
        const [newLeague] = await tx.insert(league).values({
          id: crypto.randomUUID(),
          name: data.name,
          inviteCode: data.inviteCode,
          createdBy: userId,
        }).returning();
        await tx.insert(leaguePlayer).values({
          id: crypto.randomUUID(),
          leagueId: newLeague.id,
          userId,
          role: "creator",
        });
        return newLeague;
      });
    },

    async findById(id: string): Promise<LeagueRow | null> {
      const [result] = await db.select().from(league).where(
        eq(league.id, id),
      );
      return result ?? null;
    },

    async findByInviteCode(inviteCode: string): Promise<LeagueRow | null> {
      const [result] = await db.select().from(league).where(
        eq(league.inviteCode, inviteCode),
      );
      return result ?? null;
    },

    async findAllByUserId(userId: string): Promise<LeagueRow[]> {
      const rows = await db
        .select({ league })
        .from(league)
        .innerJoin(leaguePlayer, eq(league.id, leaguePlayer.leagueId))
        .where(eq(leaguePlayer.userId, userId));
      return rows.map((row) => row.league);
    },

    async addPlayer(
      leagueId: string,
      userId: string,
    ): Promise<LeaguePlayerRow> {
      const [player] = await db.insert(leaguePlayer).values({
        id: crypto.randomUUID(),
        leagueId,
        userId,
        role: "member",
      }).returning();
      return player;
    },

    async deleteById(id: string): Promise<void> {
      await db.delete(league).where(eq(league.id, id));
    },

    async findPlayersByLeagueId(leagueId: string) {
      const rows = await db
        .select({
          id: leaguePlayer.id,
          userId: leaguePlayer.userId,
          name: user.name,
          role: leaguePlayer.role,
          joinedAt: leaguePlayer.joinedAt,
        })
        .from(leaguePlayer)
        .innerJoin(user, eq(leaguePlayer.userId, user.id))
        .where(eq(leaguePlayer.leagueId, leagueId));
      return rows;
    },

    async findPlayer(
      leagueId: string,
      userId: string,
    ): Promise<LeaguePlayerRow | null> {
      const [result] = await db.select().from(leaguePlayer).where(
        and(
          eq(leaguePlayer.leagueId, leagueId),
          eq(leaguePlayer.userId, userId),
        ),
      );
      return result ?? null;
    },
  };
}

export type LeagueRepository = ReturnType<typeof createLeagueRepository>;
