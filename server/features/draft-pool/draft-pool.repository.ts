import { eq } from "drizzle-orm";
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

    async findItemsByPoolId(poolId: string): Promise<DraftPoolItemRow[]> {
      log.debug({ poolId }, "finding items for draft pool");
      const items = await db.select().from(draftPoolItem).where(
        eq(draftPoolItem.draftPoolId, poolId),
      );
      log.debug({ poolId, count: items.length }, "findItemsByPoolId result");
      return items;
    },

    async deleteByLeagueId(leagueId: string): Promise<void> {
      log.debug({ leagueId }, "deleting draft pool by league id");
      await db.delete(draftPool).where(eq(draftPool.leagueId, leagueId));
      log.debug({ leagueId }, "draft pool deleted");
    },
  };
}

export type DraftPoolRepository = ReturnType<typeof createDraftPoolRepository>;
