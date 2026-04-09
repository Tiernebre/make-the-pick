import { eq } from "drizzle-orm";
import type { db } from "../../db/mod.ts";
import { draft } from "../../db/mod.ts";
import { logger } from "../../logger.ts";

export type Database = typeof db;

const log = logger.child({ module: "draft.repository" });

type DraftRow = typeof draft.$inferSelect;

export function createDraftRepository(db: Database) {
  return {
    async findByLeagueId(leagueId: string): Promise<DraftRow | null> {
      log.debug({ leagueId }, "finding draft by league id");
      const [result] = await db.select().from(draft).where(
        eq(draft.leagueId, leagueId),
      );
      log.debug({ leagueId, found: !!result }, "findByLeagueId result");
      return result ?? null;
    },
  };
}

export type DraftRepository = ReturnType<typeof createDraftRepository>;
