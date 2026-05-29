import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { db } from '../../../core/db/prisma.js';
import { BadRequestError } from '../../../core/errors/domain.error.js';
import { NotificationService } from '../../notification/notification.service.js';
import { createIncidentSchema } from '../incident.schema.js';
import { RecordIncidentCreatedUseCase } from './record-incident-created.usecase.js';
import { assertVendorActorValueInScope } from '../../../shared/security/vendor-actor-scope.js';

export interface CreateIncidentInput {
  type?: string;
  severity?: string;
  description?: string;
  imageUri?: string;
  location?: Record<string, unknown> | string;
  vendorId?: string;
  contractId?: string;
  siteId?: string;
}

export class CreateIncidentUseCase extends BaseUseCase<CreateIncidentInput, any> {
  private readonly recordIncidentCreatedUseCase = new RecordIncidentCreatedUseCase();

  override async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED: No tenant context');
  }

  override async validate(request: CreateIncidentInput, context: SecurityContext): Promise<void> {
    createIncidentSchema.parse({
      ...request,
      severity: this.normalizeSeverity(request.severity),
    });

    const { IntegrityGuard } = await import('../../../core/db/integrity.manager.js');
    await IntegrityGuard.ensureSameTenant(context.tenantId!, 'staff', [context.userId]);
  }

  override async internalExecute(ctx: SecurityContext, input: CreateIncidentInput): Promise<any> {
    const severityEnum = this.normalizeSeverity(input.severity);
    const { type, description, imageUri, location } = input;
    const isCritical = this.detectCriticality(severityEnum);
    const { vendorId, contractId, siteId } = await this.resolveContractScope(ctx, input);
    const tenantDb = db.forTenant(ctx.tenantId!);

    const incident = await tenantDb.incident.create({
      data: {
        tenantId: ctx.tenantId,
        staffId: ctx.userId,
        vendorId,
        contractId,
        siteId,
        type: type || 'OTHER',
        severity: severityEnum,
        severityWeight: this.getSeverityWeight(severityEnum),
        description: description || '',
        imageUri: imageUri || null,
        location: this.parseLocation(location),
        status: IncidentStatus.REPORTED,
        reportedAt: new Date(),
      },
    });

    const canHydrateSla = typeof (tenantDb as any).incident?.findUnique === 'function' && typeof (db as any).withTenant === 'function';
    const incidentWithSla = canHydrateSla
      ? await this.recordIncidentCreatedUseCase.execute(ctx, incident.id)
      : incident;

    const { IncidentRepository } = await import('../incident.repository.js');
    await IncidentRepository.invalidateList(ctx.tenantId!);

    await AuditService.log({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      action: 'CREATE_INCIDENT',
      resource: `incident/${incident.id}`,
      payload: {
        type: incident.type,
        severity: incident.severity,
        vendorId: incident.vendorId,
        contractId: incident.contractId,
        siteId: incident.siteId,
        isCritical,
        responseDueAt: incidentWithSla.responseDueAt,
        resolutionDueAt: incidentWithSla.resolutionDueAt,
      },
      status: 'SUCCESS',
    });

    await NotificationService.send({
      tenantId: ctx.tenantId,
      title: `Su co moi: ${incident.type}`,
      message: `${(description || '').substring(0, 50)}...`,
      type: isCritical ? 'SOS' : 'INFO',
      metadata: { incidentId: incident.id, contractId, siteId, vendorId },
    });

    if (isCritical) {
      const { getLightQueue } = await import('../../../core/queue/index.js');
      await getLightQueue().add('critical-incident-zalo-notify', {
        type: 'CRITICAL_INCIDENT_NOTIFY',
        incidentId: incident.id,
        tenantId: ctx.tenantId,
        incidentType: incident.type,
        incidentDescription: incident.description,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    }

    if (imageUri) {
      const { getHeavyQueue } = await import('../../../core/queue/index.js');
      await getHeavyQueue().add('analyze-incident-image', {
        type: 'AI_INCIDENT_IMAGE_ANALYSIS',
        incidentId: incident.id,
        tenantId: ctx.tenantId,
        imageUri,
        description,
      }, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
      });
    }

    return incidentWithSla;
  }

  private async resolveContractScope(ctx: SecurityContext, input: CreateIncidentInput) {
    const tenantDb = db.forTenant(ctx.tenantId!);
    let vendorId = input.vendorId ?? null;
    let contractId = input.contractId ?? null;
    let siteId = input.siteId ?? null;

    if (contractId) {
      const contractRepo = (tenantDb as any).contract;
      if (contractRepo?.findFirst) {
        const contract = await contractRepo.findFirst({
          where: { id: contractId, tenantId: ctx.tenantId, status: 'ACTIVE' },
          select: { vendorId: true, siteId: true },
        });
        if (!contract) throw new BadRequestError('ACTIVE_CONTRACT_NOT_FOUND');
        vendorId = contract.vendorId;
        siteId = contract.siteId ?? siteId;
      }
    }

    if (siteId) {
      const siteRepo = (tenantDb as any).site;
      if (siteRepo?.findFirst) {
        const site = await siteRepo.findFirst({
          where: { id: siteId, tenantId: ctx.tenantId },
          select: { vendorId: true },
        });
        if (!site) throw new BadRequestError('SITE_NOT_FOUND');
        vendorId = vendorId ?? site.vendorId;
      }
    }

    if (vendorId) {
      const vendorRepo = (tenantDb as any).vendor;
      if (vendorRepo?.findFirst) {
        const vendor = await vendorRepo.findFirst({
          where: { id: vendorId, tenantId: ctx.tenantId },
          select: { id: true },
        });
        if (!vendor) throw new BadRequestError('VENDOR_NOT_FOUND');
      }
    }

    assertVendorActorValueInScope(ctx, { vendorId, contractId, siteId });
    return { vendorId, contractId, siteId };
  }

  private normalizeSeverity(severity?: string): IncidentSeverity {
    if (!severity) return IncidentSeverity.LOW;
    const normalized = severity.trim().toUpperCase();
    if (normalized === 'MEDIUM' || normalized === 'VUA') return IncidentSeverity.MEDIUM;
    if (normalized === 'HIGH' || normalized === 'CAO') return IncidentSeverity.HIGH;
    if (normalized === 'CRITICAL' || normalized === 'KHAN_CAP' || normalized === 'SOS') return IncidentSeverity.CRITICAL;
    return IncidentSeverity.LOW;
  }

  private getSeverityWeight(severity: IncidentSeverity): number {
    if (severity === IncidentSeverity.CRITICAL) return 5;
    if (severity === IncidentSeverity.HIGH) return 3;
    if (severity === IncidentSeverity.MEDIUM) return 2;
    return 1;
  }

  private parseLocation(location?: Record<string, unknown> | string) {
    if (!location) return null;
    if (typeof location !== 'string') return location;
    try {
      return JSON.parse(location);
    } catch {
      throw new BadRequestError('INVALID_INCIDENT_LOCATION');
    }
  }

  private detectCriticality(severity?: IncidentSeverity): boolean {
    return severity === IncidentSeverity.HIGH || severity === IncidentSeverity.CRITICAL;
  }
}
