-- SCMD Pro v5.6.1 contact lead hardening follow-up.
-- This migration is safe for databases where the V1/V2 contact_leads migration was already applied.

DROP INDEX IF EXISTS "contact_leads_email_idx";

ALTER TABLE "contact_leads"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "last_contacted_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "resolved_at" TYPE TIMESTAMPTZ(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_leads_intent_check'
  ) THEN
    ALTER TABLE "contact_leads"
      ADD CONSTRAINT "contact_leads_intent_check"
      CHECK ("intent" IN ('DEMO_REQUEST', 'TECHNICAL_SUPPORT', 'SYSTEM_INCIDENT', 'BUSINESS_PARTNERSHIP', 'BILLING', 'OTHER'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_leads_source_check'
  ) THEN
    ALTER TABLE "contact_leads"
      ADD CONSTRAINT "contact_leads_source_check"
      CHECK ("source" IN ('PUBLIC_CONTACT_PAGE', 'LANDING_PAGE', 'PRICING_PAGE', 'DOCS_PAGE', 'SUPPORT_LINK'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_leads_status_check'
  ) THEN
    ALTER TABLE "contact_leads"
      ADD CONSTRAINT "contact_leads_status_check"
      CHECK ("status" IN ('NEW', 'CONTACTED', 'QUALIFIED', 'RESOLVED', 'SPAM'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "contact_leads_email_hash_created_at_idx" ON "contact_leads"("email_hash", "created_at");
CREATE INDEX IF NOT EXISTS "contact_leads_content_hash_created_at_idx" ON "contact_leads"("content_hash", "created_at");
