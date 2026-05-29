DROP INDEX IF EXISTS "contract_penalty_rules_tenant_contract_version_violation_clause_key";

CREATE UNIQUE INDEX IF NOT EXISTS "contract_penalty_rules_stable_business_key_uidx"
  ON "contract_penalty_rules" (
    "tenant_id",
    "contract_id",
    COALESCE("contract_version_id", ''),
    "violation_code",
    COALESCE("clause_code", '')
  );
