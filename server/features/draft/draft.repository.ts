import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import type { db } from "../../db/mod.ts";
import { draft, draftPick } from "../../db/mod.ts";
import { logger } from "../../logger.ts";

export type Database = typeof db;

const log = logger.child({ module: "draft.repository" });

type DraftRow = typeof draft.$inferSelect;
type DraftPickRow = typeof draftPick.$inferSelect;

export interface CreateDraftInput {
  leagueId: string;
  poolId: string;
  format: "snake";
  pickOrder: string[];
}

export interface CreatePickInput {
  draftId: string;
  leaguePlayerId: string;
  poolItemId: string;
  pickNumber: number;
  autoPicked?: boolean;
}

export interface UpdateDraftStatusTimestamps {
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Thrown by createPick when a unique constraint violation indicates that
 * another transaction has already picked the same pool item (or claimed the
 * same pick number). The service maps this to a tRPC CONFLICT response so
 * clients can react to draft race conditions gracefully.
 */
export class DraftPickConflictError extends Error {
  constructor(message = "draft pick conflict") {
    super(message);
    this.name = "DraftPickConflictError";
  }
}

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

    async findById(id: string): Promise<DraftRow | null> {
      log.debug({ draftId: id }, "finding draft by id");
      const [result] = await db.select().from(draft).where(eq(draft.id, id));
      return result ?? null;
    },

    async create(input: CreateDraftInput): Promise<DraftRow> {
      log.debug(
        { leagueId: input.leagueId, poolId: input.poolId },
        "inserting draft row",
      );
      const [row] = await db.insert(draft).values({
        leagueId: input.leagueId,
        poolId: input.poolId,
        format: input.format,
        pickOrder: input.pickOrder,
      }).returning();
      log.debug({ draftId: row.id }, "draft inserted");
      return row;
    },

    async updateStatus(
      id: string,
      status: "pending" | "in_progress" | "complete",
      timestamps: UpdateDraftStatusTimestamps,
    ): Promise<DraftRow> {
      log.debug({ draftId: id, status }, "updating draft status");
      const updates: Record<string, unknown> = { status };
      if (timestamps.startedAt !== undefined) {
        updates.startedAt = timestamps.startedAt;
      }
      if (timestamps.completedAt !== undefined) {
        updates.completedAt = timestamps.completedAt;
      }
      const [updated] = await db.update(draft).set(updates).where(
        eq(draft.id, id),
      ).returning();
      return updated;
    },

    async updateTurnDeadline(
      id: string,
      deadline: Date | null,
    ): Promise<void> {
      log.debug(
        { draftId: id, deadline: deadline?.toISOString() ?? null },
        "updating draft turn deadline",
      );
      await db.update(draft).set({ currentTurnDeadline: deadline }).where(
        eq(draft.id, id),
      );
    },

    async listActiveDraftsWithDeadlines(): Promise<
      Array<Pick<DraftRow, "id" | "leagueId" | "currentTurnDeadline">>
    > {
      log.debug("listing active drafts with deadlines");
      const rows = await db.select({
        id: draft.id,
        leagueId: draft.leagueId,
        currentTurnDeadline: draft.currentTurnDeadline,
      }).from(draft).where(
        and(
          eq(draft.status, "in_progress"),
          isNotNull(draft.currentTurnDeadline),
        ),
      );
      return rows;
    },

    async incrementCurrentPick(id: string): Promise<number> {
      log.debug({ draftId: id }, "incrementing draft currentPick");
      const [updated] = await db.update(draft).set({
        currentPick: sql`${draft.currentPick} + 1`,
      }).where(eq(draft.id, id)).returning({
        currentPick: draft.currentPick,
      });
      return updated.currentPick;
    },

    async listPicks(draftId: string): Promise<DraftPickRow[]> {
      log.debug({ draftId }, "listing picks for draft");
      const rows = await db.select().from(draftPick).where(
        eq(draftPick.draftId, draftId),
      ).orderBy(asc(draftPick.pickNumber));
      return rows;
    },

    async createPick(input: CreatePickInput): Promise<DraftPickRow> {
      log.debug(
        {
          draftId: input.draftId,
          poolItemId: input.poolItemId,
          pickNumber: input.pickNumber,
        },
        "inserting draft pick",
      );
      try {
        const [row] = await db.insert(draftPick).values({
          draftId: input.draftId,
          leaguePlayerId: input.leaguePlayerId,
          poolItemId: input.poolItemId,
          pickNumber: input.pickNumber,
          autoPicked: input.autoPicked ?? false,
        }).returning();
        return row;
      } catch (err) {
        if (isUniqueViolation(err)) {
          log.debug(
            {
              draftId: input.draftId,
              poolItemId: input.poolItemId,
              pickNumber: input.pickNumber,
            },
            "draft pick unique violation",
          );
          throw new DraftPickConflictError(
            "draft pick conflict: pool item or pick number already taken",
          );
        }
        throw err;
      }
    },

    async findPickByPoolItem(
      draftId: string,
      poolItemId: string,
    ): Promise<DraftPickRow | null> {
      log.debug({ draftId, poolItemId }, "finding pick by pool item");
      const [result] = await db.select().from(draftPick).where(
        sql`${draftPick.draftId} = ${draftId} AND ${draftPick.poolItemId} = ${poolItemId}`,
      );
      return result ?? null;
    },
  };
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybe = err as { code?: string; cause?: { code?: string } };
  return maybe.code === "23505" || maybe.cause?.code === "23505";
}

export type DraftRepository = ReturnType<typeof createDraftRepository>;
