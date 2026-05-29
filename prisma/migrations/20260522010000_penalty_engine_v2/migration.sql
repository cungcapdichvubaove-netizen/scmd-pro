CREATE TABLE IF NOT EXISTS "contract_penalty_rules" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "clause_code" TEXT,
  "rule_name" TEXT NOT NULL,
  "violation_code" TEXT NOT NULL,
  "penalty_unit" TEXT NOT NULL,
  "amount" DECIMAL(18,2),
  "percent_value" DECIMAL(8,4),
  "grace_count" INTEGER NOT NULL DEFAULT 0,
  "max_monthly_penalty" DECIMAL(18,2),
  "repeat_escalation" JSONB,
  "evidence_required" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "extracted_from_ai" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_penalty_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_penalty_rules_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "contract_penalty_rules_tenant_contract_active_idx"
  ON "contract_penalty_rules" ("tenant_id", "contract_id", "is_active");
CREATE INDEX IF NOT EXISTS "contract_penalty_rules_tenant_violation_active_idx"
  ON "contract_penalty_rules" ("tenant_id", "violation_code", "is_active");
CREATE INDEX IF NOT EXISTS "contract_penalty_rules_tenant_contract_unit_idx"
  ON "contract_penalty_rules" ("tenant_id", "contract_id", "penalty_unit");

ALTER TABLE "contract_penalty_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contract_penalty_rules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contract_penalty_rules_tenant_isolation" ON "contract_penalty_rules";
CREATE POLICY "contract_penalty_rules_tenant_isolation" ON "contract_penalty_rules"
FOR ALL
USING (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
)
WITH CHECK (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
);

ALTER TABLE "penalty_items"
  ADD COLUMN IF NOT EXISTS "penalty_rule_id" TEXT,
  ADD COLUMN IF NOT EXISTS "base_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'PER_OCCURRENCE',
  ADD COLUMN IF NOT EXISTS "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "grace_applied" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cap_applied" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "final_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "calculation_detail" JSONB,
  ADD COLUMN IF NOT EXISTS "contract_version_snapshot" JSONB;

CREATE INDEX IF NOT EXISTS "penalty_items_tenant_penalty_rule_idx"
  ON "penalty_items" ("tenant_id", "penalty_rule_id");

UPDATE "penalty_items"
SET
  "base_amount" = COALESCE("base_amount", "amount", 0),
  "final_amount" = COALESCE(NULLIF("final_amount", 0), "amount", 0),
  "unit" = COALESCE(NULLIF("unit", ''), 'PER_OCCURRENCE'),
  "quantity" = COALESCE(NULLIF("quantity", 0), 1),
  "calculation_detail" = COALESCE(
    "calculation_detail",
    jsonb_build_object(
      'migration', '20260522010000_penalty_engine_v2',
      'legacyAmount', COALESCE("amount", 0)
    )
  )
WHERE "base_amount" = 0
   OR "final_amount" = 0
   OR "calculation_detail" IS NULL;

WITH contract_rules AS (
  SELECT
    c.id AS contract_id,
    c.tenant_id,
    ordinality AS sort_order,
    rule
  FROM "contracts" c,
  LATERAL jsonb_array_elements(COALESCE(c."penalty_policy"->'rules', '[]'::jsonb)) WITH ORDINALITY AS rules(rule, ordinality)
)
INSERT INTO "contract_penalty_rules" (
  "id",
  "tenant_id",
  "contract_id",
  "clause_code",
  "rule_name",
  "violation_code",
  "penalty_unit",
  "amount",
  "percent_value",
  "grace_count",
  "max_monthly_penalty",
  "repeat_escalation",
  "evidence_required",
  "is_active",
  "extracted_from_ai",
  "sort_order",
  "metadata"
)
SELECT
  gen_random_uuid()::text,
  cr.tenant_id,
  cr.contract_id,
  NULLIF(cr.rule->>'clauseCode', ''),
  COALESCE(NULLIF(cr.rule->>'violationName', ''), NULLIF(cr.rule->>'ruleName', ''), NULLIF(cr.rule->>'violationCode', ''), 'Penalty rule'),
  COALESCE(NULLIF(cr.rule->>'violationCode', ''), 'UNMAPPED_VIOLATION'),
  CASE UPPER(COALESCE(cr.rule->>'unit', cr.rule->>'penaltyUnit', 'PER_OCCURRENCE'))
    WHEN 'CASE' THEN 'PER_OCCURRENCE'
    WHEN 'SHIFT' THEN 'PER_OCCURRENCE'
    WHEN 'DAY' THEN 'PER_OCCURRENCE'
    WHEN 'MONTH' THEN 'PER_OCCURRENCE'
    ELSE UPPER(COALESCE(cr.rule->>'unit', cr.rule->>'penaltyUnit', 'PER_OCCURRENCE'))
  END,
  CASE
    WHEN NULLIF(cr.rule->>'amount', '') IS NOT NULL THEN (cr.rule->>'amount')::DECIMAL(18,2)
    WHEN NULLIF(cr.rule->>'penaltyAmount', '') IS NOT NULL THEN (cr.rule->>'penaltyAmount')::DECIMAL(18,2)
    ELSE NULL
  END,
  CASE
    WHEN NULLIF(cr.rule->>'percentValue', '') IS NOT NULL THEN (cr.rule->>'percentValue')::DECIMAL(8,4)
    WHEN NULLIF(cr.rule->>'percent', '') IS NOT NULL THEN (cr.rule->>'percent')::DECIMAL(8,4)
    ELSE NULL
  END,
  COALESCE(
    NULLIF(cr.rule->>'graceCount', '')::INTEGER,
    0
  ),
  CASE
    WHEN NULLIF(cr.rule->>'maxMonthlyPenalty', '') IS NOT NULL THEN (cr.rule->>'maxMonthlyPenalty')::DECIMAL(18,2)
    WHEN NULLIF(cr.rule->>'monthlyCap', '') IS NOT NULL THEN (cr.rule->>'monthlyCap')::DECIMAL(18,2)
    ELSE NULL
  END,
  CASE
    WHEN jsonb_typeof(cr.rule->'repeatEscalation') = 'array' THEN cr.rule->'repeatEscalation'
    WHEN (cr.rule ? 'repeatEscalationMultiplier') OR (cr.rule ? 'repeatEscalationThreshold') THEN jsonb_build_array(
      jsonb_build_object(
        'afterCount', COALESCE(NULLIF(cr.rule->>'repeatEscalationThreshold', '')::INTEGER, 2),
        'multiplier', COALESCE(NULLIF(cr.rule->>'repeatEscalationMultiplier', '')::DECIMAL(10,4), 1.5)
      )
    )
    ELSE NULL
  END,
  COALESCE((cr.rule->>'evidenceRequired')::BOOLEAN, false),
  COALESCE((cr.rule->>'isActive')::BOOLEAN, true),
  COALESCE((cr.rule->>'extractedFromAI')::BOOLEAN, false),
  COALESCE(cr.sort_order::INTEGER, 0),
  jsonb_build_object('source', 'contract.penaltyPolicy.rules', 'legacyRule', cr.rule)
FROM contract_rules cr
WHERE COALESCE(NULLIF(cr.rule->>'violationCode', ''), '') <> '';
