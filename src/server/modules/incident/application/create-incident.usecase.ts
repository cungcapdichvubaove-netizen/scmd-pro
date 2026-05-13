import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { NotificationService } from '../../notification/notification.service.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { IncidentStatus, IncidentSeverity } from '@prisma/client';
import { createIncidentSchema } from '../incident.schema.js';

export interface CreateIncidentInput {
  type?: string;
  severity?: string;
  description?: string;
  imageUri?: string;
  location?: Record<string, unknown> | string;
}

export class CreateIncidentUseCase extends BaseUseCase<CreateIncidentInput, any> {
  override async authorize(context: SecurityContext): Promise<void> {
    // Anyone in the tenant can report an incident (Guard, Supervisor, Admin)
    if (!context.tenantId) {
      throw new Error('UNAUTHORIZED: No tenant context');
    }
  }

  override async validate(request: CreateIncidentInput, context: SecurityContext): Promise<void> {
    // 1. Zod Basic Integrity
    const normalizedInput = {
      ...request,
      severity: this.normalizeSeverity(request.severity)
    };
    createIncidentSchema.parse(normalizedInput);

    // 2. Automated Integrity Check: Reference Guard
    const { IntegrityGuard } = await import('../../../core/db/integrity.manager.js');
    await IntegrityGuard.ensureSameTenant(context.tenantId!, 'staff', [context.userId]);
  }

  private normalizeSeverity(severity?: string): IncidentSeverity {
    if (!severity) return IncidentSeverity.LOW;
    const normalized = severity.trim().toUpperCase();
    if (normalized === 'MEDIUM' || normalized === 'VỪA') return IncidentSeverity.MEDIUM;
    if (normalized === 'HIGH' || normalized === 'CAO') return IncidentSeverity.HIGH;
    if (normalized === 'CRITICAL' || normalized === 'KHẨN CẤP' || normalized === 'SOS') return IncidentSeverity.CRITICAL;
    return IncidentSeverity.LOW;
  }

  override async internalExecute(ctx: SecurityContext, input: CreateIncidentInput): Promise<any> {
    const severityEnum = this.normalizeSeverity(input.severity);
    const { type, description, imageUri, location } = input;

    // Domain Logic: Criticality Detection
    const isCritical = this.detectCriticality(severityEnum);
    
    let severityWeight = 1;
    if (severityEnum === IncidentSeverity.MEDIUM) severityWeight = 2;
    if (severityEnum === IncidentSeverity.HIGH) severityWeight = 3;
    if (severityEnum === IncidentSeverity.CRITICAL) severityWeight = 5;

    const incident = await db.forTenant(ctx.tenantId!).incident.create({
      data: {
        tenantId: ctx.tenantId,
        staffId: ctx.userId,
        type: type || 'Khác',
        severity: severityEnum,
        severityWeight,
        description: description || '',
        imageUri: imageUri || null,
        location: location ? (typeof location === 'string' ? JSON.parse(location) : location) : null,
        status: IncidentStatus.REPORTED,
        reportedAt: new Date()
      }
    });

    // Invalidate Cache after DB success
    const { IncidentRepository } = await import('../incident.repository.js');
    await IncidentRepository.invalidateList(ctx.tenantId!);

    await AuditService.log({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      action: 'CREATE_INCIDENT',
      resource: `incident/${incident.id}`,
      payload: { type: incident.type, severity: incident.severity, isCritical },
      status: 'SUCCESS'
    });

    // Send Real-time Notification
    await NotificationService.send({
      tenantId: ctx.tenantId,
      title: `⚠️ SỰ CỐ MỚI: ${type}`,
      message: `${(description || '').substring(0, 50)}...`,
      type: isCritical ? 'SOS' : 'INFO',
      metadata: { incidentId: incident.id }
    });

    if (isCritical) {
      const { getLightQueue } = await import('../../../core/queue/index.js');
      const lightQueue = getLightQueue();
      await lightQueue.add('critical-incident-zalo-notify', {
        type: 'CRITICAL_INCIDENT_NOTIFY',
        incidentId: incident.id,
        tenantId: ctx.tenantId,
        incidentType: incident.type,
        incidentDescription: incident.description,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
      });
    }

    if (imageUri) {
      const { getHeavyQueue } = await import('../../../core/queue/index.js');
      const heavyQueue = getHeavyQueue();
      await heavyQueue.add('analyze-incident-image', {
        type: 'AI_INCIDENT_IMAGE_ANALYSIS',
        incidentId: incident.id,
        tenantId: ctx.tenantId,
        imageUri,
        description
      }, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 }
      });
    }

    return incident;
  }

  private detectCriticality(severity?: IncidentSeverity): boolean {
    if (!severity) return false;
    return severity === IncidentSeverity.HIGH || severity === IncidentSeverity.CRITICAL;
  }
}
