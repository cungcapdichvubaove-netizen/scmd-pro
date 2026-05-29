-- Ensure new operations/incident tables are protected by PostgreSQL RLS.

DO $$
DECLARE
  tbl TEXT;
  table_list TEXT[] := ARRAY[
    'patrol_routes',
    'patrol_route_checkpoints',
    'patrol_assignments',
    'shift_sessions',
    'patrol_sessions',
    'incident_timelines',
    'incident_evidences'
  ];
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
