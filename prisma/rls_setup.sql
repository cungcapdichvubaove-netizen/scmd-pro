-- ==========================================
-- SCMD PRO - ADVANCED RLS SETUP (v2.7.0)
-- BẢO VỆ ĐA TẦNG CHO MULTI-TENANCY
-- ==========================================

-- 1. ENABLE ROW LEVEL SECURITY VÀ FORCE CHO OWNER
-- Điều này đảm bảo ngay cả connection pool dùng DB owner cũng bị giới hạn bởi tenant context.

DO $$
DECLARE
    row_record RECORD;
    table_list TEXT[] := ARRAY[
        'tasks', 'checkpoints', 'patrol_benchmark_deviations', 'staff', 
        'staff_performance_metrics', 'disciplinary_actions', 'audits', 
        'attendance_records', 'patrol_logs', 'incidents', 'event_outbox', 
        'feedback', 'audit_logs', 'notifications', 'vendors', 'sites',
        'guard_posts', 'contracts', 
        'compliance_scores', 'shift_schedules', 'shift_assignments', 'shift_compliance_items',
        'attachments', 'images', 'monthly_strategy_insights', 
        'tenant_usage_events', 'checkpoint_benchmark_sessions',
        'patrol_routes', 'patrol_route_checkpoints', 'patrol_assignments',
        'shift_sessions', 'patrol_sessions', 'incident_timelines',
        'incident_evidences', 'incident_sla_rules', 'violation_events',
        'vendor_scorecards', 'monthly_acceptance_reports', 'penalty_items',
        'contract_penalty_rules', 'contract_versions', 'contract_line_items',
        'contract_shift_requirements', 'contract_staff_standards', 'contract_checklist_requirements',
        'violation_disputes'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY table_list LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
        END IF;
    END LOOP;
END $$;

-- 2. DROP EXISTING POLICIES TO PREVENT CONFLICTS
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. CREATE GENERIC TENANT ISOLATION POLICIES
-- Sử dụng 'app.current_tenant_id' được inject từ Prisma middleware logic (src/server/core/db/prisma.ts)
-- Cho phép bypass nếu context là 'SYSTEM' (dùng cho Super Admin hoặc Jobs toàn hệ thống được kiểm soát)

DO $$
DECLARE
    tbl TEXT;
    table_list TEXT[] := ARRAY[
        'tasks', 'checkpoints', 'patrol_benchmark_deviations', 'staff', 
        'staff_performance_metrics', 'disciplinary_actions', 'audits', 
        'attendance_records', 'patrol_logs', 'incidents', 'event_outbox', 
        'feedback', 'audit_logs', 'notifications', 'vendors', 'sites',
        'guard_posts', 'contracts', 
        'compliance_scores', 'shift_schedules', 'shift_assignments', 'shift_compliance_items',
        'attachments', 'images', 'monthly_strategy_insights', 
        'tenant_usage_events', 'checkpoint_benchmark_sessions',
        'patrol_routes', 'patrol_route_checkpoints', 'patrol_assignments',
        'shift_sessions', 'patrol_sessions', 'incident_timelines',
        'incident_evidences', 'incident_sla_rules', 'violation_events',
        'vendor_scorecards', 'monthly_acceptance_reports', 'penalty_items',
        'contract_penalty_rules', 'contract_versions', 'contract_line_items',
        'contract_shift_requirements', 'contract_staff_standards', 'contract_checklist_requirements',
        'violation_disputes'
    ];
BEGIN
    FOREACH tbl IN ARRAY table_list LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
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

-- 4. BẢO VỆ BẢNG TENANTS (Chỉ cho phép System hoặc SuperAdmin xem/sửa)
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenants_system_only ON "tenants"
FOR ALL
USING (current_setting('app.current_tenant_id', true) = 'SYSTEM')
WITH CHECK (current_setting('app.current_tenant_id', true) = 'SYSTEM');

-- 5. BẢO VỆ BẢNG SYSTEM_CONFIGS
ALTER TABLE "system_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_configs" FORCE ROW LEVEL SECURITY;
CREATE POLICY system_configs_system_only ON "system_configs"
FOR ALL
USING (current_setting('app.current_tenant_id', true) = 'SYSTEM')
WITH CHECK (current_setting('app.current_tenant_id', true) = 'SYSTEM');

-- 6. TỐI ƯU SPATIAL QUERY CHO CHECKPOINTS (PostGIS GIST Index)
-- Đảm bảo hot-path QR scan đạt hiệu năng cao nhất, tránh sequential scan
CREATE INDEX IF NOT EXISTS checkpoints_location_gist ON "checkpoints" USING GIST("location");

-- 7. TỐI ƯU DASHBOARD SORTING (Incident Index)
-- Sửa lỗi [M-05]: Sequential scan khi filter tenant và sort reportedAt DESC
CREATE INDEX IF NOT EXISTS incidents_tenant_id_reported_at_idx ON "incidents" ("tenant_id", "reported_at" DESC);
CREATE INDEX IF NOT EXISTS incidents_severity_sort_idx ON "incidents" ("tenant_id", "severity_weight" DESC, "reported_at" DESC);

-- GRANT USAGE FOR DEBUGGING (Optional for DB Admin)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO current_user;

-- Billing tables: chỉ Super Admin (system scope) được truy cập
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments FORCE ROW LEVEL SECURITY;

-- Policy: service role bypass (Prisma system() scope)
CREATE POLICY system_full_access_subscriptions ON tenant_subscriptions
  FOR ALL
  USING (current_setting('app.current_tenant_id', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.current_tenant_id', true) = 'SYSTEM');

CREATE POLICY system_full_access_payments ON billing_payments
  FOR ALL
  USING (current_setting('app.current_tenant_id', true) = 'SYSTEM')
  WITH CHECK (current_setting('app.current_tenant_id', true) = 'SYSTEM');
