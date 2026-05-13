-- Create checkpoint_benchmark_sessions table
CREATE TABLE "checkpoint_benchmark_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "travel_time" INTEGER NOT NULL,
    "work_duration" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkpoint_benchmark_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "checkpoint_benchmark_sessions_checkpoint_id_idx" ON "checkpoint_benchmark_sessions"("checkpoint_id");
CREATE INDEX "checkpoint_benchmark_sessions_tenant_id_idx" ON "checkpoint_benchmark_sessions"("tenant_id");

ALTER TABLE "checkpoint_benchmark_sessions" ADD CONSTRAINT "checkpoint_benchmark_sessions_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "checkpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- NOTE: Data migration from benchmark_sessions JSON column skipped.
-- The benchmark_sessions column is added by migration 20260504065500_add_benchmark_to_checkpoints
-- which runs AFTER this migration. On fresh installs there is no existing data to migrate.
-- If you are upgrading from a version that already has benchmark_sessions data,
-- run the data migration manually after both migrations have applied.
