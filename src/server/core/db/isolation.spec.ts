import { describe, it, expect } from 'vitest';
import { db } from './prisma.js';

describe('Prisma Multi-tenancy Isolation Guard', () => {
  const TEST_TENANT_ID = 'test-tenant-123';

  it('should have a functional db.forTenant client', () => {
    const tenantDb = db.forTenant(TEST_TENANT_ID);
    expect(tenantDb).toBeDefined();
    expect(typeof tenantDb.staff.findMany).toBe('function');
  });

  it('should expose all models newly added to the scoped list', () => {
    const tenantDb = db.forTenant(TEST_TENANT_ID);
    
    // Verify newly added models are accessible via the client
    expect(tenantDb.shiftSchedule).toBeDefined();
    expect(tenantDb.shiftComplianceItem).toBeDefined();
    expect(tenantDb.staffPerformanceMetric).toBeDefined();
    expect(tenantDb.feedback).toBeDefined();
    expect(tenantDb.auditLog).toBeDefined();
    expect(tenantDb.patrolBenchmarkDeviation).toBeDefined();
    expect(tenantDb.attachment).toBeDefined();
    expect(tenantDb.image).toBeDefined();
    expect(tenantDb.tenantUsageEvent).toBeDefined();
    expect(tenantDb.checkpointBenchmarkSession).toBeDefined();
    expect(tenantDb.contractVersion).toBeDefined();
    expect(tenantDb.contractLineItem).toBeDefined();
  });

  it('should block unscoped queries on tenant scoped models like Attachment', async () => {
    // db.system() or a raw prisma client bypass?
    // We should test that internalPrisma or whatever blocks it.
    // wait, the test file uses `db.system()` or `db.forTenant()`
    // Actually, `isolationGuard` checks that findMany requires a where clause with tenantId, but db.forTenant inherently adds it!
    // Unscoped queries happen if someone tries to use db.system() on a tenant model without bypass, or bypasses but isn't system.
    const systemDb = db.system() as any;

    await expect(async () => {
      await systemDb.attachment.findMany();
    }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);

    await expect(async () => {
      await systemDb.image.findMany();
    }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);

    await expect(async () => {
      await systemDb.tenantUsageEvent.findMany();
    }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);

    await expect(async () => {
      await systemDb.checkpointBenchmarkSession.findMany();
    }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);

    await expect(async () => {
      await systemDb.contractVersion.findMany();
    }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);

    await expect(async () => {
      await systemDb.contractLineItem.findMany();
    }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);
  });

  it('should bind tenant-scoped writes to the current tenant client', async () => {
    const tenantA = 'tenant-a-' + Math.random().toString(36).substring(7);
    const tenantB = 'tenant-b-' + Math.random().toString(36).substring(7);

    const dbA = db.forTenant(tenantA);
    const dbB = db.forTenant(tenantB);

    const recordA = await dbA.contractVersion.create({
      data: {
        tenantId: tenantB,
        contractId: 'contract-' + tenantA,
        versionNumber: 1,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        status: 'DRAFT',
        currency: 'VND',
        changeSummary: 'security invariant',
      },
    });

    expect(recordA.tenantId).toBe(tenantA);

    const visibleFromTenantB = await dbB.contractVersion.findMany({
      where: { id: recordA.id },
    });
    expect(visibleFromTenantB).toEqual([]);
  });

  it('should keep raw SQL on tenant clients inside the guarded runtime path', async () => {
    const tenantA = 'tenant-a-' + Math.random().toString(36).substring(7);
    const dbA = db.forTenant(tenantA);

    const result = await (dbA as any).$queryRaw`SELECT 1`;
    expect(Array.isArray(result)).toBe(true);
  });
});
