-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN indexes for fuzzy search on incidents and vendors
CREATE INDEX IF NOT EXISTS incidents_description_trgm_idx ON "incidents" USING gin ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS vendors_name_trgm_idx ON "vendors" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS vendors_address_trgm_idx ON "vendors" USING gin ("address" gin_trgm_ops);
