ALTER TYPE "public"."league_status" ADD VALUE IF NOT EXISTS 'pooling' BEFORE 'drafting';--> statement-breakpoint
ALTER TYPE "public"."league_status" ADD VALUE IF NOT EXISTS 'scouting' BEFORE 'drafting';
