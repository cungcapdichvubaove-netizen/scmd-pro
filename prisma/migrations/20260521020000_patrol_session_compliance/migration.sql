-- V.5.3.0.4: PatrolRoute + PatrolSession operational compliance.

ALTER TABLE "patrol_routes"
ADD COLUMN IF NOT EXISTS "contract_id" TEXT,
ADD COLUMN IF NOT EXISTS "vendor_id" TEXT,
ADD COLUMN IF NOT EXISTS "required_completion_percent" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS "repeat_interval_minutes" INTEGER;

UPDATE "patrol_routes" SET "status" = 'DRAFT' WHERE "status" = 'ACTIVE' AND NOT EXISTS (
  SELECT 1 FROM "patrol_route_checkpoints" prc WHERE prc."route_id" = "patrol_routes"."id"
);

ALTER TABLE "patrol_route_checkpoints"
ADD COLUMN IF NOT EXISTS "guard_post_id" TEXT,
ADD COLUMN IF NOT EXISTS "gps_required" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "photo_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "note_required" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "patrol_assignments"
ADD COLUMN IF NOT EXISTS "contract_id" TEXT,
ADD COLUMN IF NOT EXISTS "vendor_id" TEXT;

UPDATE "patrol_assignments" SET "status" = 'PLANNED' WHERE "status" = 'ASSIGNED';
UPDATE "patrol_assignments" SET "status" = 'ACTIVE' WHERE "status" = 'IN_PROGRESS';
UPDATE "patrol_assignments" SET "contract_id" = pr."contract_id", "vendor_id" = pr."vendor_id"
FROM "patrol_routes" pr
WHERE "patrol_assignments"."route_id" = pr."id"
  AND ("patrol_assignments"."contract_id" IS NULL OR "patrol_assignments"."vendor_id" IS NULL);

ALTER TABLE "patrol_sessions"
ADD COLUMN IF NOT EXISTS "vendor_id" TEXT,
ADD COLUMN IF NOT EXISTS "contract_id" TEXT,
ADD COLUMN IF NOT EXISTS "site_id" TEXT,
ADD COLUMN IF NOT EXISTS "completion_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "late_checkpoint_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "evidence_missing_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "patrol_sessions" SET "contract_id" = pr."contract_id", "vendor_id" = pr."vendor_id", "site_id" = pr."site_id"
FROM "patrol_routes" pr
WHERE "patrol_sessions"."route_id" = pr."id"
  AND ("patrol_sessions"."contract_id" IS NULL OR "patrol_sessions"."vendor_id" IS NULL OR "patrol_sessions"."site_id" IS NULL);

ALTER TABLE "patrol_logs"
ADD COLUMN IF NOT EXISTS "scanned_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "photo_evidence_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "note" TEXT;

UPDATE "patrol_logs" SET "scanned_at" = "created_at" WHERE "scanned_at" IS NULL;

CREATE TABLE IF NOT EXISTS "violation_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "contract_id" TEXT,
    "site_id" TEXT,
    "guard_post_id" TEXT,
    "staff_id" TEXT,
    "patrol_session_id" TEXT,
    "source_type" TEXT NOT NULL,
    "violation_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotency_key" TEXT NOT NULL,
    "evidence" JSONB,
    "penalty_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "violation_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "violation_events_tenant_idempotency_key" ON "violation_events"("tenant_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "patrol_routes_tenant_contract_idx" ON "patrol_routes"("tenant_id", "contract_id");
CREATE INDEX IF NOT EXISTS "patrol_routes_tenant_vendor_idx" ON "patrol_routes"("tenant_id", "vendor_id");
CREATE INDEX IF NOT EXISTS "patrol_route_checkpoints_guard_post_idx" ON "patrol_route_checkpoints"("tenant_id", "guard_post_id");
CREATE INDEX IF NOT EXISTS "patrol_assignments_contract_idx" ON "patrol_assignments"("tenant_id", "contract_id");
CREATE INDEX IF NOT EXISTS "patrol_assignments_vendor_idx" ON "patrol_assignments"("tenant_id", "vendor_id");
CREATE INDEX IF NOT EXISTS "patrol_sessions_vendor_idx" ON "patrol_sessions"("tenant_id", "vendor_id");
CREATE INDEX IF NOT EXISTS "patrol_sessions_contract_idx" ON "patrol_sessions"("tenant_id", "contract_id");
CREATE INDEX IF NOT EXISTS "patrol_sessions_site_idx" ON "patrol_sessions"("tenant_id", "site_id");
CREATE INDEX IF NOT EXISTS "violation_events_vendor_idx" ON "violation_events"("tenant_id", "vendor_id", "occurred_at" DESC);
CREATE INDEX IF NOT EXISTS "violation_events_contract_idx" ON "violation_events"("tenant_id", "contract_id", "occurred_at" DESC);
CREATE INDEX IF NOT EXISTS "violation_events_session_idx" ON "violation_events"("tenant_id", "patrol_session_id");

ALTER TABLE "patrol_route_checkpoints" DROP CONSTRAINT IF EXISTS "patrol_route_checkpoints_guard_post_id_fkey";
ALTER TABLE "patrol_route_checkpoints" ADD CONSTRAINT "patrol_route_checkpoints_guard_post_id_fkey" FOREIGN KEY ("guard_post_id") REFERENCES "guard_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
DECLARE
  tbl TEXT;
  table_list TEXT[] := ARRAY['violation_events'];
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
