ALTER TABLE "draft_pool_item" ADD COLUMN "reveal_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "draft_pool_item" ADD COLUMN "revealed_at" timestamp with time zone;