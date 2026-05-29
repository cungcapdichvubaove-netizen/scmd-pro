ALTER TABLE "monthly_acceptance_reports"
  ADD COLUMN IF NOT EXISTS "revision_number" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "revision_root_id" TEXT,
  ADD COLUMN IF NOT EXISTS "previous_revision_id" TEXT,
  ADD COLUMN IF NOT EXISTS "superseded_by_report_id" TEXT,
  ADD COLUMN IF NOT EXISTS "superseded_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "superseded_by" TEXT,
  ADD COLUMN IF NOT EXISTS "contract_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "vendor_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "site_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "sla_policy_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "penalty_policy_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "score_formula_version" TEXT NOT NULL DEFAULT 'monthly-acceptance-v1',
  ADD COLUMN IF NOT EXISTS "violation_snapshots" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "evidence_snapshots" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "penalty_calculation_details" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "generated_data_hash" TEXT NOT NULL DEFAULT '';

UPDATE "monthly_acceptance_reports"
SET
  "revision_root_id" = COALESCE("revision_root_id", "id"),
  "vendor_snapshot" = COALESCE("vendor_snapshot", "summary" -> 'vendor', jsonb_build_object('id', "vendor_id")),
  "contract_snapshot" = COALESCE(
    "contract_snapshot",
    CASE
      WHEN "contract_id" IS NOT NULL THEN jsonb_build_object('id', "contract_id")
      ELSE NULL
    END
  ),
  "site_snapshot" = COALESCE(
    "site_snapshot",
    CASE
      WHEN "site_id" IS NOT NULL THEN jsonb_build_object('id', "site_id")
      ELSE NULL
    END
  ),
  "generated_data_hash" = CASE
    WHEN COALESCE("generated_data_hash", '') <> '' THEN "generated_data_hash"
    ELSE md5(COALESCE("summary"::text, '{}'::text) || ':' || "id")
  END;

ALTER TABLE "monthly_acceptance_reports"
  ALTER COLUMN "vendor_snapshot" SET NOT NULL;

DROP INDEX IF EXISTS "monthly_acceptance_reports_scope_month_key";

CREATE UNIQUE INDEX IF NOT EXISTS "monthly_acceptance_reports_scope_month_revision_key"
  ON "monthly_acceptance_reports" ("tenant_id", "vendor_id", "contract_id", "site_id", "month", "revision_number");

CREATE UNIQUE INDEX IF NOT EXISTS "monthly_acceptance_reports_previous_revision_id_key"
  ON "monthly_acceptance_reports" ("previous_revision_id");

CREATE UNIQUE INDEX IF NOT EXISTS "monthly_acceptance_reports_superseded_by_report_id_key"
  ON "monthly_acceptance_reports" ("superseded_by_report_id");

CREATE INDEX IF NOT EXISTS "monthly_acceptance_reports_tenant_revision_root_idx"
  ON "monthly_acceptance_reports" ("tenant_id", "revision_root_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'monthly_acceptance_reports_previous_revision_id_fkey'
      AND table_name = 'monthly_acceptance_reports'
  ) THEN
    ALTER TABLE "monthly_acceptance_reports"
      ADD CONSTRAINT "monthly_acceptance_reports_previous_revision_id_fkey"
      FOREIGN KEY ("previous_revision_id")
      REFERENCES "monthly_acceptance_reports"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'monthly_acceptance_reports_superseded_by_report_id_fkey'
      AND table_name = 'monthly_acceptance_reports'
  ) THEN
    ALTER TABLE "monthly_acceptance_reports"
      ADD CONSTRAINT "monthly_acceptance_reports_superseded_by_report_id_fkey"
      FOREIGN KEY ("superseded_by_report_id")
      REFERENCES "monthly_acceptance_reports"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
