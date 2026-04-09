-- Clear league data that has non-UUID text IDs before converting columns
DELETE FROM "league_player";--> statement-breakpoint
DELETE FROM "league";--> statement-breakpoint
-- Drop foreign key so both columns can be converted independently
ALTER TABLE "league_player" DROP CONSTRAINT "league_player_league_id_league_id_fk";--> statement-breakpoint
-- Convert league.id first (parent table)
ALTER TABLE "league" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "league" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
-- Convert league_player columns
ALTER TABLE "league_player" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "league_player" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "league_player" ALTER COLUMN "league_id" SET DATA TYPE uuid USING "league_id"::uuid;--> statement-breakpoint
-- Re-add foreign key
ALTER TABLE "league_player" ADD CONSTRAINT "league_player_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "league"("id") ON DELETE CASCADE;
