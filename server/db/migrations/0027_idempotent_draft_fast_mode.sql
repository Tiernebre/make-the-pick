DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft' AND column_name = 'fast_mode'
  ) THEN
    ALTER TABLE "draft" ADD COLUMN "fast_mode" boolean DEFAULT false NOT NULL;
  END IF;
END
$$;
