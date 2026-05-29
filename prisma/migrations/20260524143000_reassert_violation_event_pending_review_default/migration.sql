-- Reassertion guard for environments where schema drift left the Prisma model
-- defaulting new violation events to legacy OPEN/PENDING semantics.
UPDATE "violation_events"
SET "status" = 'PENDING_REVIEW'
WHERE "status" IN ('OPEN', 'PENDING');

ALTER TABLE "violation_events"
ALTER COLUMN "status" SET DEFAULT 'PENDING_REVIEW';
