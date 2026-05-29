CREATE TABLE IF NOT EXISTS "contact_leads" (
    "id" TEXT NOT NULL,
    "tracking_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_hash" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "intent" TEXT NOT NULL DEFAULT 'OTHER',
    "source" TEXT NOT NULL DEFAULT 'PUBLIC_CONTACT_PAGE',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "owner_user_id" TEXT,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_contacted_at" TIMESTAMPTZ(3),
    "resolved_at" TIMESTAMPTZ(3),

    CONSTRAINT "contact_leads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contact_leads_intent_check" CHECK ("intent" IN ('DEMO_REQUEST', 'TECHNICAL_SUPPORT', 'SYSTEM_INCIDENT', 'BUSINESS_PARTNERSHIP', 'BILLING', 'OTHER')),
    CONSTRAINT "contact_leads_source_check" CHECK ("source" IN ('PUBLIC_CONTACT_PAGE', 'LANDING_PAGE', 'PRICING_PAGE', 'DOCS_PAGE', 'SUPPORT_LINK')),
    CONSTRAINT "contact_leads_status_check" CHECK ("status" IN ('NEW', 'CONTACTED', 'QUALIFIED', 'RESOLVED', 'SPAM'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "contact_leads_tracking_code_key" ON "contact_leads"("tracking_code");
CREATE INDEX IF NOT EXISTS "contact_leads_status_created_at_idx" ON "contact_leads"("status", "created_at");
CREATE INDEX IF NOT EXISTS "contact_leads_email_hash_created_at_idx" ON "contact_leads"("email_hash", "created_at");
CREATE INDEX IF NOT EXISTS "contact_leads_content_hash_created_at_idx" ON "contact_leads"("content_hash", "created_at");
CREATE INDEX IF NOT EXISTS "contact_leads_intent_created_at_idx" ON "contact_leads"("intent", "created_at");
