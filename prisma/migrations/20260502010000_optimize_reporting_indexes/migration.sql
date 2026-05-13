DROP INDEX IF EXISTS "attendance_records_tenant_idx";
CREATE INDEX IF NOT EXISTS "attendance_records_tenant_id_created_at_idx" ON "attendance_records"("tenant_id", "created_at" DESC);

DROP INDEX IF EXISTS "incidents_tenant_idx";
CREATE INDEX IF NOT EXISTS "incidents_tenant_id_created_at_idx" ON "incidents"("tenant_id", "created_at" DESC);

ANALYZE attendance_records;
ANALYZE incidents;
