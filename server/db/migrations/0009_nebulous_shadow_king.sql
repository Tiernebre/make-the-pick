CREATE TYPE "public"."draft_format" AS ENUM('snake');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('pending', 'in_progress', 'complete');--> statement-breakpoint
CREATE TABLE "draft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"pool_id" uuid NOT NULL,
	"format" "draft_format" DEFAULT 'snake' NOT NULL,
	"status" "draft_status" DEFAULT 'pending' NOT NULL,
	"pick_order" jsonb NOT NULL,
	"current_pick" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "draft_league_id_unique" UNIQUE("league_id")
);
--> statement-breakpoint
ALTER TABLE "draft" ADD CONSTRAINT "draft_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft" ADD CONSTRAINT "draft_pool_id_draft_pool_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."draft_pool"("id") ON DELETE no action ON UPDATE no action;