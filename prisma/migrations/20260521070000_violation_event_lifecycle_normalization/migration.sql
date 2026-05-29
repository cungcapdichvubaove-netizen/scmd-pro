UPDATE "violation_events"
SET "status" = 'PENDING_REVIEW'
WHERE "status" IN ('OPEN', 'PENDING');

ALTER TABLE "violation_events"
ALTER COLUMN "status" SET DEFAULT 'PENDING_REVIEW';
