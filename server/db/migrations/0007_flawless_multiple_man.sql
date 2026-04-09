ALTER TABLE "league" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "league" ALTER COLUMN "status" SET DEFAULT 'setup'::text;--> statement-breakpoint
DROP TYPE "public"."league_status";--> statement-breakpoint
CREATE TYPE "public"."league_status" AS ENUM('setup', 'drafting', 'competing', 'complete');--> statement-breakpoint
ALTER TABLE "league" ALTER COLUMN "status" SET DEFAULT 'setup'::"public"."league_status";--> statement-breakpoint
ALTER TABLE "league" ALTER COLUMN "status" SET DATA TYPE "public"."league_status" USING "status"::"public"."league_status";