-- V.5.4.0.3 - Patrol checkpoint scope hardening

ALTER TABLE "checkpoints"
  ADD COLUMN IF NOT EXISTS "site_id" TEXT,
  ADD COLUMN IF NOT EXISTS "guard_post_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checkpoints_site_id_fkey'
  ) THEN
    ALTER TABLE "checkpoints"
      ADD CONSTRAINT "checkpoints_site_id_fkey"
      FOREIGN KEY ("site_id") REFERENCES "sites"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checkpoints_guard_post_id_fkey'
  ) THEN
    ALTER TABLE "checkpoints"
      ADD CONSTRAINT "checkpoints_guard_post_id_fkey"
      FOREIGN KEY ("guard_post_id") REFERENCES "guard_posts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "checkpoints_tenant_site_idx" ON "checkpoints" ("tenant_id", "site_id");
CREATE INDEX IF NOT EXISTS "checkpoints_tenant_guard_post_idx" ON "checkpoints" ("tenant_id", "guard_post_id");
