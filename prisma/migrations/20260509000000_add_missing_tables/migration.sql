-- Add missing Enums
DO $$ BEGIN
    CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'PRO_MAX');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'FAILED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ImageStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'DELETING', 'DELETED', 'CORRUPTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- shift_schedules
CREATE TABLE IF NOT EXISTS "shift_schedules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shift_type" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "required_count" INTEGER NOT NULL,
    "position_name" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shift_schedules_tenant_date_idx" ON "shift_schedules"("tenant_id", "date");
CREATE INDEX IF NOT EXISTS "shift_schedules_contract_idx" ON "shift_schedules"("contract_id");
CREATE INDEX IF NOT EXISTS "shift_schedules_date_shift_idx" ON "shift_schedules"("date", "shift_type");


-- shift_compliance_items
CREATE TABLE IF NOT EXISTS "shift_compliance_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "shift_schedule_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "required_count" INTEGER NOT NULL,
    "actual_count" INTEGER NOT NULL,
    "missing_count" INTEGER NOT NULL,
    "excess_count" INTEGER NOT NULL,
    "compliance_rate" DOUBLE PRECISION NOT NULL,
    "penalty_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_compliance_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shift_compliance_items_tenant_date_idx" ON "shift_compliance_items"("tenant_id", "date");
CREATE INDEX IF NOT EXISTS "shift_compliance_items_schedule_idx" ON "shift_compliance_items"("shift_schedule_id");
CREATE INDEX IF NOT EXISTS "shift_compliance_items_contract_date_idx" ON "shift_compliance_items"("contract_id", "date");

ALTER TABLE "shift_compliance_items" ADD CONSTRAINT "shift_compliance_items_shift_schedule_id_fkey" FOREIGN KEY ("shift_schedule_id") REFERENCES "shift_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- monthly_strategy_insights
CREATE TABLE IF NOT EXISTS "monthly_strategy_insights" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "fraud_risk_score" DOUBLE PRECISION NOT NULL,
    "fraud_details" JSONB,
    "efficiency_score" DOUBLE PRECISION NOT NULL,
    "top_performers" JSONB,
    "critical_issues" JSONB,
    "recommendations" JSONB,
    "full_payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monthly_strategy_insights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "monthly_strategy_insights_tenant_month_idx" ON "monthly_strategy_insights"("tenant_id", "month");
CREATE INDEX IF NOT EXISTS "monthly_strategy_insights_tenant_idx" ON "monthly_strategy_insights"("tenant_id");


-- attachments
CREATE TABLE IF NOT EXISTS "attachments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uploaded_by" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "attachments_tenant_category_idx" ON "attachments"("tenant_id", "category");
CREATE INDEX IF NOT EXISTS "attachments_tenant_created_idx" ON "attachments"("tenant_id", "created_at" DESC);


-- images
CREATE TABLE IF NOT EXISTS "images" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "status" "ImageStatus" NOT NULL DEFAULT 'PENDING',
    "variants" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expires_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "purged_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "images_key_key" ON "images"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "images_hash_tenant_id_key" ON "images"("hash", "tenant_id");
CREATE INDEX IF NOT EXISTS "images_tenant_expires_idx" ON "images"("tenant_id", "expires_at");

ALTER TABLE "images" ADD CONSTRAINT "images_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- tenant_usage_events
CREATE TABLE IF NOT EXISTS "tenant_usage_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "delta_bytes" BIGINT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tenant_usage_events_tenant_time_idx" ON "tenant_usage_events"("tenant_id", "timestamp");

ALTER TABLE "tenant_usage_events" ADD CONSTRAINT "tenant_usage_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- tenant_subscriptions
CREATE TABLE IF NOT EXISTS "tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan" "PlanTier" NOT NULL DEFAULT 'FREE',
    "paid_users" INTEGER NOT NULL DEFAULT 0,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ,
    "grace_period_days" INTEGER NOT NULL DEFAULT 3,
    "auto_downgrade" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_subscriptions_tenant_id_key" ON "tenant_subscriptions"("tenant_id");
CREATE INDEX IF NOT EXISTS "tenant_subscriptions_plan_expires_idx" ON "tenant_subscriptions"("plan", "expires_at");

ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- billing_payments
CREATE TABLE IF NOT EXISTS "billing_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "paid_users" INTEGER NOT NULL,
    "paid_months" INTEGER NOT NULL,
    "amount_vnd" BIGINT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_ref" TEXT,
    "paid_at" TIMESTAMPTZ,
    "activated_at" TIMESTAMPTZ,
    "activated_by" TEXT,
    "note" TEXT,
    "period_start" TIMESTAMPTZ,
    "period_end" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "billing_payments_tenant_ref_key" ON "billing_payments"("tenant_id", "payment_ref");
CREATE INDEX IF NOT EXISTS "billing_payments_tenant_idx" ON "billing_payments"("tenant_id");
CREATE INDEX IF NOT EXISTS "billing_payments_status_idx" ON "billing_payments"("status");
CREATE INDEX IF NOT EXISTS "billing_payments_period_idx" ON "billing_payments"("period_end");

ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant_subscriptions"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER existing tables to append missing fields
ALTER TABLE "tenants"
ADD COLUMN IF NOT EXISTS "paid_users" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "address" TEXT;

ALTER TABLE "staff" 
ADD COLUMN IF NOT EXISTS "id_number" TEXT,
ADD COLUMN IF NOT EXISTS "license_number" TEXT,
ADD COLUMN IF NOT EXISTS "id_expiry" TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS "staff_id_number_key" ON "staff"("id_number");

ALTER TABLE "attendance_records"
ADD COLUMN IF NOT EXISTS "shift_schedule_id" TEXT,
ADD COLUMN IF NOT EXISTS "check_in_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "check_out_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "worked_minutes" INTEGER,
ADD COLUMN IF NOT EXISTS "late_minutes" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "early_leave_minutes" INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS "attendance_records_tenant_shift_idx" ON "attendance_records"("tenant_id", "shift_schedule_id");

-- Note: We only add relation constraint if shift_schedule_id exists, but since we just added it, we can safely attempt it.
ALTER TABLE "attendance_records" DROP CONSTRAINT IF EXISTS "attendance_records_shift_schedule_id_fkey";
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_shift_schedule_id_fkey" FOREIGN KEY ("shift_schedule_id") REFERENCES "shift_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- incidents ENUMS AND COLUMNS
DO $$ BEGIN
    CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'INVESTIGATING', 'ESCALATED', 'RESOLVED', 'CLOSED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "incidents" 
ADD COLUMN IF NOT EXISTS "severity_weight" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "incidents" ALTER COLUMN "severity" DROP DEFAULT;
ALTER TABLE "incidents" ALTER COLUMN "severity" TYPE "IncidentSeverity" USING UPPER("severity")::text::"IncidentSeverity";
ALTER TABLE "incidents" ALTER COLUMN "severity" SET DEFAULT 'LOW'::"IncidentSeverity";

ALTER TABLE "incidents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "incidents" ALTER COLUMN "status" TYPE "IncidentStatus" USING UPPER("status")::text::"IncidentStatus";
ALTER TABLE "incidents" ALTER COLUMN "status" SET DEFAULT 'REPORTED'::"IncidentStatus";

-- news SEO fields
ALTER TABLE "news"
ADD COLUMN IF NOT EXISTS "seo_title" TEXT,
ADD COLUMN IF NOT EXISTS "seo_description" TEXT;
