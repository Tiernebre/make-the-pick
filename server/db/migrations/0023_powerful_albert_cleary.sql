ALTER TABLE "draft_pick" DROP CONSTRAINT "draft_pick_league_player_id_league_player_id_fk";
--> statement-breakpoint
ALTER TABLE "draft_pick" DROP CONSTRAINT "draft_pick_pool_item_id_draft_pool_item_id_fk";
--> statement-breakpoint
ALTER TABLE "draft_pick" ADD CONSTRAINT "draft_pick_league_player_id_league_player_id_fk" FOREIGN KEY ("league_player_id") REFERENCES "public"."league_player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_pick" ADD CONSTRAINT "draft_pick_pool_item_id_draft_pool_item_id_fk" FOREIGN KEY ("pool_item_id") REFERENCES "public"."draft_pool_item"("id") ON DELETE cascade ON UPDATE no action;