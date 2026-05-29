-- V.5.3.0.3: Contract/Site/GuardPost foundation for Contract Compliance Engine.

ALTER TABLE "vendors"
ADD COLUMN IF NOT EXISTS "tax_code" TEXT,
ADD COLUMN IF NOT EXISTS "service_scope" TEXT,
ADD COLUMN IF NOT EXISTS "risk_level" TEXT NOT NULL DEFAULT 'LOW',
ADD COLUMN IF NOT EXISTS "notes" TEXT;

UPDATE "vendors" SET "status" = UPPER("status") WHERE "status" IN ('active', 'suspended', 'terminated');
UPDATE "vendors" SET "risk_level" = UPPER("risk_level") WHERE "risk_level" IN ('low', 'medium', 'high');

CREATE TABLE IF NOT EXISTS "sites" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "site_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "site_type" TEXT NOT NULL DEFAULT 'OTHER',
    "geo_fence" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "manager_name" TEXT,
    "manager_phone" TEXT,
    "vendor_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "guard_posts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "post_name" TEXT NOT NULL,
    "post_type" TEXT NOT NULL DEFAULT 'OTHER',
    "required_guard_count" INTEGER NOT NULL DEFAULT 1,
    "required_skill" TEXT,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "radius_meters" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guard_posts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contracts"
ADD COLUMN IF NOT EXISTS "site_id" TEXT,
ADD COLUMN IF NOT EXISTS "contract_name" TEXT,
ADD COLUMN IF NOT EXISTS "contract_code" TEXT,
ADD COLUMN IF NOT EXISTS "acceptance_policy" JSONB,
ADD COLUMN IF NOT EXISTS "evidence_policy" JSONB,
ADD COLUMN IF NOT EXISTS "penalty_policy" JSONB,
ADD COLUMN IF NOT EXISTS "contract_file_url" TEXT,
ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMPTZ;

ALTER TABLE "shift_schedules"
ADD COLUMN IF NOT EXISTS "guard_post_id" TEXT;

UPDATE "contracts" SET "status" = UPPER("status") WHERE "status" IN ('draft', 'active', 'expired', 'terminated');

CREATE INDEX IF NOT EXISTS "vendors_tenant_status_idx" ON "vendors"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "vendors_tenant_risk_level_idx" ON "vendors"("tenant_id", "risk_level");
CREATE INDEX IF NOT EXISTS "sites_tenant_status_idx" ON "sites"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "sites_tenant_vendor_idx" ON "sites"("tenant_id", "vendor_id");
CREATE INDEX IF NOT EXISTS "guard_posts_tenant_site_status_idx" ON "guard_posts"("tenant_id", "site_id", "status");
CREATE INDEX IF NOT EXISTS "contracts_tenant_site_status_idx" ON "contracts"("tenant_id", "site_id", "status");
CREATE INDEX IF NOT EXISTS "contracts_tenant_vendor_site_status_idx" ON "contracts"("tenant_id", "vendor_id", "site_id", "status");
CREATE INDEX IF NOT EXISTS "shift_schedules_guard_post_idx" ON "shift_schedules"("tenant_id", "guard_post_id");

ALTER TABLE "sites" DROP CONSTRAINT IF EXISTS "sites_vendor_id_fkey";
ALTER TABLE "sites" ADD CONSTRAINT "sites_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "guard_posts" DROP CONSTRAINT IF EXISTS "guard_posts_site_id_fkey";
ALTER TABLE "guard_posts" ADD CONSTRAINT "guard_posts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_site_id_fkey";
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_schedules" DROP CONSTRAINT IF EXISTS "shift_schedules_guard_post_id_fkey";
ALTER TABLE "shift_schedules" ADD CONSTRAINT "shift_schedules_guard_post_id_fkey" FOREIGN KEY ("guard_post_id") REFERENCES "guard_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
DECLARE
  tbl TEXT;
  table_list TEXT[] := ARRAY['sites', 'guard_posts'];
BEGIN
  FOREACH tbl IN ARRAY table_list LOOP
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON %I', tbl, tbl);
      EXECUTE format('
        CREATE POLICY %I_tenant_isolation ON %I
        FOR ALL
        USING (
          tenant_id = current_setting(''app.current_tenant_id'', true) OR
          current_setting(''app.current_tenant_id'', true) = ''SYSTEM''
        )
        WITH CHECK (
          tenant_id = current_setting(''app.current_tenant_id'', true) OR
          current_setting(''app.current_tenant_id'', true) = ''SYSTEM''
        )', tbl, tbl);
    END IF;
  END LOOP;
END $$;
