ALTER TABLE "contracts"
  ADD COLUMN IF NOT EXISTS "active_version_id" TEXT;

CREATE TABLE IF NOT EXISTS "contract_versions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version_label" TEXT,
  "change_summary" TEXT,
  "effective_from" TIMESTAMPTZ NOT NULL,
  "effective_to" TIMESTAMPTZ,
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "total_contract_value" DECIMAL(18,2),
  "guard_count_per_shift" INTEGER,
  "acceptance_policy" JSONB,
  "evidence_policy" JSONB,
  "penalty_policy" JSONB,
  "sla_config" JSONB,
  "metadata" JSONB,
  "activated_at" TIMESTAMPTZ,
  "archived_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_versions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "contract_line_items" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "contract_version_id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "guard_post_id" TEXT,
  "shift_type" TEXT,
  "shift_name" TEXT,
  "start_time" TEXT,
  "end_time" TEXT,
  "position_name" TEXT,
  "required_staff_count" INTEGER NOT NULL DEFAULT 1,
  "unit_price" DECIMAL(18,2) NOT NULL,
  "billing_cycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  "total_amount" DECIMAL(18,2) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_line_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_line_items_contract_version_id_fkey" FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_line_items_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contract_line_items_guard_post_id_fkey" FOREIGN KEY ("guard_post_id") REFERENCES "guard_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "contract_versions_tenant_contract_version_number_key"
  ON "contract_versions" ("tenant_id", "contract_id", "version_number");

CREATE INDEX IF NOT EXISTS "contract_versions_tenant_contract_status_idx"
  ON "contract_versions" ("tenant_id", "contract_id", "status");

CREATE INDEX IF NOT EXISTS "contract_versions_tenant_contract_effective_from_idx"
  ON "contract_versions" ("tenant_id", "contract_id", "effective_from");

CREATE INDEX IF NOT EXISTS "contract_versions_tenant_effective_window_idx"
  ON "contract_versions" ("tenant_id", "effective_from", "effective_to");

CREATE INDEX IF NOT EXISTS "contracts_tenant_active_version_idx"
  ON "contracts" ("tenant_id", "active_version_id");

CREATE INDEX IF NOT EXISTS "contract_line_items_tenant_contract_version_active_idx"
  ON "contract_line_items" ("tenant_id", "contract_version_id", "is_active");

CREATE INDEX IF NOT EXISTS "contract_line_items_tenant_contract_site_idx"
  ON "contract_line_items" ("tenant_id", "contract_id", "site_id");

CREATE INDEX IF NOT EXISTS "contract_line_items_tenant_guard_post_idx"
  ON "contract_line_items" ("tenant_id", "guard_post_id");

CREATE INDEX IF NOT EXISTS "contract_line_items_tenant_shift_type_idx"
  ON "contract_line_items" ("tenant_id", "shift_type");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contracts_active_version_id_fkey'
  ) THEN
    ALTER TABLE "contracts"
      ADD CONSTRAINT "contracts_active_version_id_fkey"
      FOREIGN KEY ("active_version_id") REFERENCES "contract_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "contract_penalty_rules"
  ADD COLUMN IF NOT EXISTS "contract_version_id" TEXT;

CREATE INDEX IF NOT EXISTS "contract_penalty_rules_tenant_contract_version_active_idx"
  ON "contract_penalty_rules" ("tenant_id", "contract_version_id", "is_active");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contract_penalty_rules_contract_version_id_fkey'
  ) THEN
    ALTER TABLE "contract_penalty_rules"
      ADD CONSTRAINT "contract_penalty_rules_contract_version_id_fkey"
      FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "monthly_acceptance_reports"
  ADD COLUMN IF NOT EXISTS "contract_version_id" TEXT;

CREATE INDEX IF NOT EXISTS "monthly_acceptance_reports_tenant_contract_version_idx"
  ON "monthly_acceptance_reports" ("tenant_id", "contract_version_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'monthly_acceptance_reports_contract_version_id_fkey'
  ) THEN
    ALTER TABLE "monthly_acceptance_reports"
      ADD CONSTRAINT "monthly_acceptance_reports_contract_version_id_fkey"
      FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "contract_versions" (
  "id",
  "tenant_id",
  "contract_id",
  "version_number",
  "status",
  "version_label",
  "change_summary",
  "effective_from",
  "effective_to",
  "currency",
  "total_contract_value",
  "guard_count_per_shift",
  "acceptance_policy",
  "evidence_policy",
  "penalty_policy",
  "sla_config",
  "metadata",
  "activated_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid()::text,
  c."tenant_id",
  c."id",
  1,
  CASE WHEN c."status" = 'ACTIVE' THEN 'ACTIVE' ELSE 'DRAFT' END,
  'Legacy Version 1',
  'Backfilled from legacy contract row',
  COALESCE(c."activated_at", c."start_date", c."created_at", CURRENT_TIMESTAMP),
  CASE WHEN c."status" = 'EXPIRED' THEN c."end_date" ELSE NULL END,
  COALESCE(NULLIF(c."currency", ''), 'VND'),
  c."value",
  c."guard_count_per_shift",
  c."acceptance_policy",
  c."evidence_policy",
  c."penalty_policy",
  c."sla_config",
  jsonb_build_object('migration', '20260522023000_contract_version_line_items', 'source', 'legacy-contract-backfill'),
  c."activated_at",
  c."created_at",
  c."updated_at"
FROM "contracts" c
WHERE NOT EXISTS (
  SELECT 1
  FROM "contract_versions" cv
  WHERE cv."contract_id" = c."id"
);

UPDATE "contracts" c
SET "active_version_id" = cv."id"
FROM "contract_versions" cv
WHERE cv."contract_id" = c."id"
  AND c."active_version_id" IS NULL
  AND cv."status" = 'ACTIVE';

UPDATE "contracts" c
SET "active_version_id" = cv."id"
FROM "contract_versions" cv
WHERE cv."contract_id" = c."id"
  AND c."active_version_id" IS NULL
  AND cv."version_number" = (
    SELECT MIN(cv2."version_number")
    FROM "contract_versions" cv2
    WHERE cv2."contract_id" = c."id"
  );

UPDATE "contract_penalty_rules" cpr
SET "contract_version_id" = c."active_version_id"
FROM "contracts" c
WHERE c."id" = cpr."contract_id"
  AND c."tenant_id" = cpr."tenant_id"
  AND cpr."contract_version_id" IS NULL;

UPDATE "monthly_acceptance_reports" mar
SET "contract_version_id" = c."active_version_id"
FROM "contracts" c
WHERE c."id" = mar."contract_id"
  AND c."tenant_id" = mar."tenant_id"
  AND mar."contract_version_id" IS NULL;

ALTER TABLE "contract_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contract_versions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contract_versions_tenant_isolation" ON "contract_versions";
CREATE POLICY "contract_versions_tenant_isolation" ON "contract_versions"
FOR ALL
USING (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
)
WITH CHECK (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
);

ALTER TABLE "contract_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contract_line_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contract_line_items_tenant_isolation" ON "contract_line_items";
CREATE POLICY "contract_line_items_tenant_isolation" ON "contract_line_items"
FOR ALL
USING (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
)
WITH CHECK (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
);