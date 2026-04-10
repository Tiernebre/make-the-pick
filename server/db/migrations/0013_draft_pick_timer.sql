ALTER TABLE "draft" ADD COLUMN "current_turn_deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "draft_pick" ADD COLUMN "auto_picked" boolean DEFAULT false NOT NULL;