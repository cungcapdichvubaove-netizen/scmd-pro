CREATE TABLE IF NOT EXISTS "vendor_scorecards" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "contract_id" TEXT,
  "site_id" TEXT,
  "month" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "patrol_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "incident_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discipline_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confirmed_violations_count" INTEGER NOT NULL DEFAULT 0,
  "pending_violations_count" INTEGER NOT NULL DEFAULT 0,
  "violations_count" INTEGER NOT NULL DEFAULT 0,
  "total_penalty_suggested" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "metrics" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendor_scorecards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_scorecards_scope_month_key"
  ON "vendor_scorecards" ("tenant_id", "vendor_id", "contract_id", "site_id", "month");
CREATE INDEX IF NOT EXISTS "vendor_scorecards_tenant_month_idx"
  ON "vendor_scorecards" ("tenant_id", "month");
CREATE INDEX IF NOT EXISTS "vendor_scorecards_tenant_vendor_month_idx"
  ON "vendor_scorecards" ("tenant_id", "vendor_id", "month");

CREATE TABLE IF NOT EXISTS "monthly_acceptance_reports" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "contract_id" TEXT,
  "site_id" TEXT,
  "month" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "scorecard_id" TEXT,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generated_by" TEXT,
  "finalized_at" TIMESTAMP(3),
  "finalized_by" TEXT,
  "total_penalty_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total_confirmed_violations" INTEGER NOT NULL DEFAULT 0,
  "total_pending_violations" INTEGER NOT NULL DEFAULT 0,
  "summary" JSONB,
  "export_pdf_job_id" TEXT,
  "export_excel_job_id" TEXT,
  "export_pdf_attachment_id" TEXT,
  "export_excel_attachment_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "monthly_acceptance_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "monthly_acceptance_reports_scope_month_key"
  ON "monthly_acceptance_reports" ("tenant_id", "vendor_id", "contract_id", "site_id", "month");
CREATE INDEX IF NOT EXISTS "monthly_acceptance_reports_tenant_month_idx"
  ON "monthly_acceptance_reports" ("tenant_id", "month");
CREATE INDEX IF NOT EXISTS "monthly_acceptance_reports_tenant_vendor_month_idx"
  ON "monthly_acceptance_reports" ("tenant_id", "vendor_id", "month");

CREATE TABLE IF NOT EXISTS "penalty_items" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "report_id" TEXT NOT NULL,
  "violation_event_id" TEXT,
  "vendor_id" TEXT,
  "contract_id" TEXT,
  "site_id" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "penalty_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "penalty_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "monthly_acceptance_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "penalty_items_tenant_report_idx"
  ON "penalty_items" ("tenant_id", "report_id");
CREATE INDEX IF NOT EXISTS "penalty_items_tenant_violation_idx"
  ON "penalty_items" ("tenant_id", "violation_event_id");

CREATE TABLE IF NOT EXISTS "violation_disputes" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "violation_event_id" TEXT NOT NULL,
  "report_id" TEXT,
  "vendor_id" TEXT,
  "contract_id" TEXT,
  "site_id" TEXT,
  "submitted_by" TEXT,
  "resolved_by" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reason" TEXT NOT NULL,
  "response_note" TEXT,
  "resolution" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "violation_disputes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "violation_disputes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "monthly_acceptance_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "violation_disputes_tenant_report_idx"
  ON "violation_disputes" ("tenant_id", "report_id");
CREATE INDEX IF NOT EXISTS "violation_disputes_tenant_violation_idx"
  ON "violation_disputes" ("tenant_id", "violation_event_id");
CREATE INDEX IF NOT EXISTS "violation_disputes_tenant_status_created_idx"
  ON "violation_disputes" ("tenant_id", "status", "created_at" DESC);
