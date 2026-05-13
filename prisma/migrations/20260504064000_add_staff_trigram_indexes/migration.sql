-- Enable pg_trgm extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index for full_name
CREATE INDEX IF NOT EXISTS "staff_full_name_trgm_idx" ON "staff" USING GIN ("full_name" gin_trgm_ops);

-- Create trigram index for username
CREATE INDEX IF NOT EXISTS "staff_username_trgm_idx" ON "staff" USING GIN ("username" gin_trgm_ops);

-- Create trigram index for email
CREATE INDEX IF NOT EXISTS "staff_email_trgm_idx" ON "staff" USING GIN ("email" gin_trgm_ops);

-- Create trigram index for phone
CREATE INDEX IF NOT EXISTS "staff_phone_trgm_idx" ON "staff" USING GIN ("phone" gin_trgm_ops);
