-- Phase 2: Incident & Escalation professional workflow

DO $$ BEGIN
  CREATE TYPE "IncidentTimelineAction" AS ENUM (
    'REPORTED',
    'SLA_ASSIGNED',
    'ASSIGNED',
    'EVIDENCE_ADDED',
    'STATUS_CHANGED',
    'RESOLUTION_SUBMITTED',
    'RESOLUTION_APPROVED',
    'ESCALATED',
    'CLOSED',
    'REOPENED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IncidentEvidenceKind" AS ENUM (
    'PHOTO',
    'VIDEO',
    'NOTE',
    'DOCUMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "incidents"
  ADD COLUMN IF NOT EXISTS "sla_deadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sla_breached" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sla_minutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "escalated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolved_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "approved_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "closed_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "reopened_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reopen_reason" TEXT;

CREATE TABLE IF NOT EXISTS "incident_timelines" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "incident_id" TEXT NOT NULL,
  "actor_id" TEXT,
  "action" "IncidentTimelineAction" NOT NULL,
  "from_status" "IncidentStatus",
  "to_status" "IncidentStatus",
  "notes" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_timelines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "incident_evidences" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "incident_id" TEXT NOT NULL,
  "timeline_id" TEXT,
  "actor_id" TEXT,
  "kind" "IncidentEvidenceKind" NOT NULL DEFAULT 'NOTE',
  "uri" TEXT,
  "note" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_evidences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "incidents_tenant_id_status_sla_deadline_idx" ON "incidents"("tenant_id", "status", "sla_deadline");
CREATE INDEX IF NOT EXISTS "incidents_tenant_id_sla_breached_idx" ON "incidents"("tenant_id", "sla_breached");
CREATE INDEX IF NOT EXISTS "incident_timelines_tenant_id_incident_id_created_at_idx" ON "incident_timelines"("tenant_id", "incident_id", "created_at" ASC);
CREATE INDEX IF NOT EXISTS "incident_timelines_tenant_id_action_created_at_idx" ON "incident_timelines"("tenant_id", "action", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "incident_evidences_tenant_id_incident_id_created_at_idx" ON "incident_evidences"("tenant_id", "incident_id", "created_at" ASC);
CREATE INDEX IF NOT EXISTS "incident_evidences_tenant_id_kind_created_at_idx" ON "incident_evidences"("tenant_id", "kind", "created_at" DESC);

DO $$ BEGIN
  ALTER TABLE "incidents" ADD CONSTRAINT "incidents_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "incidents" ADD CONSTRAINT "incidents_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "incidents" ADD CONSTRAINT "incidents_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "incident_timelines" ADD CONSTRAINT "incident_timelines_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "incident_evidences" ADD CONSTRAINT "incident_evidences_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
