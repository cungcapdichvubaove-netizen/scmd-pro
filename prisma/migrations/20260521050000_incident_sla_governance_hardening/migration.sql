ALTER TABLE "incident_evidences"
  ADD COLUMN IF NOT EXISTS "locked_by_report_id" TEXT,
  ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "is_report_locked" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "incident_evidences_tenant_report_lock_idx"
  ON "incident_evidences" ("tenant_id", "is_report_locked");
