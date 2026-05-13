-- AlterTable
ALTER TABLE "staff" ADD COLUMN "email" TEXT;

-- Update existing records with dummy email to satisfy UNIQUE constraint if needed
-- Since we want it unique, we use username as prefix
UPDATE "staff" SET "email" = "username" || '@scmdpro.tmp' WHERE "email" IS NULL;

-- Make it NOT NULL and UNIQUE
ALTER TABLE "staff" ALTER COLUMN "email" SET NOT NULL;
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");
