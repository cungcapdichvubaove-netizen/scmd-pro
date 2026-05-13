-- =============================================================
-- Migration: 20260426000000_init
-- SCMD Pro — Initial schema migration
-- Thay thế db push → migrate deploy để version-control schema
-- =============================================================

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Auth schema cho RLS functions
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS text AS $$
    SELECT nullif(current_setting('app.current_tenant', true), '')::text;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS text AS $$
    SELECT nullif(current_setting('app.current_user_id', true), '')::text;
$$ LANGUAGE sql STABLE;

-- Enum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO');

-- tenants
CREATE TABLE IF NOT EXISTS "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'TRIAL',
    "subscription_plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "owner_name" TEXT,
    "max_employees" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'active',
    "features_enabled" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_subdomain_key" ON "tenants"("subdomain");

-- staff
CREATE TABLE IF NOT EXISTS "staff" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT '',
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'guard',
    "status" TEXT NOT NULL DEFAULT 'active',
    "token_version" INTEGER NOT NULL DEFAULT 1,
    "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "staff_username_key" ON "staff"("username");
CREATE INDEX IF NOT EXISTS "staff_tenant_status_idx" ON "staff"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "staff_role_idx" ON "staff"("role");

-- checkpoints
CREATE TABLE IF NOT EXISTS "checkpoints" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "qr_hash" TEXT NOT NULL DEFAULT '',
    "check_items" JSONB,
    "location" geography(Point, 4326),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "checkpoints_tenant_idx" ON "checkpoints"("tenant_id");

-- patrol_logs
CREATE TABLE IF NOT EXISTS "patrol_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "patrol_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "patrol_logs_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "checkpoints"("id") ON DELETE CASCADE,
    CONSTRAINT "patrol_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "patrol_logs_tenant_created_idx" ON "patrol_logs"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "patrol_logs_staff_created_idx" ON "patrol_logs"("staff_id", "created_at");

-- tasks
CREATE TABLE IF NOT EXISTS "tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "due_date" TIMESTAMPTZ,
    "assignee_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tasks_tenant_status_idx" ON "tasks"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "tasks_assignee_status_idx" ON "tasks"("assignee_id", "status");
CREATE INDEX IF NOT EXISTS "tasks_created_at_idx" ON "tasks"("created_at");

-- incidents
CREATE TABLE IF NOT EXISTS "incidents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "description" TEXT NOT NULL,
    "image_uri" TEXT,
    "location" JSONB,
    "status" TEXT NOT NULL DEFAULT 'reported',
    "assigned_to_id" TEXT,
    "resolution_notes" TEXT,
    "resolution_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reported_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "investigating_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "incidents_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id"),
    CONSTRAINT "incidents_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "staff"("id")
);
CREATE INDEX IF NOT EXISTS "incidents_tenant_idx" ON "incidents"("tenant_id");
CREATE INDEX IF NOT EXISTS "incidents_staff_idx" ON "incidents"("staff_id");

-- attendance_records
CREATE TABLE IF NOT EXISTS "attendance_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" JSONB,
    "image_uri" TEXT,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendance_records_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id")
);
CREATE INDEX IF NOT EXISTS "attendance_records_tenant_idx" ON "attendance_records"("tenant_id");
CREATE INDEX IF NOT EXISTS "attendance_records_staff_idx" ON "attendance_records"("staff_id");

-- audits
CREATE TABLE IF NOT EXISTS "audits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "auditor_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "overall_score" FLOAT NOT NULL,
    "evidence_uris" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "auditor_signature" TEXT,
    "contractor_representative" TEXT,
    "location_lat" FLOAT,
    "location_lng" FLOAT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "audits_tenant_idx" ON "audits"("tenant_id");
CREATE INDEX IF NOT EXISTS "audits_site_idx" ON "audits"("site_id");

-- staff_performance_metrics
CREATE TABLE IF NOT EXISTS "staff_performance_metrics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "trust_score" FLOAT NOT NULL,
    "attendance_rate" FLOAT NOT NULL,
    "missed_points" INTEGER NOT NULL,
    "sos_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "staff_performance_metrics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "staff_performance_metrics_tenant_staff_period_key" UNIQUE ("tenant_id", "staff_id", "period"),
    CONSTRAINT "staff_performance_metrics_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id")
);
CREATE INDEX IF NOT EXISTS "staff_performance_metrics_tenant_idx" ON "staff_performance_metrics"("tenant_id");
CREATE INDEX IF NOT EXISTS "staff_performance_metrics_staff_period_idx" ON "staff_performance_metrics"("staff_id", "period");

-- disciplinary_actions
CREATE TABLE IF NOT EXISTS "disciplinary_actions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "evidence_uris" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action_taken" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "disciplinary_actions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "disciplinary_actions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id")
);
CREATE INDEX IF NOT EXISTS "disciplinary_actions_tenant_idx" ON "disciplinary_actions"("tenant_id");
CREATE INDEX IF NOT EXISTS "disciplinary_actions_staff_idx" ON "disciplinary_actions"("staff_id");

-- vendors
CREATE TABLE IF NOT EXISTS "vendors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "manager_name" TEXT,
    "contact_person" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "score" FLOAT NOT NULL DEFAULT 100.0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "vendors_tenant_idx" ON "vendors"("tenant_id");

-- contracts
CREATE TABLE IF NOT EXISTS "contracts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "site_name" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "value" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "guard_count_per_shift" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sla_config" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contracts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id")
);
CREATE INDEX IF NOT EXISTS "contracts_tenant_idx" ON "contracts"("tenant_id");
CREATE INDEX IF NOT EXISTS "contracts_vendor_idx" ON "contracts"("vendor_id");

-- compliance_scores
CREATE TABLE IF NOT EXISTS "compliance_scores" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "patrol_rate" FLOAT NOT NULL,
    "incident_rate" FLOAT NOT NULL,
    "discipline_rate" FLOAT NOT NULL,
    "total_score" FLOAT NOT NULL,
    "violations_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "compliance_scores_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "compliance_scores_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
);
CREATE INDEX IF NOT EXISTS "compliance_scores_tenant_idx" ON "compliance_scores"("tenant_id");
CREATE INDEX IF NOT EXISTS "compliance_scores_contract_idx" ON "compliance_scores"("contract_id");

-- event_outbox
CREATE TABLE IF NOT EXISTS "event_outbox" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "trace_id" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "processed_at" TIMESTAMPTZ,
    CONSTRAINT "event_outbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "event_outbox_status_idx" ON "event_outbox"("status");
CREATE INDEX IF NOT EXISTS "event_outbox_tenant_idx" ON "event_outbox"("tenant_id");

-- audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "payload" JSONB,
    "diff" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "status" TEXT NOT NULL,
    "trace_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "timestamp" BIGINT NOT NULL,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_idx" ON "audit_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "audit_logs_user_idx" ON "audit_logs"("user_id");

-- idempotency_records
CREATE TABLE IF NOT EXISTS "idempotency_records" (
    "idemp_key" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "expires_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("idemp_key")
);
CREATE INDEX IF NOT EXISTS "idempotency_records_expires_idx" ON "idempotency_records"("expires_at");

-- notifications
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "read_at" TIMESTAMPTZ,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notifications_tenant_user_idx" ON "notifications"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "notifications"("status");

-- news
CREATE TABLE IF NOT EXISTS "news" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "thumbnail" TEXT,
    "category" TEXT NOT NULL DEFAULT 'News',
    "author" TEXT NOT NULL DEFAULT 'SCMD Pro',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'published',
    "published_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "seo_title" TEXT,
    "seo_description" TEXT,
    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "news_slug_key" ON "news"("slug");

-- feedback
CREATE TABLE IF NOT EXISTS "feedback" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "type" TEXT NOT NULL DEFAULT 'BUG',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "feedback_tenant_idx" ON "feedback"("tenant_id");

-- system_configs
CREATE TABLE IF NOT EXISTS "system_configs" (
    "id" TEXT NOT NULL DEFAULT 'global-config',
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "system_configs_key_key" ON "system_configs"("key");

-- =============================================================
-- RLS Setup (Row-Level Security)
-- =============================================================
ALTER TABLE "staff"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff"       FORCE ROW LEVEL SECURITY;
ALTER TABLE "checkpoints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checkpoints" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patrol_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patrol_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "event_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_outbox" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_rls" ON "staff";
CREATE POLICY "staff_rls" ON "staff" AS PERMISSIVE FOR ALL TO public
USING (auth.tenant_id() = 'SYSTEM' OR tenant_id = auth.tenant_id())
WITH CHECK (auth.tenant_id() = 'SYSTEM' OR tenant_id = auth.tenant_id());

DROP POLICY IF EXISTS "checkpoints_rls" ON "checkpoints";
CREATE POLICY "checkpoints_rls" ON "checkpoints" AS PERMISSIVE FOR ALL TO public
USING (auth.tenant_id() = 'SYSTEM' OR tenant_id = auth.tenant_id())
WITH CHECK (auth.tenant_id() = 'SYSTEM' OR tenant_id = auth.tenant_id());

DROP POLICY IF EXISTS "patrol_logs_rls" ON "patrol_logs";
CREATE POLICY "patrol_logs_rls" ON "patrol_logs" AS PERMISSIVE FOR ALL TO public
USING (auth.tenant_id() = 'SYSTEM' OR tenant_id = auth.tenant_id())
WITH CHECK (auth.tenant_id() = 'SYSTEM' OR tenant_id = auth.tenant_id());

DROP POLICY IF EXISTS "event_outbox_rls" ON "event_outbox";
CREATE POLICY "event_outbox_rls" ON "event_outbox" AS PERMISSIVE FOR ALL TO public
USING (auth.tenant_id() = 'SYSTEM' OR tenant_id = auth.tenant_id())
WITH CHECK (auth.tenant_id() = 'SYSTEM' OR tenant_id = auth.tenant_id());

-- =============================================================
-- Realtime Triggers (pg_notify cho Socket.io)
-- =============================================================
CREATE OR REPLACE FUNCTION notify_patrol_log_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('patrol_log_event',
    json_build_object('operation', TG_OP, 'record', row_to_json(NEW))::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patrol_log_after_insert ON patrol_logs;
CREATE TRIGGER patrol_log_after_insert
AFTER INSERT ON patrol_logs
FOR EACH ROW EXECUTE FUNCTION notify_patrol_log_change();
