CREATE TABLE IF NOT EXISTS "shift_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "shift_schedule_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "contract_id" TEXT,
    "site_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shift_schedules_scope_unique"
ON "shift_schedules"("tenant_id", "contract_id", "site_id", "guard_post_id", "date", "shift_type", "start_time", "end_time", "position_name");

CREATE UNIQUE INDEX IF NOT EXISTS "shift_assignments_schedule_staff_unique"
ON "shift_assignments"("tenant_id", "shift_schedule_id", "staff_id");

CREATE INDEX IF NOT EXISTS "shift_assignments_schedule_idx"
ON "shift_assignments"("tenant_id", "shift_schedule_id");

CREATE INDEX IF NOT EXISTS "shift_assignments_staff_status_idx"
ON "shift_assignments"("tenant_id", "staff_id", "status");

CREATE INDEX IF NOT EXISTS "shift_assignments_vendor_assigned_at_idx"
ON "shift_assignments"("tenant_id", "vendor_id", "assigned_at" DESC);

CREATE INDEX IF NOT EXISTS "shift_assignments_contract_assigned_at_idx"
ON "shift_assignments"("tenant_id", "contract_id", "assigned_at" DESC);

CREATE INDEX IF NOT EXISTS "shift_assignments_site_assigned_at_idx"
ON "shift_assignments"("tenant_id", "site_id", "assigned_at" DESC);

ALTER TABLE "shift_assignments"
ADD CONSTRAINT "shift_assignments_shift_schedule_id_fkey"
FOREIGN KEY ("shift_schedule_id") REFERENCES "shift_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shift_assignments"
ADD CONSTRAINT "shift_assignments_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift_assignments" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shift_assignments_tenant_isolation ON "shift_assignments";
CREATE POLICY shift_assignments_tenant_isolation ON "shift_assignments"
FOR ALL
USING (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
)
WITH CHECK (
  tenant_id = current_setting('app.current_tenant_id', true)
  OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
);
