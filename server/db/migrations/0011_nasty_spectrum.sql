CREATE TABLE "pool_item_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_player_id" uuid NOT NULL,
	"draft_pool_item_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pool_item_note_unique" UNIQUE("league_player_id","draft_pool_item_id")
);
--> statement-breakpoint
ALTER TABLE "pool_item_note" ADD CONSTRAINT "pool_item_note_league_player_id_league_player_id_fk" FOREIGN KEY ("league_player_id") REFERENCES "public"."league_player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_item_note" ADD CONSTRAINT "pool_item_note_draft_pool_item_id_draft_pool_item_id_fk" FOREIGN KEY ("draft_pool_item_id") REFERENCES "public"."draft_pool_item"("id") ON DELETE cascade ON UPDATE no action;