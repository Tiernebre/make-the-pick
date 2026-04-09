CREATE TYPE "public"."sport_type" AS ENUM('pokemon');--> statement-breakpoint
ALTER TABLE "league" ADD COLUMN "sport_type" "sport_type";--> statement-breakpoint
ALTER TABLE "league" ADD COLUMN "max_players" integer;