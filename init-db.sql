-- ============================================================================
-- SCMD Pro - Enterprise Database Initialization Script
-- Mục tiêu: Thiết lập PostGIS, Mock Auth Functions và cấu hình RLS cơ bản.
-- ============================================================================

-- 1. Kích hoạt tiện ích mở rộng PostGIS cho các tính năng địa lý
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Tạo Schema 'auth' để giả lập các hàm xác thực tương tự Supabase/Custom Auth
-- Điều này giúp Prisma Isolation Guard có một "điểm neo" logic ở tầng DB.
CREATE SCHEMA IF NOT EXISTS auth;

/**
 * auth.tenant_id()
 * Lấy tenant_id hiện tại từ session variable "app.current_tenant".
 * Biến này được set bởi Prisma client qua lệnh: SET LOCAL "app.current_tenant" = '...'
 */
CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS text AS $$
    SELECT nullif(current_setting('app.current_tenant', true), '')::text;
$$ LANGUAGE sql STABLE;

/**
 * auth.uid()
 * Lấy ID của người dùng (Staff) hiện tại từ session variable.
 * Hỗ trợ Ownership Isolation (Bảo vệ dữ liệu cá nhân của nhân viên).
 */
CREATE OR REPLACE FUNCTION auth.uid() RETURNS text AS $$
    SELECT nullif(current_setting('app.current_user_id', true), '')::text;
$$ LANGUAGE sql STABLE;

-- 3. Thiết lập các bảng Scoped cơ bản (Schema Placeholder)
-- Lưu ý: Prisma sẽ quản lý cấu trúc bảng, nhưng ta cần đảm bảo RLS được kích hoạt.

-- Hàm helper để kích hoạt RLS và tạo Policy mặc định cho các bảng Scoped
CREATE OR REPLACE FUNCTION public.apply_tenant_isolation(table_name text) RETURNS void AS $$
BEGIN
    -- 1. Kích hoạt RLS
    EXECUTE format('ALTER TABLE public."%s" ENABLE ROW LEVEL SECURITY;', table_name);
    EXECUTE format('ALTER TABLE public."%s" FORCE ROW LEVEL SECURITY;', table_name);

    -- 2. Xóa policy cũ nếu có
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public."%s";', table_name);

    -- 3. Tạo Policy cách ly dữ liệu:
    -- - SYSTEM: Có quyền truy cập mọi dòng (dành cho Cronjobs, Workers, Seeders).
    -- - Tenant: Chỉ thấy dữ liệu có tenant_id khớp với session.
    EXECUTE format('
        CREATE POLICY tenant_isolation_policy ON public."%s"
        AS PERMISSIVE
        FOR ALL
        TO public
        USING (
            auth.tenant_id() = ''SYSTEM'' 
            OR tenant_id = auth.tenant_id()
        )
        WITH CHECK (
            auth.tenant_id() = ''SYSTEM'' 
            OR tenant_id = auth.tenant_id()
        );', table_name);
END;
$$ LANGUAGE plpgsql;

-- 4. Đăng ký các bảng nhạy cảm vào hệ thống RLS
-- Danh sách này khớp với TENANT_SCOPED_MODELS trong file prisma.ts
DO $$
DECLARE
    t text;
    scoped_tables text[] := ARRAY['Staff', 'Checkpoint', 'PatrolLog', 'EventOutbox'];
BEGIN
    FOREACH t IN ARRAY scoped_tables LOOP
        -- Tạo bảng rỗng nếu chưa tồn tại để tránh lỗi RLS khi Prisma chưa migrate
        EXECUTE format('CREATE TABLE IF NOT EXISTS public."%s" (id text PRIMARY KEY, tenant_id text);', t);
        
        -- Áp dụng Isolation
        PERFORM public.apply_tenant_isolation(t);
    END LOOP;
END $$;

-- 5. TỐI ƯU SPATIAL QUERY CHO CHECKPOINTS (PostGIS GIST Index)
-- Đảm bảo hot-path QR scan đạt hiệu năng cao nhất, tránh sequential scan
CREATE INDEX IF NOT EXISTS checkpoints_location_gist ON "checkpoints" USING GIST("location");
