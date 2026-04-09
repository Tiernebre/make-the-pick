import { and, eq, max } from "drizzle-orm";
import type { db } from "../../db/mod.ts";
import { watchlistItem } from "../../db/mod.ts";
import { logger } from "../../logger.ts";

export type Database = typeof db;

const log = logger.child({ module: "watchlist.repository" });

type WatchlistItemRow = typeof watchlistItem.$inferSelect;

export function createWatchlistRepository(db: Database) {
  return {
    async findByLeaguePlayerId(
      leaguePlayerId: string,
    ): Promise<WatchlistItemRow[]> {
      log.debug({ leaguePlayerId }, "finding watchlist items by league player");
      const items = await db.select().from(watchlistItem)
        .where(eq(watchlistItem.leaguePlayerId, leaguePlayerId))
        .orderBy(watchlistItem.position);
      log.debug(
        { leaguePlayerId, count: items.length },
        "findByLeaguePlayerId result",
      );
      return items;
    },

    async findByLeaguePlayerIdAndDraftPoolItemId(
      leaguePlayerId: string,
      draftPoolItemId: string,
    ): Promise<WatchlistItemRow | null> {
      log.debug(
        { leaguePlayerId, draftPoolItemId },
        "finding watchlist item by player and pool item",
      );
      const [result] = await db.select().from(watchlistItem).where(
        and(
          eq(watchlistItem.leaguePlayerId, leaguePlayerId),
          eq(watchlistItem.draftPoolItemId, draftPoolItemId),
        ),
      );
      return result ?? null;
    },

    async getMaxPosition(leaguePlayerId: string): Promise<number | null> {
      log.debug({ leaguePlayerId }, "getting max watchlist position");
      const [result] = await db.select({
        maxPosition: max(watchlistItem.position),
      }).from(watchlistItem).where(
        eq(watchlistItem.leaguePlayerId, leaguePlayerId),
      );
      const value = result?.maxPosition;
      return value != null ? Number(value) : null;
    },

    async create(data: {
      leaguePlayerId: string;
      draftPoolItemId: string;
      position: number;
    }): Promise<WatchlistItemRow> {
      log.debug(data, "inserting watchlist item");
      const [item] = await db.insert(watchlistItem).values(data).returning();
      log.debug({ id: item.id }, "watchlist item inserted");
      return item;
    },

    async deleteByLeaguePlayerIdAndDraftPoolItemId(
      leaguePlayerId: string,
      draftPoolItemId: string,
    ): Promise<void> {
      log.debug(
        { leaguePlayerId, draftPoolItemId },
        "deleting watchlist item",
      );
      await db.delete(watchlistItem).where(
        and(
          eq(watchlistItem.leaguePlayerId, leaguePlayerId),
          eq(watchlistItem.draftPoolItemId, draftPoolItemId),
        ),
      );
    },

    async replaceAllPositions(
      leaguePlayerId: string,
      orderedItemIds: string[],
    ): Promise<void> {
      log.debug(
        { leaguePlayerId, count: orderedItemIds.length },
        "replacing all watchlist positions",
      );
      await db.transaction(async (tx) => {
        for (let i = 0; i < orderedItemIds.length; i++) {
          await tx.update(watchlistItem)
            .set({ position: i })
            .where(
              and(
                eq(watchlistItem.id, orderedItemIds[i]),
                eq(watchlistItem.leaguePlayerId, leaguePlayerId),
              ),
            );
        }
      });
    },
  };
}

export type WatchlistRepository = ReturnType<typeof createWatchlistRepository>;
