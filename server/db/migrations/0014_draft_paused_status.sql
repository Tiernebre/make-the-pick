ALTER TYPE "public"."draft_status" ADD VALUE 'paused' BEFORE 'complete';--> statement-breakpoint
ALTER TABLE "draft" ADD COLUMN "paused_at" timestamp with time zone;