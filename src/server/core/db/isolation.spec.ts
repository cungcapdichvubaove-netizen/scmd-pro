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
  });

  it('should block unscoped queries on tenant scoped models like Attachment', async () => {
    // db.system() or a raw prisma client bypass?
    // We should test that internalPrisma or whatever blocks it.
    // wait, the test file uses `db.system()` or `db.forTenant()`
    // Actually, `isolationGuard` checks that findMany requires a where clause with tenantId, but db.forTenant inherently adds it!
    // Unscoped queries happen if someone tries to use db.system() on a tenant model without bypass, or bypasses but isn't system.
    await expect(async () => {
      await db.system().attachment.findMany();
    }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);

    await expect(async () => {
      await db.system().image.findMany();
    }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);

    await expect(async () => {
      await db.system().tenantUsageEvent.findMany();
    }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);

    await expect(async () => {
      await db.system().checkpointBenchmarkSession.findMany();
    }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);
  });

  it.skip('should enforce tenantId isolation in write operations', async () => {
    const tenantA = 'tenant-a-' + Math.random().toString(36).substring(7);
    const tenantB = 'tenant-b-' + Math.random().toString(36).substring(7);
    
    const dbA = db.forTenant(tenantA);
    const dbB = db.forTenant(tenantB);
    
    // 1. Create record as Tenant A
    const staffA = await dbA.staff.create({
      data: {
        staffId: 'S1-' + tenantA,
        fullName: 'Staff of Tenant A',
        username: 'user-a-' + tenantA,
        role: 'guard',
        status: 'active'
      }
    });
    
    expect(staffA.tenantId).toBe(tenantA);
    
    // 2. Try to find Tenant A's record using Tenant B's client
    const foundByB = await dbB.staff.findMany({
      where: { id: staffA.id }
    });
    
    expect(foundByB.length).toBe(0);
    
    // 3. Try to find using query filter but incorrect client context
    // Even if we explicitly specify tenantId, createTenantClient should override it in middlewares
    const foundByBWithFilter = await dbB.staff.findMany({
      where: { tenantId: tenantA } as any
    });
    
    expect(foundByBWithFilter.length).toBe(0);
  });

  it.skip('should prevent RLS bypass via raw SQL in tenant context', async () => {
    const tenantA = 'tenant-a-' + Math.random().toString(36).substring(7);
    const dbA = db.forTenant(tenantA);
    
    // Regular forTenant client should block raw SQL
    await expect(async () => {
      await (dbA as any).$queryRaw`SELECT 1`;
    }).rejects.toThrow('SECURITY_VIOLATION');
  });
});
