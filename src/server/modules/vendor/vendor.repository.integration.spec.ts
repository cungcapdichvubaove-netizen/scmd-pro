import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { UserRole } from '../../core/architecture/types.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { db, isDatabaseUnreachable } from '../../core/db/prisma.js';
import { VendorRepository } from './vendor.repository.js';

describe('VendorRepository integration - contract penalty rules audit', () => {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasRealDatabase = hasDatabaseUrl && !isDatabaseUnreachable();
  const runIfDb = hasRealDatabase ? describe : describe.skip;

  runIfDb('with PostgreSQL', () => {
    const tenantId = `it-vendor-${Date.now()}`;
    const vendorId = `vendor-${Date.now()}`;
    const siteId = `site-${Date.now()}`;
    const contractId = `contract-${Date.now()}`;
    const versionId = `contract-version-${Date.now()}`;

    const ctx = {
      userId: 'integration-user-123',
      tenantId,
      role: UserRole.TENANT_ADMIN,
    };

    const beforePenaltyPolicy = {
      rules: [
        {
          clauseCode: 'C1',
          violationCode: 'LATE_CHECKIN',
          violationName: 'Late checkin',
          amount: 100,
          penaltyUnit: 'PER_OCCURRENCE',
          graceCount: 0,
          evidenceRequired: false,
        },
        {
          clauseCode: 'C2',
          violationCode: 'MISSING_POST',
          violationName: 'Missing post',
          amount: 200,
          penaltyUnit: 'PER_OCCURRENCE',
          graceCount: 0,
          evidenceRequired: true,
        },
      ],
    };

    const afterPenaltyPolicy = {
      rules: [
        {
          clauseCode: 'C1',
          violationCode: 'LATE_CHECKIN',
          violationName: 'Late checkin',
          amount: 150,
          penaltyUnit: 'PER_OCCURRENCE',
          graceCount: 0,
          evidenceRequired: false,
        },
        {
          clauseCode: 'C3',
          violationCode: 'UNIFORM_VIOLATION',
          violationName: 'Uniform violation',
          amount: 50,
          penaltyUnit: 'PER_OCCURRENCE',
          graceCount: 0,
          evidenceRequired: false,
        },
      ],
    };

    beforeAll(async () => {
      await db.withTenant(tenantId, async (tx: any) => {
        await tx.vendor.create({
          data: {
            id: vendorId,
            tenantId,
            name: 'Vendor Integration',
            contactPerson: 'Ops Lead',
            email: `vendor.${tenantId}@example.com`,
            phone: '0900000001',
            status: 'ACTIVE',
          },
        });

        await tx.site.create({
          data: {
            id: siteId,
            tenantId,
            siteName: 'Site Integration',
            address: '123 Integration Street',
            siteType: 'BUILDING',
            status: 'ACTIVE',
            vendorId,
          },
        });

        await tx.contract.create({
          data: {
            id: contractId,
            tenantId,
            vendorId,
            siteId,
            contractName: 'Contract Integration',
            contractCode: `INT-${tenantId}`,
            siteName: 'Site Integration',
            startDate: new Date('2026-05-01T00:00:00.000Z'),
            endDate: new Date('2026-12-31T00:00:00.000Z'),
            value: new Prisma.Decimal(1000000),
            currency: 'VND',
            guardCountPerShift: 2,
            status: 'DRAFT',
            slaConfig: { responseTimeMinutes: 30 },
            acceptancePolicy: {
              shiftRequirements: [
                {
                  guardPostId: null,
                  shiftLabel: 'Ca ngày',
                  shiftType: 'DAY',
                  startTime: '08:00',
                  endTime: '20:00',
                  requiredStaffCount: 2,
                },
              ],
            },
            evidencePolicy: {},
            penaltyPolicy: beforePenaltyPolicy,
          },
        });

        await tx.contractVersion.create({
          data: {
            id: versionId,
            tenantId,
            contractId,
            versionNumber: 1,
            status: 'DRAFT',
            effectiveFrom: new Date('2026-05-01T00:00:00.000Z'),
            effectiveTo: new Date('2026-12-31T00:00:00.000Z'),
            currency: 'VND',
            totalContractValue: new Prisma.Decimal(1000000),
            guardCountPerShift: 2,
            acceptancePolicy: {
              shiftRequirements: [
                {
                  guardPostId: null,
                  shiftLabel: 'Ca ngày',
                  shiftType: 'DAY',
                  startTime: '08:00',
                  endTime: '20:00',
                  requiredStaffCount: 2,
                },
              ],
            },
            evidencePolicy: {},
            penaltyPolicy: beforePenaltyPolicy,
            slaConfig: { responseTimeMinutes: 30 },
          },
        });

        await tx.contract.update({
          where: { id: contractId },
          data: {
            activeVersionId: versionId,
          },
        });

        await tx.contractPenaltyRule.createMany({
          data: [
            {
              tenantId,
              contractId,
              contractVersionId: versionId,
              clauseCode: 'C1',
              violationCode: 'LATE_CHECKIN',
              ruleName: 'Late checkin',
              penaltyUnit: 'PER_OCCURRENCE',
              amount: new Prisma.Decimal(100),
              graceCount: 0,
              evidenceRequired: false,
              isActive: true,
              extractedFromAI: false,
              sortOrder: 0,
              metadata: { legacyPenaltyUnit: 'PER_OCCURRENCE', notes: null },
            },
            {
              tenantId,
              contractId,
              contractVersionId: versionId,
              clauseCode: 'C2',
              violationCode: 'MISSING_POST',
              ruleName: 'Missing post',
              penaltyUnit: 'PER_OCCURRENCE',
              amount: new Prisma.Decimal(200),
              graceCount: 0,
              evidenceRequired: true,
              isActive: true,
              extractedFromAI: false,
              sortOrder: 1,
              metadata: { legacyPenaltyUnit: 'PER_OCCURRENCE', notes: null },
            },
          ],
        });
      });
    });

    afterAll(async () => {
      await db.withTenant(tenantId, async (tx: any) => {
        await tx.contractPenaltyRule.deleteMany({ where: { contractId } });
        await tx.contractLineItem.deleteMany({ where: { contractId } });
        await tx.contractChecklistRequirement.deleteMany({ where: { contractId } });
        await tx.contractShiftRequirement.deleteMany({ where: { contractId } });
        await tx.contractStaffStandard.deleteMany({ where: { contractId } });
        await tx.contractVersion.deleteMany({ where: { contractId } });
        await tx.contract.deleteMany({ where: { id: contractId } });
        await tx.site.deleteMany({ where: { id: siteId } });
        await tx.vendor.deleteMany({ where: { id: vendorId } });
      });
    });

    it('ghi audit event CONTRACT_PENALTY_RULES_SYNCED với before/after diff chính xác trên PostgreSQL thật', async () => {
      if (isDatabaseUnreachable()) {
        expect(true).toBe(true);
        return;
      }

      const auditSpy = vi.spyOn(AuditService, 'log').mockResolvedValue(undefined as never);

      const result = await VendorRepository.updateContract(ctx as any, contractId, {
        penaltyPolicy: afterPenaltyPolicy,
      });

      expect(result?.id).toBe(contractId);
      expect(result?.penaltyPolicy).toEqual(afterPenaltyPolicy);

      const rules = await db.withTenant(tenantId, async (tx: any) => {
        return await tx.contractPenaltyRule.findMany({
          where: { contractId, contractVersionId: versionId },
          orderBy: [{ clauseCode: 'asc' }, { violationCode: 'asc' }],
          select: {
            clauseCode: true,
            violationCode: true,
            amount: true,
            isActive: true,
            evidenceRequired: true,
          },
        });
      }, { readOnly: true });

      expect(rules).toHaveLength(3);
      expect(rules).toEqual([
        {
          clauseCode: 'C1',
          violationCode: 'LATE_CHECKIN',
          amount: new Prisma.Decimal(150),
          isActive: true,
          evidenceRequired: false,
        },
        {
          clauseCode: 'C2',
          violationCode: 'MISSING_POST',
          amount: new Prisma.Decimal(200),
          isActive: false,
          evidenceRequired: true,
        },
        {
          clauseCode: 'C3',
          violationCode: 'UNIFORM_VIOLATION',
          amount: new Prisma.Decimal(50),
          isActive: true,
          evidenceRequired: false,
        },
      ]);

      const penaltyAuditCalls = auditSpy.mock.calls.filter(([entry]) => entry?.action === 'CONTRACT_PENALTY_RULES_SYNCED');

      expect(penaltyAuditCalls).toHaveLength(1);
      expect(penaltyAuditCalls[0]?.[0]).toMatchObject({
        userId: 'integration-user-123',
        tenantId,
        action: 'CONTRACT_PENALTY_RULES_SYNCED',
        resource: `contract/${contractId}/penalty-rules`,
        status: 'SUCCESS',
        payload: {
          eventName: 'CONTRACT_PENALTY_RULES_SYNCED',
          contractId,
          contractVersionId: versionId,
          rulesBeforeCount: 2,
          rulesAfterCount: 3,
          addedRuleKeys: [`${tenantId}::${contractId}::${versionId}::UNIFORM_VIOLATION::C3`],
          removedRuleKeys: [],
          changedRuleKeys: [
            `${tenantId}::${contractId}::${versionId}::LATE_CHECKIN::C1`,
            `${tenantId}::${contractId}::${versionId}::MISSING_POST::C2`,
          ],
          actorId: 'integration-user-123',
          traceId: null,
        },
      });
      expect(penaltyAuditCalls[0]?.[1]).toBeTruthy();

      auditSpy.mockRestore();
    });
  });
});
