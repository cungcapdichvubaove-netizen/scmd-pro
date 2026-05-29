import { context, trace } from '@opentelemetry/api';
import { AuditService } from '../../core/audit/audit.service.js';
import { loggerContext } from '../../core/logger/index.js';
import { ContractDTO } from './vendor.schema.js';

const ACTIVE_CONTRACT_STATUS = 'ACTIVE';

type ShiftRequirementRule = {
  id?: string;
  guardPostId?: string;
  shiftType?: string;
  shiftName?: string;
  shiftLabel?: string;
  startTime?: string;
  endTime?: string;
  requiredCount?: number;
  requiredStaffCount?: number;
  patrolRequired?: boolean;
  appliesOnMonday?: boolean;
  appliesOnTuesday?: boolean;
  appliesOnWednesday?: boolean;
  appliesOnThursday?: boolean;
  appliesOnFriday?: boolean;
  appliesOnSaturday?: boolean;
  appliesOnSunday?: boolean;
  positionName?: string;
  sortOrder?: number;
  notes?: string;
};

type StaffStandardRule = {
  id?: string;
  standardCode?: string;
  standardName?: string;
  required?: boolean;
  blockingLevel?: 'BLOCK' | 'WARN' | string;
  appliesTo?: string;
  appliesToGuardPostId?: string;
  requiredQualifications?: string[];
  details?: string;
  sortOrder?: number;
};

type LineItemRule = {
  id?: string;
  guardPostId?: string;
  shiftType?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
  positionName?: string;
  requiredStaffCount?: number;
  quantity?: number;
  unitPrice?: number;
  billingCycle?: string;
  totalAmount?: number;
  totalPrice?: number;
  currency?: string;
  notes?: string;
  sortOrder?: number;
};

type ChecklistRequirementRule = {
  id?: string;
  requirementCode?: string;
  requirementName?: string;
  description?: string;
  isMandatory?: boolean;
  evidenceRequired?: boolean;
  applicableShiftTypes?: string[];
  applicableGuardPostIds?: string[];
  sortOrder?: number;
};

function parseJsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function deriveShiftType(shiftLabel?: string, startTime?: string): string {
  const normalized = String(shiftLabel || '').trim().toUpperCase();
  if (normalized.includes('ĐÊM') || normalized.includes('DEM') || normalized.includes('NIGHT')) return 'NIGHT';
  if (normalized.includes('CHIỀU') || normalized.includes('CHIEU') || normalized.includes('AFTERNOON')) return 'AFTERNOON';
  if (normalized.includes('SÁNG') || normalized.includes('SANG') || normalized.includes('MORNING')) return 'MORNING';

  if (startTime) {
    const hour = Number(startTime.split(':')[0] || 0);
    if (hour >= 18 || hour < 5) return 'NIGHT';
    if (hour >= 12) return 'AFTERNOON';
  }

  return 'MORNING';
}

export class ContractSyncService {
  static requireActiveContractReady(data: ContractDTO) {
    if (data.status !== ACTIVE_CONTRACT_STATUS) return;
    const slaKeys = Object.keys(data.slaConfig || {});
    if (!data.vendorId || !data.siteId || !data.startDate || !data.endDate || !data.guardCountPerShift) {
      throw new Error('CONTRACT_ACTIVE_MISSING_REQUIRED_FIELDS');
    }
    if (slaKeys.length === 0) throw new Error('CONTRACT_ACTIVE_REQUIRES_SLA_RULE');
    if (!data.acceptancePolicy || Object.keys(data.acceptancePolicy).length === 0) {
      throw new Error('CONTRACT_ACTIVE_REQUIRES_ACCEPTANCE_POLICY');
    }

    const shiftRequirements = parseJsonArray<ShiftRequirementRule>((data.acceptancePolicy as any)?.shiftRequirements);
    const staffStandards = parseJsonArray<StaffStandardRule>((data.acceptancePolicy as any)?.staffStandards);

    if (shiftRequirements.length === 0) {
      throw new Error('CONTRACT_ACTIVE_REQUIRES_SHIFT_REQUIREMENTS');
    }

    if (staffStandards.length === 0) {
      throw new Error('CONTRACT_ACTIVE_REQUIRES_STAFF_STANDARDS');
    }
  }

  static async ensureContractVersion(tx: any, tenantId: string, contract: any, data: ContractDTO | Partial<ContractDTO>) {
    if (contract.activeVersionId) {
      const currentVersion = await tx.contractVersion.findUnique({
        where: { id: contract.activeVersionId },
      });

      if (currentVersion && currentVersion.status === ACTIVE_CONTRACT_STATUS) {
        const crypto = await import('crypto');
        const getHashPayload = (source: any) => ({
          startDate: source.startDate,
          endDate: source.endDate,
          currency: source.currency,
          value: source.value,
          guardCountPerShift: source.guardCountPerShift,
          acceptancePolicy: source.acceptancePolicy,
          evidencePolicy: source.evidencePolicy,
          penaltyPolicy: source.penaltyPolicy,
          slaConfig: source.slaConfig,
        });

        const oldHash = crypto.createHash('sha256').update(JSON.stringify(getHashPayload(contract))).digest('hex');
        const newHash = crypto.createHash('sha256').update(JSON.stringify(getHashPayload({ ...contract, ...data }))).digest('hex');

        if (oldHash === newHash) {
          return await tx.contractVersion.update({
            where: { id: currentVersion.id },
            data: {
              metadata: {
                ...currentVersion.metadata,
                lastNonLegalUpdateAt: new Date().toISOString(),
              }
            },
          });
        }

        await tx.contractVersion.update({
          where: { id: currentVersion.id },
          data: { status: 'SUPERSEDED' },
        });

        const nextVersionNumber = (currentVersion.versionNumber || 1) + 1;

        const newVersion = await tx.contractVersion.create({
          data: {
            tenantId,
            contractId: contract.id,
            versionNumber: nextVersionNumber,
            status: data.status ?? contract.status,
            versionLabel: `Rev.${nextVersionNumber}`,
            changeSummary: 'Superseded from active version due to update',
            effectiveFrom: data.startDate ?? contract.startDate,
            effectiveTo: data.endDate ?? contract.endDate,
            currency: data.currency ?? contract.currency,
            totalContractValue: data.value ?? contract.value,
            guardCountPerShift: data.guardCountPerShift ?? contract.guardCountPerShift,
            acceptancePolicy: data.acceptancePolicy ?? contract.acceptancePolicy,
            evidencePolicy: data.evidencePolicy ?? contract.evidencePolicy,
            penaltyPolicy: data.penaltyPolicy ?? contract.penaltyPolicy,
            slaConfig: data.slaConfig ?? contract.slaConfig,
            activatedAt: (data.status ?? contract.status) === ACTIVE_CONTRACT_STATUS ? new Date() : null,
            metadata: {
              source: 'ContractSyncService.ensureContractVersion.supersede',
              supersededFrom: currentVersion.id,
            },
          },
        });

        await tx.contract.update({
          where: { id: contract.id },
          data: {
            activeVersionId: newVersion.id,
          },
        });

        return newVersion;
      }

      return await tx.contractVersion.update({
        where: { id: contract.activeVersionId },
        data: {
          status: data.status ?? contract.status,
          effectiveFrom: data.startDate ?? contract.startDate,
          effectiveTo: data.endDate ?? contract.endDate,
          currency: data.currency ?? contract.currency,
          totalContractValue: data.value ?? contract.value,
          guardCountPerShift: data.guardCountPerShift ?? contract.guardCountPerShift,
          acceptancePolicy: data.acceptancePolicy ?? contract.acceptancePolicy,
          evidencePolicy: data.evidencePolicy ?? contract.evidencePolicy,
          penaltyPolicy: data.penaltyPolicy ?? contract.penaltyPolicy,
          slaConfig: data.slaConfig ?? contract.slaConfig,
          activatedAt: (data.status ?? contract.status) === ACTIVE_CONTRACT_STATUS
            ? (contract.activatedAt ?? new Date())
            : contract.activatedAt ?? null,
        },
      });
    }

    const version = await tx.contractVersion.create({
      data: {
        tenantId,
        contractId: contract.id,
        versionNumber: 1,
        status: data.status ?? contract.status,
        versionLabel: 'Rev.1',
        changeSummary: 'Initialized from contract authoring workflow',
        effectiveFrom: data.startDate ?? contract.startDate,
        effectiveTo: data.endDate ?? contract.endDate,
        currency: data.currency ?? contract.currency,
        totalContractValue: data.value ?? contract.value,
        guardCountPerShift: data.guardCountPerShift ?? contract.guardCountPerShift,
        acceptancePolicy: data.acceptancePolicy ?? contract.acceptancePolicy,
        evidencePolicy: data.evidencePolicy ?? contract.evidencePolicy,
        penaltyPolicy: data.penaltyPolicy ?? contract.penaltyPolicy,
        slaConfig: data.slaConfig ?? contract.slaConfig,
        activatedAt: (data.status ?? contract.status) === ACTIVE_CONTRACT_STATUS ? (contract.activatedAt ?? new Date()) : null,
        metadata: {
          source: 'ContractSyncService.ensureContractVersion',
        },
      },
    });

    await tx.contract.update({
      where: { id: contract.id },
      data: {
        activeVersionId: version.id,
      },
    });

    return version;
  }

  static async syncContractLineItems(
    tx: any,
    tenantId: string,
    contract: any,
    contractVersionId: string,
    acceptancePolicy: unknown,
    actorId: string,
  ) {
    const lineItems = parseJsonArray<LineItemRule>((acceptancePolicy as any)?.contractLineItems)
      .filter((item) => item && item.positionName);

    const activeKeys = new Set<string>();
    let beforeCount = 0;
    let addedCount = 0;
    let updatedCount = 0;

    const existingItems = await tx.contractLineItem.findMany({
      where: { tenantId, contractId: contract.id, contractVersionId },
      select: { id: true, guardPostId: true, shiftType: true, positionName: true, isActive: true },
    });
    beforeCount = existingItems.filter((i: any) => i.isActive).length;

    for (const [index, rule] of lineItems.entries()) {
      const shiftType = rule.shiftType || 'ALL';
      const guardPostId = rule.guardPostId || 'ALL';
      const businessKey = `${contractVersionId}::${guardPostId}::${shiftType}::${rule.positionName}`;
      activeKeys.add(businessKey);

      const existing = existingItems.find(
        (item: any) => `${contractVersionId}::${item.guardPostId || 'ALL'}::${item.shiftType || 'ALL'}::${item.positionName}` === businessKey
      );

      const requiredStaffCount = Math.max(1, Number(rule.requiredStaffCount ?? rule.quantity ?? 1));
      const unitPrice = Number(rule.unitPrice ?? 0);
      const totalAmount = Number(rule.totalAmount ?? rule.totalPrice ?? (requiredStaffCount * unitPrice));

      const data = {
        shiftName: rule.shiftName || null,
        startTime: rule.startTime || null,
        endTime: rule.endTime || null,
        requiredStaffCount,
        unitPrice,
        billingCycle: rule.billingCycle || 'MONTHLY',
        totalAmount,
        sortOrder: Number(rule.sortOrder ?? index),
        isActive: true,
        metadata: {
          notes: rule.notes || null,
          source: 'acceptancePolicy.contractLineItems',
        },
      };

      if (existing) {
        await tx.contractLineItem.update({
          where: { id: existing.id },
          data,
        });
        if (!existing.isActive) addedCount++; else updatedCount++;
      } else {
        await tx.contractLineItem.create({
          data: {
            tenantId,
            contractId: contract.id,
            contractVersionId,
            siteId: contract.siteId,
            guardPostId: rule.guardPostId || null,
            shiftType: rule.shiftType || null,
            positionName: rule.positionName!,
            ...data,
          },
        });
        addedCount++;
      }
    }

    const itemsToDeactivate = existingItems.filter((item: any) => {
      const businessKey = `${contractVersionId}::${item.guardPostId || 'ALL'}::${item.shiftType || 'ALL'}::${item.positionName}`;
      return !activeKeys.has(businessKey) && item.isActive;
    });

    if (itemsToDeactivate.length > 0) {
      await tx.contractLineItem.updateMany({
        where: { id: { in: itemsToDeactivate.map((i: any) => i.id) } },
        data: { isActive: false },
      });
    }

    const removedCount = itemsToDeactivate.length;
    if (addedCount > 0 || updatedCount > 0 || removedCount > 0) {
      await AuditService.log({
        userId: actorId,
        tenantId,
        action: 'CONTRACT_LINE_ITEMS_SYNCED',
        resource: `contract/${contract.id}/line-items`,
        payload: {
          contractId: contract.id,
          contractVersionId,
          beforeCount,
          afterCount: beforeCount + addedCount - removedCount,
          actorId,
          traceId: trace.getSpan(context.active())?.spanContext().traceId ?? loggerContext.getStore()?.traceId ?? null,
        },
        status: 'SUCCESS',
      }, tx);
    }
  }

  static async syncContractChecklistRequirements(
    tx: any,
    tenantId: string,
    contract: any,
    contractVersionId: string,
    evidencePolicy: unknown,
    actorId: string,
  ) {
    const checklists = parseJsonArray<ChecklistRequirementRule>((evidencePolicy as any)?.checklistRequirements)
      .filter((item) => item && item.requirementCode);

    const activeKeys = new Set<string>();
    let beforeCount = 0;
    let addedCount = 0;
    let updatedCount = 0;

    const existingItems = await tx.contractChecklistRequirement.findMany({
      where: { tenantId, contractId: contract.id, contractVersionId },
      select: { id: true, requirementCode: true, isActive: true },
    });
    beforeCount = existingItems.filter((i: any) => i.isActive).length;

    for (const [index, rule] of checklists.entries()) {
      const requirementCode = String(rule.requirementCode).trim().toUpperCase();
      const businessKey = `${contractVersionId}::${requirementCode}`;
      activeKeys.add(businessKey);

      const existing = existingItems.find((item: any) => `${contractVersionId}::${item.requirementCode}` === businessKey);

      const data = {
        requirementName: rule.requirementName || requirementCode,
        description: rule.description || null,
        isMandatory: Boolean(rule.isMandatory),
        evidenceRequired: Boolean(rule.evidenceRequired),
        applicableShiftTypes: Array.isArray(rule.applicableShiftTypes) ? rule.applicableShiftTypes : [],
        applicableGuardPostIds: Array.isArray(rule.applicableGuardPostIds) ? rule.applicableGuardPostIds : [],
        sortOrder: Number(rule.sortOrder ?? index),
        isActive: true,
      };

      if (existing) {
        await tx.contractChecklistRequirement.update({
          where: { id: existing.id },
          data,
        });
        if (!existing.isActive) addedCount++; else updatedCount++;
      } else {
        await tx.contractChecklistRequirement.create({
          data: {
            tenantId,
            contractId: contract.id,
            contractVersionId,
            siteId: contract.siteId,
            requirementCode,
            ...data,
          },
        });
        addedCount++;
      }
    }

    const itemsToDeactivate = existingItems.filter((item: any) => {
      const businessKey = `${contractVersionId}::${item.requirementCode}`;
      return !activeKeys.has(businessKey) && item.isActive;
    });

    if (itemsToDeactivate.length > 0) {
      await tx.contractChecklistRequirement.updateMany({
        where: { id: { in: itemsToDeactivate.map((i: any) => i.id) } },
        data: { isActive: false },
      });
    }

    const removedCount = itemsToDeactivate.length;
    if (addedCount > 0 || updatedCount > 0 || removedCount > 0) {
      await AuditService.log({
        userId: actorId,
        tenantId,
        action: 'CONTRACT_CHECKLIST_REQUIREMENTS_SYNCED',
        resource: `contract/${contract.id}/checklist-requirements`,
        payload: {
          contractId: contract.id,
          contractVersionId,
          beforeCount,
          afterCount: beforeCount + addedCount - removedCount,
          actorId,
          traceId: trace.getSpan(context.active())?.spanContext().traceId ?? loggerContext.getStore()?.traceId ?? null,
        },
        status: 'SUCCESS',
      }, tx);
    }
  }

  static async syncContractShiftRequirements(
    tx: any,
    tenantId: string,
    contract: any,
    contractVersionId: string,
    acceptancePolicy: unknown,
    actorId: string,
  ) {
    const shiftRequirements = parseJsonArray<ShiftRequirementRule>((acceptancePolicy as any)?.shiftRequirements)
      .filter((item) => item && item.guardPostId && item.startTime && item.endTime);

    const activeKeys = new Set<string>();
    let beforeCount = 0;
    let addedCount = 0;
    let updatedCount = 0;

    const existingItems = await tx.contractShiftRequirement.findMany({
      where: { tenantId, contractId: contract.id, contractVersionId },
      select: { id: true, guardPostId: true, shiftName: true, startTime: true, endTime: true, isActive: true },
    });
    beforeCount = existingItems.filter((i: any) => i.isActive).length;

    for (const [index, rule] of shiftRequirements.entries()) {
      const shiftName = rule.shiftName || rule.shiftLabel || 'Ca trực';
      const businessKey = `${contractVersionId}::${rule.guardPostId}::${shiftName}::${rule.startTime}::${rule.endTime}`;
      activeKeys.add(businessKey);

      const existing = existingItems.find(
        (item: any) => `${contractVersionId}::${item.guardPostId}::${item.shiftName}::${item.startTime}::${item.endTime}` === businessKey
      );

      const data = {
        shiftType: rule.shiftType || deriveShiftType(rule.shiftLabel || rule.shiftName, rule.startTime),
        requiredStaffCount: Math.max(1, Number(rule.requiredCount ?? rule.requiredStaffCount ?? 1)),
        positionName: rule.positionName || rule.shiftLabel || rule.shiftName || 'Ca trực',
        patrolRequired: Boolean(rule.patrolRequired),
        appliesOnMonday: rule.appliesOnMonday ?? true,
        appliesOnTuesday: rule.appliesOnTuesday ?? true,
        appliesOnWednesday: rule.appliesOnWednesday ?? true,
        appliesOnThursday: rule.appliesOnThursday ?? true,
        appliesOnFriday: rule.appliesOnFriday ?? true,
        appliesOnSaturday: rule.appliesOnSaturday ?? true,
        appliesOnSunday: rule.appliesOnSunday ?? true,
        isActive: true,
        sortOrder: Number(rule.sortOrder ?? index),
        metadata: {
          notes: rule.notes || null,
          source: 'acceptancePolicy.shiftRequirements',
        },
      };

      if (existing) {
        await tx.contractShiftRequirement.update({
          where: { id: existing.id },
          data,
        });
        if (!existing.isActive) addedCount++; else updatedCount++;
      } else {
        await tx.contractShiftRequirement.create({
          data: {
            tenantId,
            contractId: contract.id,
            contractVersionId,
            siteId: contract.siteId,
            guardPostId: rule.guardPostId!,
            shiftName,
            startTime: rule.startTime!,
            endTime: rule.endTime!,
            ...data,
          },
        });
        addedCount++;
      }
    }

    const itemsToDeactivate = existingItems.filter((item: any) => {
      const businessKey = `${contractVersionId}::${item.guardPostId}::${item.shiftName}::${item.startTime}::${item.endTime}`;
      return !activeKeys.has(businessKey) && item.isActive;
    });

    if (itemsToDeactivate.length > 0) {
      await tx.contractShiftRequirement.updateMany({
        where: { id: { in: itemsToDeactivate.map((i: any) => i.id) } },
        data: { isActive: false },
      });
    }

    const removedCount = itemsToDeactivate.length;
    await AuditService.log({
      userId: actorId,
      tenantId,
      action: 'CONTRACT_SHIFT_REQUIREMENTS_SYNCED',
      resource: `contract/${contract.id}/shift-requirements`,
      payload: {
        contractId: contract.id,
        contractVersionId,
        beforeCount,
        afterCount: beforeCount + addedCount - removedCount,
        actorId,
        traceId: trace.getSpan(context.active())?.spanContext().traceId ?? loggerContext.getStore()?.traceId ?? null,
      },
      status: 'SUCCESS',
    }, tx);
  }

  static async syncContractStaffStandards(
    tx: any,
    tenantId: string,
    contract: any,
    contractVersionId: string,
    acceptancePolicy: unknown,
    actorId: string,
  ) {
    const staffStandards = parseJsonArray<StaffStandardRule>((acceptancePolicy as any)?.staffStandards)
      .filter((item) => item && item.standardName);

    const activeKeys = new Set<string>();
    let beforeCount = 0;
    let addedCount = 0;
    let updatedCount = 0;

    const existingItems = await tx.contractStaffStandard.findMany({
      where: { tenantId, contractId: contract.id, contractVersionId },
      select: { id: true, standardCode: true, appliesToGuardPostId: true, isActive: true },
    });
    beforeCount = existingItems.filter((i: any) => i.isActive).length;

    for (const [index, rule] of staffStandards.entries()) {
      const standardCode = String(rule.standardCode || `STD_${index + 1}`).trim().toUpperCase();
      const appliesToGuardPostId = rule.appliesToGuardPostId || 'ALL';
      const businessKey = `${contractVersionId}::${standardCode}::${appliesToGuardPostId}`;
      activeKeys.add(businessKey);

      const existing = existingItems.find(
        (item: any) => `${contractVersionId}::${item.standardCode}::${item.appliesToGuardPostId || 'ALL'}` === businessKey
      );

      const data = {
        standardName: rule.standardName || null,
        requiredQualifications: Array.isArray(rule.requiredQualifications)
          ? rule.requiredQualifications
          : (rule.details ? [rule.details] : []),
        blockingLevel: String(rule.blockingLevel || (rule.required ? 'BLOCK' : 'WARN')).toUpperCase(),
        isActive: true,
        sortOrder: Number(rule.sortOrder ?? index),
        metadata: {
          appliesTo: rule.appliesTo || null,
          details: rule.details || null,
          source: 'acceptancePolicy.staffStandards',
        },
      };

      if (existing) {
        await tx.contractStaffStandard.update({
          where: { id: existing.id },
          data,
        });
        if (!existing.isActive) addedCount++; else updatedCount++;
      } else {
        await tx.contractStaffStandard.create({
          data: {
            tenantId,
            contractId: contract.id,
            contractVersionId,
            siteId: contract.siteId,
            standardCode,
            appliesToGuardPostId: rule.appliesToGuardPostId || null,
            ...data,
          },
        });
        addedCount++;
      }
    }

    const itemsToDeactivate = existingItems.filter((item: any) => {
      const businessKey = `${contractVersionId}::${item.standardCode}::${item.appliesToGuardPostId || 'ALL'}`;
      return !activeKeys.has(businessKey) && item.isActive;
    });

    if (itemsToDeactivate.length > 0) {
      await tx.contractStaffStandard.updateMany({
        where: { id: { in: itemsToDeactivate.map((i: any) => i.id) } },
        data: { isActive: false },
      });
    }

    const removedCount = itemsToDeactivate.length;
    await AuditService.log({
      userId: actorId,
      tenantId,
      action: 'CONTRACT_STAFF_STANDARDS_SYNCED',
      resource: `contract/${contract.id}/staff-standards`,
      payload: {
        contractId: contract.id,
        contractVersionId,
        beforeCount,
        afterCount: beforeCount + addedCount - removedCount,
        actorId,
        traceId: trace.getSpan(context.active())?.spanContext().traceId ?? loggerContext.getStore()?.traceId ?? null,
      },
      status: 'SUCCESS',
    }, tx);
  }
}
