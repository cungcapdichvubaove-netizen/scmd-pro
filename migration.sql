-- AlterTable
-- V.5.6.2.1: Bổ sung trường storageProviderClass để quản lý phân tầng dữ liệu (Hot/Cold Storage)
-- Mặc định toàn bộ dữ liệu hiện tại là 'STANDARD' (Hot Storage)
ALTER TABLE "IncidentEvidence" ADD COLUMN "storageProviderClass" TEXT NOT NULL DEFAULT 'STANDARD';