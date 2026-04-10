CREATE TABLE "draft_pick" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"league_player_id" uuid NOT NULL,
	"pool_item_id" uuid NOT NULL,
	"pick_number" integer NOT NULL,
	"picked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "draft_pick_position_unique" UNIQUE("draft_id","pick_number"),
	CONSTRAINT "draft_pick_item_unique" UNIQUE("draft_id","pool_item_id")
);
--> statement-breakpoint
ALTER TABLE "draft_pick" ADD CONSTRAINT "draft_pick_draft_id_draft_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_pick" ADD CONSTRAINT "draft_pick_league_player_id_league_player_id_fk" FOREIGN KEY ("league_player_id") REFERENCES "public"."league_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_pick" ADD CONSTRAINT "draft_pick_pool_item_id_draft_pool_item_id_fk" FOREIGN KEY ("pool_item_id") REFERENCES "public"."draft_pool_item"("id") ON DELETE no action ON UPDATE no action;