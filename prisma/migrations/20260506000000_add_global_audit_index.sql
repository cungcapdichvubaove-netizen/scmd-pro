-- Add global concurrent index for audit_logs createdAt descending
-- Chặn Full Table Scan khi Super Admin thao tác query không kèm tenantId Filter.

-- Lưu ý: Không thể run CREATE INDEX CONCURRENTLY trong Transaction. 
-- Prisma's executeRawUnsafe in the script usually runs automatically outside a transaction if not started with $transaction.

CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_created_at_desc_idx ON audit_logs (created_at DESC);
