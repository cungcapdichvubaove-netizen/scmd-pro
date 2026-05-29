ALTER TABLE "vendor_scorecards"
  ADD COLUMN IF NOT EXISTS "shift_coverage_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "patrol_compliance_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "incident_sla_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "evidence_completeness_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "manual_audit_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "formula_version" TEXT NOT NULL DEFAULT 'monthly-acceptance-scorecard-v2.5-groups',
  ADD COLUMN IF NOT EXISTS "score_breakdown" JSONB;

UPDATE "vendor_scorecards"
SET
  "shift_coverage_rate" = COALESCE("discipline_rate", 0),
  "patrol_compliance_rate" = COALESCE("patrol_rate", 0),
  "incident_sla_rate" = COALESCE("incident_rate", 0),
  "evidence_completeness_rate" = COALESCE(("metrics" -> 'scorecard' -> 'groups' -> 3 ->> 'rawScore')::DOUBLE PRECISION, 0),
  "manual_audit_rate" = COALESCE(("metrics" -> 'scorecard' -> 'groups' -> 4 ->> 'rawScore')::DOUBLE PRECISION, 0),
  "formula_version" = COALESCE(NULLIF("formula_version", ''), COALESCE("metrics" -> 'scorecard' ->> 'formulaVersion', 'monthly-acceptance-scorecard-v2.5-groups')),
  "score_breakdown" = COALESCE("score_breakdown", "metrics" -> 'scorecard')
WHERE
  "score_breakdown" IS NULL
  OR "formula_version" = 'monthly-acceptance-scorecard-v2.5-groups';