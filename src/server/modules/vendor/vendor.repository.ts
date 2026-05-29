import { db } from '../../core/db/prisma.js';
import { SecurityContext } from '../../core/architecture/types.js';
import { VendorDTO, ContractDTO, ContractVersionCreateDTO, SiteDTO, GuardPostDTO } from './vendor.schema.js';
import { assertVendorActorValueInScope } from '../../shared/security/vendor-actor-scope.js';
import {
  buildShiftDateTime,
  dateRange,
  deriveShiftType,
  parseShiftRequirements,
  parseStaffStandards,
  validateGuardAgainstStandards,
} from './shift-policy.helpers.js';
import { buildScopedContractWhere, SHIFT_SHORTAGE_VIOLATION, SHIFT_VIOLATION_SOURCE } from './vendor.repository.shared.js';
import { VendorCatalogRepository } from './vendor-catalog.repository.js';
import { SiteRepository } from './site.repository.js';
import { ContractRepository } from './contract.repository.js';

export class VendorRepository {
  static async listVendors(ctx: SecurityContext, cursor?: string, limit: number = 20, view?: string) {
    return await VendorCatalogRepository.list(ctx, cursor, limit, view);
  }

  static async createVendor(ctx: SecurityContext, data: VendorDTO) {
    return await VendorCatalogRepository.create(ctx, data);
  }

  static async updateVendor(ctx: SecurityContext, id: string, data: Partial<VendorDTO>) {
    return await VendorCatalogRepository.update(ctx, id, data);
  }

  static async listSites(ctx: SecurityContext, cursor?: string, limit: number = 20, filters: { status?: string; vendorId?: string } = {}) {
    return await SiteRepository.list(ctx, cursor, limit, filters);
  }

  static async createSite(ctx: SecurityContext, data: SiteDTO) {
    return await SiteRepository.create(ctx, data);
  }

  static async updateSite(ctx: SecurityContext, id: string, data: Partial<SiteDTO>) {
    return await SiteRepository.update(ctx, id, data);
  }

  static async listGuardPosts(ctx: SecurityContext, siteId?: string) {
    return await SiteRepository.listGuardPosts(ctx, siteId);
  }

  static async createGuardPost(ctx: SecurityContext, data: GuardPostDTO) {
    return await SiteRepository.createGuardPost(ctx, data);
  }

  static async updateGuardPost(ctx: SecurityContext, id: string, data: Partial<GuardPostDTO>) {
    return await SiteRepository.updateGuardPost(ctx, id, data);
  }

  static async listContracts(ctx: SecurityContext, cursor?: string, limit: number = 20, view?: string) {
    return await ContractRepository.list(ctx, cursor, limit, view);
  }

  static async listContractVersions(ctx: SecurityContext, contractId: string) {
    return await ContractRepository.listVersions(ctx, contractId);
  }

  static async createContractVersion(ctx: SecurityContext, contractId: string, data: ContractVersionCreateDTO) {
    return await ContractRepository.createVersion(ctx, contractId, data);
  }

  static async activateContractVersion(ctx: SecurityContext, contractId: string, versionId: string) {
    return await ContractRepository.activateVersion(ctx, contractId, versionId);
  }

  static async archiveContractVersion(ctx: SecurityContext, contractId: string, versionId: string) {
    return await ContractRepository.archiveVersion(ctx, contractId, versionId);
  }

  static async createContract(ctx: SecurityContext, data: ContractDTO) {
    return await ContractRepository.create(ctx, data);
  }

  static async updateContract(ctx: SecurityContext, id: string, data: Partial<ContractDTO>) {
    return await ContractRepository.update(ctx, id, data);
  }

  static async listComplianceScores(ctx: SecurityContext, view?: string) {
    return await VendorCatalogRepository.listComplianceScores(ctx, view);
  }

  static async getVendorStats(ctx: SecurityContext, vendorId: string) {
    return await VendorCatalogRepository.getStats(ctx, vendorId);
  }

  static async generateShiftSchedules(ctx: SecurityContext, input: { contractId: string; dateFrom: string; dateTo: string }) {
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const contract = await tx.contract.findFirst({
        where: buildScopedContractWhere(ctx, { id: input.contractId }),
        include: {
          site: { select: { id: true, siteName: true, vendorId: true } },
          activeVersion: {
            include: {
              shiftRequirements: true,
            },
          },
        },
      });

      if (!contract) throw new Error('CONTRACT_NOT_FOUND');
      assertVendorActorValueInScope(ctx, {
        vendorId: contract.vendorId,
        siteId: contract.siteId,
        contractId: contract.id,
      });

      const shiftRequirements = parseShiftRequirements(contract);
      if (shiftRequirements.length === 0) {
        throw new Error('CONTRACT_SHIFT_REQUIREMENTS_NOT_CONFIGURED');
      }

      const dates = dateRange(input.dateFrom, input.dateTo);
      const createdOrUpdated: any[] = [];

      for (const date of dates) {
        const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
        for (const requirement of shiftRequirements) {
          const appliesOnDate = weekday === 0 ? requirement.appliesOnSunday
            : weekday === 1 ? requirement.appliesOnMonday
            : weekday === 2 ? requirement.appliesOnTuesday
            : weekday === 3 ? requirement.appliesOnWednesday
            : weekday === 4 ? requirement.appliesOnThursday
            : weekday === 5 ? requirement.appliesOnFriday
            : requirement.appliesOnSaturday;
          if (appliesOnDate === false) continue;

          const schedule = await tx.shiftSchedule.upsert({
            where: {
              tenantId_contractId_siteId_guardPostId_date_shiftType_startTime_endTime_positionName: {
                tenantId: ctx.tenantId,
                contractId: contract.id,
                siteId: contract.siteId,
                guardPostId: requirement.guardPostId || null,
                date,
                shiftType: requirement.shiftType || deriveShiftType(requirement.shiftLabel, requirement.startTime),
                startTime: requirement.startTime!,
                endTime: requirement.endTime!,
                positionName: requirement.positionName || requirement.shiftLabel || requirement.shiftName || 'Ca trực',
              },
            },
            update: {
              requiredCount: Number(requirement.requiredCount || requirement.requiredStaffCount || 0),
              metadata: {
                shiftRequirementId: requirement.id || null,
                shiftLabel: requirement.shiftLabel || requirement.shiftName || null,
                patrolRequired: Boolean(requirement.patrolRequired),
              },
            },
            create: {
              tenantId: ctx.tenantId,
              contractId: contract.id,
              siteId: contract.siteId,
              date,
              shiftType: requirement.shiftType || deriveShiftType(requirement.shiftLabel, requirement.startTime),
              startTime: requirement.startTime!,
              endTime: requirement.endTime!,
              requiredCount: Number(requirement.requiredCount || requirement.requiredStaffCount || 0),
              positionName: requirement.positionName || requirement.shiftLabel || requirement.shiftName || 'Ca trực',
              metadata: {
                shiftRequirementId: requirement.id || null,
                shiftLabel: requirement.shiftLabel || requirement.shiftName || null,
                patrolRequired: Boolean(requirement.patrolRequired),
              },
              ...(requirement.guardPostId
                ? { guardPost: { connect: { id: requirement.guardPostId } } }
                : {}),
            },
          });

          createdOrUpdated.push(schedule);
        }
      }

      return {
        contractId: contract.id,
        siteId: contract.siteId,
        generatedCount: createdOrUpdated.length,
        schedules: createdOrUpdated,
      };
    });
  }

  static async listShiftSchedules(ctx: SecurityContext, input: { contractId?: string; dateFrom: string; dateTo: string }) {
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const scopedContracts = await tx.contract.findMany({
        where: buildScopedContractWhere(ctx, input.contractId ? { id: input.contractId } : {}),
        select: {
          id: true,
          contractName: true,
          contractCode: true,
          vendorId: true,
          siteId: true,
          acceptancePolicy: true,
          activeVersion: {
            select: {
              shiftRequirements: true,
              staffStandards: {
                include: {
                  appliesToGuardPost: { select: { id: true, postName: true } },
                },
              },
            },
          },
        },
      });

      if (scopedContracts.length === 0) {
        return [];
      }

      const schedules = await tx.shiftSchedule.findMany({
        where: {
          contractId: { in: scopedContracts.map((item: any) => item.id) },
          ...(ctx.assignedSiteId ? { siteId: ctx.assignedSiteId } : {}),
          date: { gte: input.dateFrom, lte: input.dateTo },
        },
        include: {
          guardPost: { select: { id: true, postName: true, siteId: true } },
          assignments: {
            include: {
              staff: {
                select: {
                  id: true,
                  fullName: true,
                  role: true,
                  assignedVendorId: true,
                  assignedSiteId: true,
                  assignedContractId: true,
                  qualifications: true,
                  licenseNumber: true,
                  idNumber: true,
                  idExpiry: true,
                  status: true,
                },
              },
            },
            orderBy: { assignedAt: 'asc' },
          },
          complianceItems: true,
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { positionName: 'asc' }],
      });

      const violations = schedules.length > 0
        ? await tx.violationEvent.findMany({
            where: {
              sourceType: SHIFT_VIOLATION_SOURCE,
              contractId: { in: scopedContracts.map((item: any) => item.id) },
              occurredAt: {
                gte: new Date(`${input.dateFrom}T00:00:00`),
                lte: new Date(`${input.dateTo}T23:59:59`),
              },
            },
          }).catch(() => [])
        : [];

      const contractMap = new Map<string, any>(scopedContracts.map((item: any) => [item.id, item] as [string, any]));
      const violationMap = new Map<string, any>(
        violations
          .map((item: any) => [String(item?.metadata?.shiftScheduleId || ''), item] as [string, any])
          .filter(([key]: [string, any]) => Boolean(key)),
      );

      return schedules.map((schedule: any) => {
        const assignedCount = schedule.assignments.length;
        const missingCount = Math.max(0, schedule.requiredCount - assignedCount);
        const contract = contractMap.get(schedule.contractId);
        const standards = parseStaffStandards(contract);
        const assignmentWarnings = schedule.assignments.flatMap((assignment: any) => {
          const warnings = validateGuardAgainstStandards(assignment.staff, standards, schedule, schedule.guardPost?.postName);
          return warnings.map((warning) => ({
            ...warning,
            assignmentId: assignment.id,
            staffId: assignment.staffId,
            staffName: assignment.staff?.fullName,
          }));
        });

        return {
          ...schedule,
          contractName: contract?.contractName || contract?.contractCode || schedule.contractId,
          guardPostName: schedule.guardPost?.postName || null,
          shiftLabel: schedule.metadata?.shiftLabel || schedule.positionName,
          assignedCount,
          missingCount,
          coverageStatus: missingCount > 0 ? 'UNDERSTAFFED' : 'FULL',
          assignmentWarnings,
          shortageViolation: violationMap.get(schedule.id) || null,
        };
      });
    });
  }

  static async assignGuardToShift(ctx: SecurityContext, input: { shiftScheduleId: string; staffId: string; notes?: string }) {
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const schedule = await tx.shiftSchedule.findFirst({
        where: { id: input.shiftScheduleId },
        include: {
          guardPost: { select: { id: true, postName: true } },
          assignments: { select: { id: true, staffId: true } },
        },
      });
      if (!schedule) throw new Error('SHIFT_SCHEDULE_NOT_FOUND');

      const contract = await tx.contract.findFirst({
        where: { id: schedule.contractId },
        select: {
          id: true,
          vendorId: true,
          siteId: true,
          acceptancePolicy: true,
          activeVersion: {
            select: {
              staffStandards: {
                include: {
                  appliesToGuardPost: { select: { id: true, postName: true } },
                },
              },
            },
          },
        },
      });
      if (!contract) throw new Error('CONTRACT_NOT_FOUND');

      assertVendorActorValueInScope(ctx, {
        vendorId: contract.vendorId,
        siteId: contract.siteId,
        contractId: contract.id,
      });

      const staff = await tx.staff.findFirst({
        where: { id: input.staffId },
        select: {
          id: true,
          fullName: true,
          role: true,
          status: true,
          assignedVendorId: true,
          assignedSiteId: true,
          assignedContractId: true,
          qualifications: true,
          licenseNumber: true,
          idNumber: true,
          idExpiry: true,
        },
      });
      if (!staff) throw new Error('STAFF_NOT_FOUND');
      if (staff.role !== 'guard') throw new Error('SHIFT_ASSIGNMENT_GUARD_ONLY');
      if (staff.status !== 'active') throw new Error('SHIFT_ASSIGNMENT_STAFF_INACTIVE');
      if (schedule.assignments.some((item: any) => item.staffId === staff.id)) throw new Error('SHIFT_ASSIGNMENT_ALREADY_EXISTS');
      if (schedule.assignments.length >= schedule.requiredCount) throw new Error('SHIFT_REQUIRED_COUNT_REACHED');

      if (staff.assignedVendorId && contract.vendorId && staff.assignedVendorId !== contract.vendorId) {
        throw new Error('VENDOR_SCOPE_MISMATCH');
      }
      if (staff.assignedSiteId && staff.assignedSiteId !== schedule.siteId) {
        throw new Error('SITE_SCOPE_MISMATCH');
      }
      if (staff.assignedContractId && staff.assignedContractId !== schedule.contractId) {
        throw new Error('CONTRACT_SCOPE_MISMATCH');
      }

      const overlapping = await tx.shiftAssignment.findFirst({
        where: {
          staffId: staff.id,
          status: 'ASSIGNED',
          shiftSchedule: {
            date: schedule.date,
          },
        },
        include: {
          shiftSchedule: {
            select: { id: true, startTime: true, endTime: true, date: true, positionName: true },
          },
        },
      });

      if (overlapping && overlapping.shiftScheduleId !== schedule.id) {
        const currentStart = buildShiftDateTime(schedule.date, schedule.startTime);
        const currentEnd = buildShiftDateTime(schedule.date, schedule.endTime);
        const existingStart = buildShiftDateTime(overlapping.shiftSchedule.date, overlapping.shiftSchedule.startTime);
        const existingEnd = buildShiftDateTime(overlapping.shiftSchedule.date, overlapping.shiftSchedule.endTime);
        const overlaps = currentStart < existingEnd && existingStart < currentEnd;
        if (overlaps) {
          throw new Error('GUARD_ALREADY_ASSIGNED_IN_OVERLAPPING_SHIFT');
        }
      }

      const warnings = validateGuardAgainstStandards(staff, parseStaffStandards(contract), schedule, schedule.guardPost?.postName);
      const blockingWarnings = warnings.filter((item) => item.blocking);
      if (blockingWarnings.length > 0) {
        const message = blockingWarnings.map((item) => item.message).join(' | ');
        throw new Error(`GUARD_STANDARD_BLOCKED:${message}`);
      }

      const assignment = await tx.shiftAssignment.create({
        data: {
          tenantId: ctx.tenantId,
          shiftScheduleId: schedule.id,
          staffId: staff.id,
          vendorId: contract.vendorId || null,
          contractId: schedule.contractId,
          siteId: schedule.siteId,
          assignedBy: ctx.userId,
          notes: input.notes || null,
          metadata: {
            warnings,
          },
        },
        include: {
          staff: {
            select: {
              id: true,
              fullName: true,
              role: true,
              qualifications: true,
              licenseNumber: true,
              idNumber: true,
              idExpiry: true,
            },
          },
        },
      });

      return {
        assignment,
        warnings,
      };
    });
  }

  static async removeShiftAssignment(ctx: SecurityContext, assignmentId: string) {
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const assignment = await tx.shiftAssignment.findFirst({
        where: { id: assignmentId },
        include: {
          shiftSchedule: {
            select: { id: true, contractId: true, siteId: true },
          },
        },
      });

      if (!assignment) throw new Error('SHIFT_ASSIGNMENT_NOT_FOUND');

      const contract = await tx.contract.findFirst({
        where: { id: assignment.shiftSchedule.contractId },
        select: { id: true, vendorId: true, siteId: true },
      });
      if (!contract) throw new Error('CONTRACT_NOT_FOUND');

      assertVendorActorValueInScope(ctx, {
        vendorId: contract.vendorId,
        siteId: contract.siteId,
        contractId: contract.id,
      });

      await tx.shiftAssignment.delete({ where: { id: assignment.id } });
      return { success: true };
    });
  }

  static async processOverdueShiftShortages(tenantId: string) {
    return await db.withTenant(tenantId, async (tx: any) => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const schedules = await tx.shiftSchedule.findMany({
        where: {
          date: { lte: today },
        },
        include: {
          assignments: { where: { status: 'ASSIGNED' }, select: { id: true } },
        },
      });
      const contracts = await tx.contract.findMany({
        where: { id: { in: [...new Set(schedules.map((item: any) => item.contractId))] } },
        select: { id: true, vendorId: true, siteId: true },
      });
      const contractMap = new Map<string, any>(contracts.map((item: any) => [item.id, item] as [string, any]));

      let createdViolations = 0;

      for (const schedule of schedules) {
        const shiftStart = buildShiftDateTime(schedule.date, schedule.startTime);
        if (shiftStart > now) continue;

        const assignedCount = schedule.assignments.length;
        const missingCount = Math.max(0, schedule.requiredCount - assignedCount);
        if (missingCount <= 0) continue;

        await tx.violationEvent.upsert({
          where: {
            tenantId_idempotencyKey: {
              tenantId,
              idempotencyKey: `shift-shortage:${schedule.id}:${schedule.date}`,
            },
          },
          update: {
            metadata: {
              shiftScheduleId: schedule.id,
              requiredCount: schedule.requiredCount,
              assignedCount,
              missingCount,
              date: schedule.date,
              startTime: schedule.startTime,
            },
            penaltyAmount: 0,
            status: 'PENDING_REVIEW',
          },
          create: {
            tenantId,
            vendorId: contractMap.get(schedule.contractId)?.vendorId || null,
            contractId: schedule.contractId,
            siteId: schedule.siteId,
            guardPostId: schedule.guardPostId || null,
            sourceType: SHIFT_VIOLATION_SOURCE,
            violationType: SHIFT_SHORTAGE_VIOLATION,
            severity: missingCount >= schedule.requiredCount ? 'HIGH' : 'MEDIUM',
            status: 'PENDING_REVIEW',
            occurredAt: shiftStart,
            idempotencyKey: `shift-shortage:${schedule.id}:${schedule.date}`,
            evidence: {
              shiftScheduleId: schedule.id,
              date: schedule.date,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            },
            metadata: {
              shiftScheduleId: schedule.id,
              requiredCount: schedule.requiredCount,
              assignedCount,
              missingCount,
              positionName: schedule.positionName,
            },
          },
        });

        createdViolations += 1;
      }

      return { createdViolations };
    });
  }
}
