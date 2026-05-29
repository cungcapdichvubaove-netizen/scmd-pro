CREATE TABLE IF NOT EXISTS "contract_shift_requirements" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "contract_version_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "guard_post_id" TEXT,
  "shift_type" TEXT,
  "shift_name" TEXT,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "required_staff_count" INTEGER NOT NULL DEFAULT 1,
  "applies_on_monday" BOOLEAN NOT NULL DEFAULT true,
  "applies_on_tuesday" BOOLEAN NOT NULL DEFAULT true,
  "applies_on_wednesday" BOOLEAN NOT NULL DEFAULT true,
  "applies_on_thursday" BOOLEAN NOT NULL DEFAULT true,
  "applies_on_friday" BOOLEAN NOT NULL DEFAULT true,
  "applies_on_saturday" BOOLEAN NOT NULL DEFAULT true,
  "applies_on_sunday" BOOLEAN NOT NULL DEFAULT true,
  "position_name" TEXT,
  "patrol_required" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_shift_requirements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_shift_requirements_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_shift_requirements_contract_version_id_fkey" FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_shift_requirements_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contract_shift_requirements_guard_post_id_fkey" FOREIGN KEY ("guard_post_id") REFERENCES "guard_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "contract_staff_standards" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "contract_version_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "applies_to_guard_post_id" TEXT,
  "standard_code" TEXT NOT NULL,
  "standard_name" TEXT,
  "required_qualifications" JSONB,
  "blocking_level" TEXT NOT NULL DEFAULT 'WARN',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_staff_standards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_staff_standards_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_staff_standards_contract_version_id_fkey" FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_staff_standards_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contract_staff_standards_applies_to_guard_post_id_fkey" FOREIGN KEY ("applies_to_guard_post_id") REFERENCES "guard_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "contract_shift_requirements_tenant_contract_version_active_idx"
  ON "contract_shift_requirements" ("tenant_id", "contract_version_id", "is_active");

CREATE INDEX IF NOT EXISTS "contract_shift_requirements_tenant_contract_site_active_idx"
  ON "contract_shift_requirements" ("tenant_id", "contract_id", "site_id", "is_active");

CREATE INDEX IF NOT EXISTS "contract_shift_requirements_tenant_guard_post_active_idx"
  ON "contract_shift_requirements" ("tenant_id", "guard_post_id", "is_active");

CREATE INDEX IF NOT EXISTS "contract_shift_requirements_tenant_site_shift_type_idx"
  ON "contract_shift_requirements" ("tenant_id", "site_id", "shift_type");

CREATE UNIQUE INDEX IF NOT EXISTS "contract_staff_standards_tenant_version_code_guard_post_key"
  ON "contract_staff_standards" ("tenant_id", "contract_version_id", "standard_code", "applies_to_guard_post_id");

CREATE INDEX IF NOT EXISTS "contract_staff_standards_tenant_contract_site_active_idx"
  ON "contract_staff_standards" ("tenant_id", "contract_id", "site_id", "is_active");

CREATE INDEX IF NOT EXISTS "contract_staff_standards_tenant_guard_post_active_idx"
  ON "contract_staff_standards" ("tenant_id", "applies_to_guard_post_id", "is_active");

CREATE INDEX IF NOT EXISTS "contract_staff_standards_tenant_standard_blocking_idx"
  ON "contract_staff_standards" ("tenant_id", "standard_code", "blocking_level");

INSERT INTO "contract_shift_requirements" (
  "id",
  "tenant_id",
  "contract_id",
  "contract_version_id",
  "site_id",
  "guard_post_id",
  "shift_type",
  "shift_name",
  "start_time",
  "end_time",
  "required_staff_count",
  "position_name",
  "patrol_required",
  "is_active",
  "sort_order",
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
  item->>'guardPostId',
  CASE
    WHEN upper(coalesce(item->>'shiftType', '')) <> '' THEN upper(item->>'shiftType')
    WHEN upper(coalesce(item->>'shiftLabel', '')) LIKE '%ĐÊM%' OR upper(coalesce(item->>'shiftLabel', '')) LIKE '%DEM%' OR upper(coalesce(item->>'shiftLabel', '')) LIKE '%NIGHT%' THEN 'NIGHT'
    WHEN upper(coalesce(item->>'shiftLabel', '')) LIKE '%CHIỀU%' OR upper(coalesce(item->>'shiftLabel', '')) LIKE '%CHIEU%' OR upper(coalesce(item->>'shiftLabel', '')) LIKE '%AFTERNOON%' THEN 'AFTERNOON'
    ELSE 'MORNING'
  END,
  coalesce(nullif(item->>'shiftName', ''), nullif(item->>'shiftLabel', ''), 'Ca trực'),
  coalesce(nullif(item->>'startTime', ''), '07:00'),
  coalesce(nullif(item->>'endTime', ''), '19:00'),
  coalesce(nullif(item->>'requiredCount', '')::integer, nullif(item->>'requiredStaffCount', '')::integer, 1),
  coalesce(nullif(item->>'positionName', ''), nullif(item->>'shiftLabel', ''), 'Ca trực'),
  coalesce((item->>'patrolRequired')::boolean, false),
  true,
  row_number() OVER (PARTITION BY c."id" ORDER BY c."id") - 1,
  jsonb_build_object('migration', '20260522080000_contract_shift_requirements_staff_standards', 'source', 'acceptancePolicy.shiftRequirements'),
  c."created_at",
  c."updated_at"
FROM "contracts" c
CROSS JOIN LATERAL jsonb_array_elements(coalesce(c."acceptance_policy"->'shiftRequirements', '[]'::jsonb)) item
WHERE c."active_version_id" IS NOT NULL
  AND c."site_id" IS NOT NULL
  AND coalesce(item->>'guardPostId', '') <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "contract_shift_requirements" csr
    WHERE csr."contract_version_id" = c."active_version_id"
  );

INSERT INTO "contract_staff_standards" (
  "id",
  "tenant_id",
  "contract_id",
  "contract_version_id",
  "site_id",
  "applies_to_guard_post_id",
  "standard_code",
  "standard_name",
  "required_qualifications",
  "blocking_level",
  "is_active",
  "sort_order",
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
  CASE
    WHEN lower(coalesce(item->>'appliesTo', '')) = 'tất cả chốt/ca' THEN NULL
    WHEN lower(coalesce(item->>'appliesTo', '')) = 'tat ca chot/ca' THEN NULL
    WHEN lower(coalesce(item->>'appliesTo', '')) = 'tất cả' THEN NULL
    WHEN lower(coalesce(item->>'appliesTo', '')) = 'tat ca' THEN NULL
    ELSE nullif(item->>'appliesToGuardPostId', '')
  END,
  coalesce(nullif(item->>'standardCode', ''), 'STD_' || lpad((row_number() OVER (PARTITION BY c."id" ORDER BY c."id"))::text, 3, '0')),
  coalesce(nullif(item->>'standardName', ''), 'Tiêu chuẩn nhân sự'),
  CASE
    WHEN jsonb_typeof(item->'requiredQualifications') = 'array' THEN item->'requiredQualifications'
    WHEN coalesce(item->>'details', '') <> '' THEN jsonb_build_array(item->>'details')
    ELSE '[]'::jsonb
  END,
  CASE WHEN coalesce((item->>'required')::boolean, false) THEN 'BLOCK' ELSE 'WARN' END,
  true,
  row_number() OVER (PARTITION BY c."id" ORDER BY c."id") - 1,
  jsonb_build_object('migration', '20260522080000_contract_shift_requirements_staff_standards', 'source', 'acceptancePolicy.staffStandards'),
  c."created_at",
  c."updated_at"
FROM "contracts" c
CROSS JOIN LATERAL jsonb_array_elements(coalesce(c."acceptance_policy"->'staffStandards', '[]'::jsonb)) item
WHERE c."active_version_id" IS NOT NULL
  AND c."site_id" IS NOT NULL
  AND coalesce(item->>'standardName', '') <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "contract_staff_standards" css
    WHERE css."contract_version_id" = c."active_version_id"
  );

ALTER TABLE "contract_shift_requirements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contract_shift_requirements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contract_shift_requirements_tenant_isolation" ON "contract_shift_requirements";
CREATE POLICY "contract_shift_requirements_tenant_isolation" ON "contract_shift_requirements"
FOR ALL
USING (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
)
WITH CHECK (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
);

ALTER TABLE "contract_staff_standards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contract_staff_standards" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contract_staff_standards_tenant_isolation" ON "contract_staff_standards";
CREATE POLICY "contract_staff_standards_tenant_isolation" ON "contract_staff_standards"
FOR ALL
USING (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
)
WITH CHECK (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
);