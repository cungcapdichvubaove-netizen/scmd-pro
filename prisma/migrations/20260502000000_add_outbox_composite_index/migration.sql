-- DropIndex
DROP INDEX IF EXISTS "event_outbox_status_idx";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "event_outbox_status_created_at_idx" ON "event_outbox"("status", "created_at");
