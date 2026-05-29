CREATE TABLE IF NOT EXISTS "contract_checklist_requirements" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "contract_version_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "guard_post_id" TEXT,
  "line_item_id" TEXT,
  "requirement_code" TEXT NOT NULL,
  "requirement_name" TEXT NOT NULL,
  "description" TEXT,
  "checkpoint_code" TEXT,
  "required_evidence_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_checklist_requirements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_checklist_requirements_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_checklist_requirements_contract_version_id_fkey" FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_checklist_requirements_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contract_checklist_requirements_guard_post_id_fkey" FOREIGN KEY ("guard_post_id") REFERENCES "guard_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "contract_checklist_requirements_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "contract_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "contract_checklist_requirements_tenant_version_code_guard_post_key"
  ON "contract_checklist_requirements" ("tenant_id", "contract_version_id", "requirement_code", "guard_post_id");

CREATE INDEX IF NOT EXISTS "contract_checklist_requirements_tenant_contract_site_active_idx"
  ON "contract_checklist_requirements" ("tenant_id", "contract_id", "site_id", "is_active");

CREATE INDEX IF NOT EXISTS "contract_checklist_requirements_tenant_version_active_idx"
  ON "contract_checklist_requirements" ("tenant_id", "contract_version_id", "is_active");

CREATE INDEX IF NOT EXISTS "contract_checklist_requirements_tenant_guard_post_active_idx"
  ON "contract_checklist_requirements" ("tenant_id", "guard_post_id", "is_active");

CREATE INDEX IF NOT EXISTS "contract_checklist_requirements_tenant_line_item_idx"
  ON "contract_checklist_requirements" ("tenant_id", "line_item_id");

INSERT INTO "contract_checklist_requirements" (
  "id",
  "tenant_id",
  "contract_id",
  "contract_version_id",
  "site_id",
  "guard_post_id",
  "line_item_id",
  "requirement_code",
  "requirement_name",
  "description",
  "checkpoint_code",
  "required_evidence_types",
  "is_mandatory",
  "sort_order",
  "is_active",
  "metadata",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid()::text,
  c."tenant_id",
  c."id",
  c."active_version_id",
  c."site_id",
  NULLIF(item->>'guardPostId', ''),
  NULLIF(item->>'lineItemId', ''),
  COALESCE(
    NULLIF(item->>'requirementCode', ''),
    'CHK_' || lpad((row_number() OVER (PARTITION BY c."id" ORDER BY c."id"))::text, 3, '0')
  ),
  COALESCE(
    NULLIF(item->>'requirementName', ''),
    NULLIF(item->>'name', ''),
    'Checklist tuần tra'
  ),
  NULLIF(item->>'description', ''),
  NULLIF(item->>'checkpointCode', ''),
  COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(item->'requiredEvidenceTypes')
    ),
    ARRAY[]::TEXT[]
  ),
  COALESCE((item->>'isMandatory')::boolean, true),
  row_number() OVER (PARTITION BY c."id" ORDER BY c."id") - 1,
  true,
  jsonb_build_object(
    'migration', '20260522090000_contract_checklist_requirements',
    'source', 'acceptancePolicy.checklistRequirements'
  ) || CASE
    WHEN jsonb_typeof(item) = 'object' THEN item
    ELSE '{}'::jsonb
  END,
  c."created_at",
  c."updated_at"
FROM "contracts" c
CROSS JOIN LATERAL jsonb_array_elements(coalesce(c."acceptance_policy"->'checklistRequirements', '[]'::jsonb)) item
WHERE c."active_version_id" IS NOT NULL
  AND c."site_id" IS NOT NULL
  AND COALESCE(item->>'requirementName', item->>'name', '') <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "contract_checklist_requirements" ccr
    WHERE ccr."contract_version_id" = c."active_version_id"
  );

ALTER TABLE "contract_checklist_requirements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contract_checklist_requirements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contract_checklist_requirements_tenant_isolation" ON "contract_checklist_requirements";
CREATE POLICY "contract_checklist_requirements_tenant_isolation" ON "contract_checklist_requirements"
FOR ALL
USING (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
)
WITH CHECK (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
);
