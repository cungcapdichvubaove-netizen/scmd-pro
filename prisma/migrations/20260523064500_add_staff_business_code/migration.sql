ALTER TABLE "staff"
ADD COLUMN "staff_id" TEXT;

UPDATE "staff"
SET "staff_id" = "id"
WHERE "staff_id" IS NULL;

ALTER TABLE "staff"
ADD CONSTRAINT "staff_tenant_id_staff_id_key" UNIQUE ("tenant_id", "staff_id");

CREATE INDEX "staff_tenant_id_staff_id_idx"
ON "staff" ("tenant_id", "staff_id");
