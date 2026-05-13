-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN indexes for fuzzy search on Staff table
CREATE INDEX IF NOT EXISTS idx_staff_fullname_trgm ON "staff" USING gin ("full_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_staff_username_trgm ON "staff" USING gin ("username" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_staff_email_trgm ON "staff" USING gin ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_staff_phone_trgm ON "staff" USING gin ("phone" gin_trgm_ops);
