ALTER TABLE "staff"
  ADD COLUMN IF NOT EXISTS "assigned_vendor_id" TEXT,
  ADD COLUMN IF NOT EXISTS "assigned_site_id" TEXT,
  ADD COLUMN IF NOT EXISTS "assigned_contract_id" TEXT;

CREATE INDEX IF NOT EXISTS "staff_tenant_id_assigned_vendor_id_idx"
  ON "staff" ("tenant_id", "assigned_vendor_id");

CREATE INDEX IF NOT EXISTS "staff_tenant_id_assigned_site_id_idx"
  ON "staff" ("tenant_id", "assigned_site_id");

CREATE INDEX IF NOT EXISTS "staff_tenant_id_assigned_contract_id_idx"
  ON "staff" ("tenant_id", "assigned_contract_id");
