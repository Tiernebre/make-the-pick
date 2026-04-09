CREATE TABLE "draft_pool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "draft_pool_league_id_unique" UNIQUE("league_id")
);
--> statement-breakpoint
CREATE TABLE "draft_pool_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_pool_id" uuid NOT NULL,
	"name" text NOT NULL,
	"thumbnail_url" text,
	"metadata" jsonb,
	CONSTRAINT "draft_pool_item_unique" UNIQUE("draft_pool_id","name")
);
--> statement-breakpoint
ALTER TABLE "draft_pool" ADD CONSTRAINT "draft_pool_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_pool_item" ADD CONSTRAINT "draft_pool_item_draft_pool_id_draft_pool_id_fk" FOREIGN KEY ("draft_pool_id") REFERENCES "public"."draft_pool"("id") ON DELETE cascade ON UPDATE no action;