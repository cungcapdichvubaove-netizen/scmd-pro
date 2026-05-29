-- Phase 1 Operations Core: routes, assignments, shift sessions, patrol sessions.

ALTER TABLE "attendance_records"
ADD COLUMN IF NOT EXISTS "shift_session_id" TEXT,
ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE TABLE IF NOT EXISTS "patrol_routes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "site_id" TEXT,
    "position_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "estimated_minutes" INTEGER,
    "compliance_config" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patrol_routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "patrol_route_checkpoints" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "min_offset_minutes" INTEGER,
    "max_offset_minutes" INTEGER,
    "geo_radius_meters" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patrol_route_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "patrol_assignments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "shift_schedule_id" TEXT,
    "assignment_date" TEXT,
    "start_at" TIMESTAMPTZ,
    "end_at" TIMESTAMPTZ,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assigned_by" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patrol_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "shift_sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "shift_schedule_id" TEXT,
    "patrol_assignment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,
    "check_in_attendance_id" TEXT,
    "check_out_attendance_id" TEXT,
    "exception_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "patrol_sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "shift_session_id" TEXT,
    "patrol_assignment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "expected_checkpoint_count" INTEGER NOT NULL DEFAULT 0,
    "scanned_checkpoint_count" INTEGER NOT NULL DEFAULT 0,
    "missed_checkpoint_count" INTEGER NOT NULL DEFAULT 0,
    "out_of_order_count" INTEGER NOT NULL DEFAULT 0,
    "gps_violation_count" INTEGER NOT NULL DEFAULT 0,
    "compliance_score" DOUBLE PRECISION,
    "exception_summary" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patrol_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "patrol_logs"
ADD COLUMN IF NOT EXISTS "patrol_session_id" TEXT,
ADD COLUMN IF NOT EXISTS "route_checkpoint_id" TEXT,
ADD COLUMN IF NOT EXISTS "sequence_actual" INTEGER,
ADD COLUMN IF NOT EXISTS "validation_status" TEXT NOT NULL DEFAULT 'VALID',
ADD COLUMN IF NOT EXISTS "exception_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "patrol_routes_tenant_status_idx" ON "patrol_routes"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "patrol_routes_tenant_site_idx" ON "patrol_routes"("tenant_id", "site_id");
CREATE UNIQUE INDEX IF NOT EXISTS "patrol_route_checkpoints_route_sequence_key" ON "patrol_route_checkpoints"("tenant_id", "route_id", "sequence");
CREATE UNIQUE INDEX IF NOT EXISTS "patrol_route_checkpoints_route_checkpoint_key" ON "patrol_route_checkpoints"("tenant_id", "route_id", "checkpoint_id");
CREATE INDEX IF NOT EXISTS "patrol_route_checkpoints_checkpoint_idx" ON "patrol_route_checkpoints"("tenant_id", "checkpoint_id");
CREATE INDEX IF NOT EXISTS "patrol_assignments_staff_status_idx" ON "patrol_assignments"("tenant_id", "staff_id", "status");
CREATE INDEX IF NOT EXISTS "patrol_assignments_shift_idx" ON "patrol_assignments"("tenant_id", "shift_schedule_id");
CREATE INDEX IF NOT EXISTS "patrol_assignments_date_idx" ON "patrol_assignments"("tenant_id", "assignment_date");
CREATE INDEX IF NOT EXISTS "shift_sessions_staff_status_idx" ON "shift_sessions"("tenant_id", "staff_id", "status");
CREATE INDEX IF NOT EXISTS "shift_sessions_shift_idx" ON "shift_sessions"("tenant_id", "shift_schedule_id");
CREATE INDEX IF NOT EXISTS "shift_sessions_assignment_idx" ON "shift_sessions"("tenant_id", "patrol_assignment_id");
CREATE INDEX IF NOT EXISTS "patrol_sessions_staff_status_idx" ON "patrol_sessions"("tenant_id", "staff_id", "status");
CREATE INDEX IF NOT EXISTS "patrol_sessions_route_idx" ON "patrol_sessions"("tenant_id", "route_id");
CREATE INDEX IF NOT EXISTS "patrol_sessions_shift_idx" ON "patrol_sessions"("tenant_id", "shift_session_id");
CREATE INDEX IF NOT EXISTS "patrol_sessions_assignment_idx" ON "patrol_sessions"("tenant_id", "patrol_assignment_id");
CREATE INDEX IF NOT EXISTS "patrol_sessions_score_idx" ON "patrol_sessions"("tenant_id", "compliance_score");
CREATE INDEX IF NOT EXISTS "patrol_logs_session_created_idx" ON "patrol_logs"("tenant_id", "patrol_session_id", "created_at");
CREATE INDEX IF NOT EXISTS "patrol_logs_validation_idx" ON "patrol_logs"("tenant_id", "validation_status");
CREATE INDEX IF NOT EXISTS "attendance_records_shift_session_idx" ON "attendance_records"("tenant_id", "shift_session_id");

ALTER TABLE "patrol_route_checkpoints" DROP CONSTRAINT IF EXISTS "patrol_route_checkpoints_route_id_fkey";
ALTER TABLE "patrol_route_checkpoints" ADD CONSTRAINT "patrol_route_checkpoints_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "patrol_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patrol_route_checkpoints" DROP CONSTRAINT IF EXISTS "patrol_route_checkpoints_checkpoint_id_fkey";
ALTER TABLE "patrol_route_checkpoints" ADD CONSTRAINT "patrol_route_checkpoints_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "checkpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "patrol_assignments" DROP CONSTRAINT IF EXISTS "patrol_assignments_route_id_fkey";
ALTER TABLE "patrol_assignments" ADD CONSTRAINT "patrol_assignments_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "patrol_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patrol_assignments" DROP CONSTRAINT IF EXISTS "patrol_assignments_staff_id_fkey";
ALTER TABLE "patrol_assignments" ADD CONSTRAINT "patrol_assignments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patrol_assignments" DROP CONSTRAINT IF EXISTS "patrol_assignments_shift_schedule_id_fkey";
ALTER TABLE "patrol_assignments" ADD CONSTRAINT "patrol_assignments_shift_schedule_id_fkey" FOREIGN KEY ("shift_schedule_id") REFERENCES "shift_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shift_sessions" DROP CONSTRAINT IF EXISTS "shift_sessions_staff_id_fkey";
ALTER TABLE "shift_sessions" ADD CONSTRAINT "shift_sessions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_sessions" DROP CONSTRAINT IF EXISTS "shift_sessions_shift_schedule_id_fkey";
ALTER TABLE "shift_sessions" ADD CONSTRAINT "shift_sessions_shift_schedule_id_fkey" FOREIGN KEY ("shift_schedule_id") REFERENCES "shift_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shift_sessions" DROP CONSTRAINT IF EXISTS "shift_sessions_patrol_assignment_id_fkey";
ALTER TABLE "shift_sessions" ADD CONSTRAINT "shift_sessions_patrol_assignment_id_fkey" FOREIGN KEY ("patrol_assignment_id") REFERENCES "patrol_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "patrol_sessions" DROP CONSTRAINT IF EXISTS "patrol_sessions_route_id_fkey";
ALTER TABLE "patrol_sessions" ADD CONSTRAINT "patrol_sessions_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "patrol_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patrol_sessions" DROP CONSTRAINT IF EXISTS "patrol_sessions_staff_id_fkey";
ALTER TABLE "patrol_sessions" ADD CONSTRAINT "patrol_sessions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patrol_sessions" DROP CONSTRAINT IF EXISTS "patrol_sessions_shift_session_id_fkey";
ALTER TABLE "patrol_sessions" ADD CONSTRAINT "patrol_sessions_shift_session_id_fkey" FOREIGN KEY ("shift_session_id") REFERENCES "shift_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patrol_sessions" DROP CONSTRAINT IF EXISTS "patrol_sessions_patrol_assignment_id_fkey";
ALTER TABLE "patrol_sessions" ADD CONSTRAINT "patrol_sessions_patrol_assignment_id_fkey" FOREIGN KEY ("patrol_assignment_id") REFERENCES "patrol_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "patrol_logs" DROP CONSTRAINT IF EXISTS "patrol_logs_patrol_session_id_fkey";
ALTER TABLE "patrol_logs" ADD CONSTRAINT "patrol_logs_patrol_session_id_fkey" FOREIGN KEY ("patrol_session_id") REFERENCES "patrol_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patrol_logs" DROP CONSTRAINT IF EXISTS "patrol_logs_route_checkpoint_id_fkey";
ALTER TABLE "patrol_logs" ADD CONSTRAINT "patrol_logs_route_checkpoint_id_fkey" FOREIGN KEY ("route_checkpoint_id") REFERENCES "patrol_route_checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_records" DROP CONSTRAINT IF EXISTS "attendance_records_shift_session_id_fkey";
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_shift_session_id_fkey" FOREIGN KEY ("shift_session_id") REFERENCES "shift_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
