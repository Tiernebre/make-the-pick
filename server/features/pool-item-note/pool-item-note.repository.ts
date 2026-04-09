import { and, eq } from "drizzle-orm";
import type { db } from "../../db/mod.ts";
import { poolItemNote } from "../../db/mod.ts";
import { logger } from "../../logger.ts";

export type Database = typeof db;

const log = logger.child({ module: "pool-item-note.repository" });

type PoolItemNoteRow = typeof poolItemNote.$inferSelect;

export function createPoolItemNoteRepository(db: Database) {
  return {
    async findByLeaguePlayerId(
      leaguePlayerId: string,
    ): Promise<PoolItemNoteRow[]> {
      log.debug({ leaguePlayerId }, "finding notes by league player");
      const notes = await db.select().from(poolItemNote)
        .where(eq(poolItemNote.leaguePlayerId, leaguePlayerId));
      log.debug(
        { leaguePlayerId, count: notes.length },
        "findByLeaguePlayerId result",
      );
      return notes;
    },

    async upsert(data: {
      leaguePlayerId: string;
      draftPoolItemId: string;
      content: string;
    }): Promise<PoolItemNoteRow> {
      log.debug(data, "upserting pool item note");
      const [note] = await db.insert(poolItemNote).values({
        leaguePlayerId: data.leaguePlayerId,
        draftPoolItemId: data.draftPoolItemId,
        content: data.content,
      }).onConflictDoUpdate({
        target: [poolItemNote.leaguePlayerId, poolItemNote.draftPoolItemId],
        set: {
          content: data.content,
          updatedAt: new Date(),
        },
      }).returning();
      log.debug({ id: note.id }, "pool item note upserted");
      return note;
    },

    async deleteByLeaguePlayerIdAndDraftPoolItemId(
      leaguePlayerId: string,
      draftPoolItemId: string,
    ): Promise<void> {
      log.debug(
        { leaguePlayerId, draftPoolItemId },
        "deleting pool item note",
      );
      await db.delete(poolItemNote).where(
        and(
          eq(poolItemNote.leaguePlayerId, leaguePlayerId),
          eq(poolItemNote.draftPoolItemId, draftPoolItemId),
        ),
      );
    },
  };
}

export type PoolItemNoteRepository = ReturnType<
  typeof createPoolItemNoteRepository
>;
