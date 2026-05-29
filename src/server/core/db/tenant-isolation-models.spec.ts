import { describe, it, expect } from 'vitest';
import { db } from './prisma.js';

describe('Tenant Isolation cho cac model moi', () => {
  const TEST_TENANT_A = 'tenant-test-a-' + Math.random().toString(36).substring(7);
  const TEST_TENANT_B = 'tenant-test-b-' + Math.random().toString(36).substring(7);

  const dbA = db.forTenant(TEST_TENANT_A);
  const dbB = db.forTenant(TEST_TENANT_B);

  describe('1. ShiftAssignment Isolation', () => {
    it('nen expose model thong qua client db.forTenant', () => {
      expect(dbA.shiftAssignment).toBeDefined();
    });

    it('nen chan truy van unscoped tren ShiftAssignment', async () => {
      await expect(async () => {
        await db.system().shiftAssignment.findMany();
      }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);
    });

    it('nen co lap du lieu ShiftAssignment giua cac Tenant', async () => {
      const recordA = await dbA.shiftAssignment.create({
        data: {
          shiftScheduleId: 'schedule-a',
          staffId: 'staff-a',
          vendorId: 'vendor-a',
          status: 'ASSIGNED'
        }
      });

      expect(recordA.tenantId).toBe(TEST_TENANT_A);

      // Tenant B khong the tim thay ban ghi cua Tenant A
      const foundByB = await dbB.shiftAssignment.findMany({
        where: { id: recordA.id }
      });
      expect(foundByB.length).toBe(0);
    });
  });

  describe('2. VendorScorecard Isolation', () => {
    it('nen expose model thong qua client db.forTenant', () => {
      expect(dbA.vendorScorecard).toBeDefined();
    });

    it('nen chan truy van unscoped tren VendorScorecard', async () => {
      await expect(async () => {
        await db.system().vendorScorecard.findMany();
      }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);
    });

    it('nen co lap du lieu VendorScorecard giua cac Tenant', async () => {
      const recordA = await dbA.vendorScorecard.create({
        data: {
          vendorId: 'vendor-a',
          month: '05/2026',
          status: 'DRAFT',
          totalScore: 90
        }
      });

      expect(recordA.tenantId).toBe(TEST_TENANT_A);

      const foundByB = await dbB.vendorScorecard.findMany({
        where: { id: recordA.id }
      });
      expect(foundByB.length).toBe(0);
    });
  });

  describe('3. MonthlyAcceptanceReport Isolation', () => {
    it('nen expose model thong qua client db.forTenant', () => {
      expect(dbA.monthlyAcceptanceReport).toBeDefined();
    });

    it('nen chan truy van unscoped tren MonthlyAcceptanceReport', async () => {
      await expect(async () => {
        await db.system().monthlyAcceptanceReport.findMany();
      }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);
    });

    it('nen co lap du lieu MonthlyAcceptanceReport giua cac Tenant', async () => {
      const recordA = await dbA.monthlyAcceptanceReport.create({
        data: {
          vendorId: 'vendor-a',
          month: '05/2026',
          status: 'DRAFT',
          vendorSnapshot: {},
          violationSnapshots: {},
          evidenceSnapshots: {},
          penaltyCalculationDetails: {},
          generatedDataHash: 'hash-a'
        }
      });

      expect(recordA.tenantId).toBe(TEST_TENANT_A);

      const foundByB = await dbB.monthlyAcceptanceReport.findMany({
        where: { id: recordA.id }
      });
      expect(foundByB.length).toBe(0);
    });
  });

  describe('4. PenaltyItem Isolation', () => {
    it('nen expose model thong qua client db.forTenant', () => {
      expect(dbA.penaltyItem).toBeDefined();
    });

    it('nen chan truy van unscoped tren PenaltyItem', async () => {
      await expect(async () => {
        await db.system().penaltyItem.findMany();
      }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);
    });

    it('nen co lap du lieu PenaltyItem giua cac Tenant', async () => {
      const recordA = await dbA.penaltyItem.create({
        data: {
          reportId: 'report-a',
          type: 'NO_SHOW',
          status: 'SUGGESTED',
          baseAmount: 100000,
          amount: 100000
        }
      });

      expect(recordA.tenantId).toBe(TEST_TENANT_A);

      const foundByB = await dbB.penaltyItem.findMany({
        where: { id: recordA.id }
      });
      expect(foundByB.length).toBe(0);
    });
  });

  describe('5. ViolationDispute Isolation', () => {
    it('nen expose model thong qua client db.forTenant', () => {
      expect(dbA.violationDispute).toBeDefined();
    });

    it('nen chan truy van unscoped tren ViolationDispute', async () => {
      await expect(async () => {
        await db.system().violationDispute.findMany();
      }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);
    });

    it('nen co lap du lieu ViolationDispute giua cac Tenant', async () => {
      const recordA = await dbA.violationDispute.create({
        data: {
          violationEventId: 'event-a',
          status: 'OPEN',
          reason: 'Sai thong tin thoi gian'
        }
      });

      expect(recordA.tenantId).toBe(TEST_TENANT_A);

      const foundByB = await dbB.violationDispute.findMany({
        where: { id: recordA.id }
      });
      expect(foundByB.length).toBe(0);
    });
  });

  describe('6. ContractPenaltyRule Isolation', () => {
    it('nen expose model thong qua client db.forTenant', () => {
      expect(dbA.contractPenaltyRule).toBeDefined();
    });

    it('nen chan truy van unscoped tren ContractPenaltyRule', async () => {
      await expect(async () => {
        await db.system().contractPenaltyRule.findMany();
      }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);
    });

    it('nen co lap du lieu ContractPenaltyRule giua cac Tenant', async () => {
      const recordA = await dbA.contractPenaltyRule.create({
        data: {
          contractId: 'contract-a',
          ruleName: 'Phat di muon',
          violationCode: 'V01',
          penaltyUnit: 'PER_MINUTE'
        }
      });

      expect(recordA.tenantId).toBe(TEST_TENANT_A);

      const foundByB = await dbB.contractPenaltyRule.findMany({
        where: { id: recordA.id }
      });
      expect(foundByB.length).toBe(0);
    });
  });

  describe('7. ContractVersion Isolation', () => {
    it('nen expose model thong qua client db.forTenant', () => {
      expect(dbA.contractVersion).toBeDefined();
    });

    it('nen chan truy van unscoped tren ContractVersion', async () => {
      const systemDb = db.system() as any;

      await expect(async () => {
        await systemDb.contractVersion.findMany();
      }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);
    });

    it('nen ep tenantId cua client scope khi create ContractVersion', async () => {
      const recordA = await dbA.contractVersion.create({
        data: {
          tenantId: TEST_TENANT_B,
          contractId: 'contract-a',
          versionNumber: 1,
          effectiveFrom: new Date('2026-05-01T00:00:00.000Z'),
          status: 'DRAFT',
          currency: 'VND'
        }
      });

      expect(recordA.tenantId).toBe(TEST_TENANT_A);
    });

    it('nen co lap du lieu ContractVersion giua cac Tenant', async () => {
      const recordA = await dbA.contractVersion.create({
        data: {
          contractId: 'contract-a-2',
          versionNumber: 2,
          effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
          status: 'ACTIVE',
          currency: 'VND'
        }
      });

      const foundByB = await dbB.contractVersion.findMany({
        where: { id: recordA.id }
      });
      expect(foundByB.length).toBe(0);
    });
  });

  describe('8. ContractLineItem Isolation', () => {
    it('nen expose model thong qua client db.forTenant', () => {
      expect(dbA.contractLineItem).toBeDefined();
    });

    it('nen chan truy van unscoped tren ContractLineItem', async () => {
      const systemDb = db.system() as any;

      await expect(async () => {
        await systemDb.contractLineItem.findMany();
      }).rejects.toThrow(/SECURITY_VIOLATION.*Tenant scope is mandatory/);
    });

    it('nen ep tenantId cua client scope khi create ContractLineItem', async () => {
      const created = await dbA.contractLineItem.create({
        data: {
          tenantId: TEST_TENANT_B,
          contractVersionId: 'version-a',
          contractId: 'contract-a',
          siteId: 'site-a',
          requiredStaffCount: 2,
          unitPrice: 150000,
          totalAmount: 300000,
        },
      });
 
      expect(created.tenantId).toBe(TEST_TENANT_A);
    });

    it('nen chan truy cap cheo tenant theo relation key cua ContractLineItem', async () => {
      const recordA = await dbA.contractLineItem.create({
        data: {
          contractVersionId: 'version-a-2',
          contractId: 'contract-a-2',
          siteId: 'site-a-2',
          guardPostId: 'post-a-2',
          requiredStaffCount: 1,
          unitPrice: 100000,
          totalAmount: 100000,
          billingCycle: 'MONTHLY'
        }
      });

      const foundByB = await dbB.contractLineItem.findMany({
        where: {
          id: recordA.id,
          contractVersionId: recordA.contractVersionId,
          contractId: recordA.contractId,
        }
      });
      expect(foundByB.length).toBe(0);
    });
  });
});
