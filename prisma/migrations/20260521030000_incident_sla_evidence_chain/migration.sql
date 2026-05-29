-- V.5.4.0.0 - Incident SLA workflow + evidence chain

ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'WAITING_VENDOR_RESPONSE';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'RESOLVED_PENDING_APPROVAL';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'REOPENED';

ALTER TYPE "IncidentTimelineAction" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
ALTER TYPE "IncidentTimelineAction" ADD VALUE IF NOT EXISTS 'COMMENTED';
ALTER TYPE "IncidentTimelineAction" ADD VALUE IF NOT EXISTS 'SLA_BREACHED';
ALTER TYPE "IncidentTimelineAction" ADD VALUE IF NOT EXISTS 'RESOLUTION_REJECTED';

ALTER TABLE "incidents"
  ADD COLUMN IF NOT EXISTS "vendor_id" TEXT,
  ADD COLUMN IF NOT EXISTS "contract_id" TEXT,
  ADD COLUMN IF NOT EXISTS "site_id" TEXT,
  ADD COLUMN IF NOT EXISTS "response_due_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolution_due_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "response_acknowledged_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolution_submitted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "required_evidence_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "incident_timelines"
  ADD COLUMN IF NOT EXISTS "actor_role" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "trace_id" TEXT;

ALTER TABLE "incident_evidences"
  ADD COLUMN IF NOT EXISTS "source_type" TEXT NOT NULL DEFAULT 'INCIDENT',
  ADD COLUMN IF NOT EXISTS "source_id" TEXT,
  ADD COLUMN IF NOT EXISTS "uploaded_by" TEXT,
  ADD COLUMN IF NOT EXISTS "file_type" TEXT,
  ADD COLUMN IF NOT EXISTS "file_url" TEXT,
  ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT,
  ADD COLUMN IF NOT EXISTS "captured_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "gps_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "gps_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "checksum" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';

UPDATE "incident_evidences"
SET "uploaded_by" = COALESCE("uploaded_by", "actor_id"),
    "file_url" = COALESCE("file_url", "uri")
WHERE "uploaded_by" IS NULL OR "file_url" IS NULL;

CREATE TABLE IF NOT EXISTS "incident_sla_rules" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "contract_id" TEXT,
  "site_id" TEXT,
  "severity" "IncidentSeverity" NOT NULL,
  "incident_type" TEXT NOT NULL,
  "response_due_minutes" INTEGER NOT NULL,
  "resolution_due_minutes" INTEGER NOT NULL,
  "escalation_after_minutes" INTEGER,
  "penalty_policy" JSONB,
  "required_evidence_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_sla_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "incidents_tenant_status_response_due_idx" ON "incidents" ("tenant_id", "status", "response_due_at");
CREATE INDEX IF NOT EXISTS "incidents_tenant_status_resolution_due_idx" ON "incidents" ("tenant_id", "status", "resolution_due_at");
CREATE INDEX IF NOT EXISTS "incidents_tenant_vendor_reported_idx" ON "incidents" ("tenant_id", "vendor_id", "reported_at" DESC);
CREATE INDEX IF NOT EXISTS "incidents_tenant_contract_reported_idx" ON "incidents" ("tenant_id", "contract_id", "reported_at" DESC);
CREATE INDEX IF NOT EXISTS "incidents_tenant_site_reported_idx" ON "incidents" ("tenant_id", "site_id", "reported_at" DESC);
CREATE INDEX IF NOT EXISTS "incident_evidences_tenant_source_idx" ON "incident_evidences" ("tenant_id", "source_type", "source_id");
CREATE INDEX IF NOT EXISTS "incident_evidences_tenant_status_idx" ON "incident_evidences" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "incident_sla_rules_lookup_idx" ON "incident_sla_rules" ("tenant_id", "contract_id", "site_id", "severity", "incident_type", "status");
CREATE INDEX IF NOT EXISTS "incident_sla_rules_tenant_status_idx" ON "incident_sla_rules" ("tenant_id", "status");

ALTER TABLE "incident_sla_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incident_sla_rules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_incident_sla_rules ON "incident_sla_rules";
CREATE POLICY tenant_isolation_incident_sla_rules ON "incident_sla_rules"
  USING (
    "tenant_id" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
  )
  WITH CHECK (
    "tenant_id" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.current_tenant_id', true) = 'SYSTEM'
  );
