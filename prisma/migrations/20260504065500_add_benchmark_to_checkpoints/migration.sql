-- ============================================================
-- Migration: Add Learning Mode / Benchmark columns to checkpoints
-- Version: 1.1.5-benchmark (fixed: UUID -> TEXT to match schema)
-- ============================================================

-- 1. Thêm các cột benchmark vào bảng checkpoints
ALTER TABLE checkpoints
  ADD COLUMN IF NOT EXISTS benchmark_travel_time     INTEGER,
  ADD COLUMN IF NOT EXISTS benchmark_work_duration   INTEGER,
  ADD COLUMN IF NOT EXISTS benchmark_tolerance_pct   SMALLINT DEFAULT 20,
  ADD COLUMN IF NOT EXISTS benchmark_recorded_by     TEXT REFERENCES staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS benchmark_recorded_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS benchmark_session_count   SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS benchmark_sessions        JSONB DEFAULT '[]'::jsonb;

-- 2. Index cho query phân tích compliance
CREATE INDEX IF NOT EXISTS idx_checkpoints_benchmark_recorded_at
  ON checkpoints (tenant_id, benchmark_recorded_at)
  WHERE benchmark_recorded_at IS NOT NULL;

-- 3. Bảng lưu lịch sử deviation
CREATE TABLE IF NOT EXISTS patrol_benchmark_deviations (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id       TEXT NOT NULL,
  patrol_log_id   TEXT NOT NULL REFERENCES patrol_logs(id) ON DELETE CASCADE,
  checkpoint_id   TEXT NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  staff_id        TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

  actual_travel_time    INTEGER,
  actual_work_duration  INTEGER,

  expected_travel_time  INTEGER,
  expected_work_duration INTEGER,
  tolerance_pct         SMALLINT,

  travel_deviation_pct  NUMERIC(5,2),
  work_deviation_pct    NUMERIC(5,2),
  is_compliant          BOOLEAN GENERATED ALWAYS AS (
    ABS(travel_deviation_pct) <= tolerance_pct AND
    ABS(work_deviation_pct) <= tolerance_pct
  ) STORED,

  violation_type        TEXT,
  severity              TEXT DEFAULT 'low',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE patrol_benchmark_deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_benchmark_deviations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_deviations ON patrol_benchmark_deviations
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_pbd_tenant_created
  ON patrol_benchmark_deviations (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pbd_staff_compliance
  ON patrol_benchmark_deviations (tenant_id, staff_id, is_compliant, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pbd_checkpoint
  ON patrol_benchmark_deviations (tenant_id, checkpoint_id, created_at DESC);

-- 6. Comments
COMMENT ON COLUMN checkpoints.benchmark_travel_time IS 'Thời gian di chuyển chuẩn (giây)';
COMMENT ON COLUMN checkpoints.benchmark_work_duration IS 'Thời gian làm việc chuẩn tại điểm (giây)';
COMMENT ON COLUMN checkpoints.benchmark_tolerance_pct IS '% sai số cho phép, mặc định 20%';
COMMENT ON COLUMN checkpoints.benchmark_sessions IS 'Array JSON các session học';
COMMENT ON TABLE patrol_benchmark_deviations IS 'Lịch sử vi phạm chuẩn lộ trình';
