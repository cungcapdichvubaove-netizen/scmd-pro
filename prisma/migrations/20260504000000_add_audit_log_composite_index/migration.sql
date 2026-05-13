-- Thêm composite index cho AuditLog để tối ưu Performance (v3.9.4)
-- Ref: I-4: AuditLog thiếu composite index theo tenantId + action
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_id_action_created_at_idx" 
ON "audit_logs" ("tenant_id", "action", "created_at" DESC);
