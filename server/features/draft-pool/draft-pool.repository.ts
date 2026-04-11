import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { db } from "../../db/mod.ts";
import { draftPool, draftPoolItem } from "../../db/mod.ts";
import { logger } from "../../logger.ts";

export type Database = typeof db;

const log = logger.child({ module: "draft-pool.repository" });

type DraftPoolRow = typeof draftPool.$inferSelect;
type DraftPoolItemRow = typeof draftPoolItem.$inferSelect;
type NewDraftPoolItem = typeof draftPoolItem.$inferInsert;

export function createDraftPoolRepository(db: Database) {
  return {
    async create(leagueId: string, name: string): Promise<DraftPoolRow> {
      log.debug({ leagueId, name }, "inserting draft pool");
      const [pool] = await db.insert(draftPool).values({
        leagueId,
        name,
      }).returning();
      log.debug({ poolId: pool.id }, "draft pool inserted");
      return pool;
    },

    async createItems(items: NewDraftPoolItem[]): Promise<DraftPoolItemRow[]> {
      log.debug({ count: items.length }, "batch inserting draft pool items");
      const inserted = await db.insert(draftPoolItem).values(items)
        .returning();
      log.debug({ count: inserted.length }, "draft pool items inserted");
      return inserted;
    },

    async findByLeagueId(leagueId: string): Promise<DraftPoolRow | null> {
      log.debug({ leagueId }, "finding draft pool by league id");
      const [result] = await db.select().from(draftPool).where(
        eq(draftPool.leagueId, leagueId),
      );
      log.debug({ leagueId, found: !!result }, "findByLeagueId result");
      return result ?? null;
    },

    async findItemsByPoolId(
      poolId: string,
      opts: { onlyRevealed?: boolean } = {},
    ): Promise<DraftPoolItemRow[]> {
      log.debug(
        { poolId, onlyRevealed: opts.onlyRevealed ?? false },
        "finding items for draft pool",
      );
      const whereClause = opts.onlyRevealed
        ? and(
          eq(draftPoolItem.draftPoolId, poolId),
          sql`${draftPoolItem.revealedAt} is not null`,
        )
        : eq(draftPoolItem.draftPoolId, poolId);
      const items = await db.select().from(draftPoolItem).where(whereClause);
      log.debug({ poolId, count: items.length }, "findItemsByPoolId result");
      return items;
    },

    async countUnrevealedItems(poolId: string): Promise<number> {
      log.debug({ poolId }, "counting unrevealed items");
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(draftPoolItem)
        .where(
          and(
            eq(draftPoolItem.draftPoolId, poolId),
            isNull(draftPoolItem.revealedAt),
          ),
        );
      return row?.count ?? 0;
    },

    async revealNextItem(
      poolId: string,
      now: Date,
    ): Promise<
      { item: DraftPoolItemRow; remaining: number } | null
    > {
      log.debug({ poolId }, "revealing next draft pool item");
      const [next] = await db
        .select()
        .from(draftPoolItem)
        .where(
          and(
            eq(draftPoolItem.draftPoolId, poolId),
            isNull(draftPoolItem.revealedAt),
          ),
        )
        .orderBy(asc(draftPoolItem.revealOrder))
        .limit(1);
      if (!next) {
        log.debug({ poolId }, "no unrevealed items remain");
        return null;
      }
      const [updated] = await db
        .update(draftPoolItem)
        .set({ revealedAt: now })
        .where(eq(draftPoolItem.id, next.id))
        .returning();
      const remaining = await this.countUnrevealedItems(poolId);
      log.debug(
        { poolId, itemId: updated.id, remaining },
        "draft pool item revealed",
      );
      return { item: updated, remaining };
    },

    async revealAllItems(poolId: string, now: Date): Promise<number> {
      log.debug({ poolId }, "revealing all remaining draft pool items");
      const updated = await db
        .update(draftPoolItem)
        .set({ revealedAt: now })
        .where(
          and(
            eq(draftPoolItem.draftPoolId, poolId),
            isNull(draftPoolItem.revealedAt),
          ),
        )
        .returning({ id: draftPoolItem.id });
      log.debug(
        { poolId, count: updated.length },
        "all draft pool items revealed",
      );
      return updated.length;
    },

    async deleteByLeagueId(leagueId: string): Promise<void> {
      log.debug({ leagueId }, "deleting draft pool by league id");
      await db.delete(draftPool).where(eq(draftPool.leagueId, leagueId));
      log.debug({ leagueId }, "draft pool deleted");
    },
  };
}

export type DraftPoolRepository = ReturnType<typeof createDraftPoolRepository>;
