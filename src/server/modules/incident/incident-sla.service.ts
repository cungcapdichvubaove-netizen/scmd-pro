import { IncidentSeverity } from '@prisma/client';
import { SecurityContext } from '../../core/architecture/types.js';
import { AcknowledgeIncidentUseCase } from './application/acknowledge-incident.usecase.js';
import { AddIncidentEvidenceUseCase } from './application/add-incident-evidence.usecase.js';
import { ApproveIncidentResolutionUseCase } from './application/approve-incident-resolution.usecase.js';
import { CloseIncidentUseCase } from './application/close-incident.usecase.js';
import { ProcessIncidentSlaBreachUseCase } from './application/process-incident-sla-breach.usecase.js';
import { RecordIncidentCreatedUseCase } from './application/record-incident-created.usecase.js';
import { RejectIncidentResolutionUseCase } from './application/reject-incident-resolution.usecase.js';
import { SubmitIncidentResolutionUseCase } from './application/submit-incident-resolution.usecase.js';
import { UpdateIncidentEvidenceStatusUseCase } from './application/update-incident-evidence-status.usecase.js';
import { IncidentSlaShared } from './incident-sla.shared.js';

export class IncidentSlaService {
  static getSlaMinutes(severity: IncidentSeverity): number {
    return IncidentSlaShared.getSlaMinutes(severity);
  }

  static buildSlaDeadline(severity: IncidentSeverity, from = new Date()): Date {
    return IncidentSlaShared.buildSlaDeadline(severity, from);
  }

  static async recordCreated(ctx: SecurityContext, incident: { id?: string } | string) {
    const incidentId = typeof incident === 'string' ? incident : incident?.id;
    if (!incidentId) throw new Error('INCIDENT_ID_REQUIRED');
    return await new RecordIncidentCreatedUseCase().execute(ctx, incidentId);
  }

  static async acknowledgeIncident(ctx: SecurityContext, incidentId: string, notes?: string | null) {
    return await new AcknowledgeIncidentUseCase().execute(ctx, { incidentId, notes });
  }

  static async addEvidence(
    ctx: SecurityContext,
    input: {
      incidentId: string;
      kind: any;
      uri?: string | null;
      note?: string | null;
      sourceType?: string | null;
      sourceId?: string | null;
      fileType?: string | null;
      fileUrl?: string | null;
      thumbnailUrl?: string | null;
      capturedAt?: Date | string | null;
      gpsLat?: number | null;
      gpsLng?: number | null;
      checksum?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return await new AddIncidentEvidenceUseCase().execute(ctx, {
      incidentId: input.incidentId,
      kind: input.kind,
      uri: input.uri ?? undefined,
      note: input.note ?? undefined,
      sourceType: (input.sourceType as any) ?? 'INCIDENT',
      sourceId: input.sourceId ?? undefined,
      fileType: input.fileType ?? undefined,
      fileUrl: input.fileUrl ?? undefined,
      thumbnailUrl: input.thumbnailUrl ?? undefined,
      capturedAt: input.capturedAt ? new Date(input.capturedAt) : undefined,
      gpsLat: input.gpsLat ?? undefined,
      gpsLng: input.gpsLng ?? undefined,
      checksum: input.checksum ?? undefined,
      metadata: input.metadata ?? undefined,
    });
  }

  static async updateEvidenceStatus(
    ctx: SecurityContext,
    incidentId: string,
    evidenceId: string,
    status: 'ACTIVE' | 'REJECTED' | 'ARCHIVED',
    note?: string | null,
  ) {
    return await new UpdateIncidentEvidenceStatusUseCase().execute(ctx, { incidentId, evidenceId, status, note });
  }

  static async submitResolution(ctx: SecurityContext, incidentId: string, notes: string, images: string[] = []) {
    return await new SubmitIncidentResolutionUseCase().execute(ctx, { incidentId, notes, images });
  }

  static async approveResolution(ctx: SecurityContext, incidentId: string, notes?: string | null) {
    return await new ApproveIncidentResolutionUseCase().execute(ctx, { incidentId, notes });
  }

  static async rejectResolution(ctx: SecurityContext, incidentId: string, reopenReason: string, requiredNextAction: string) {
    return await new RejectIncidentResolutionUseCase().execute(ctx, { incidentId, reopenReason, requiredNextAction });
  }

  static async closeIncident(ctx: SecurityContext, incidentId: string, notes?: string | null) {
    return await new CloseIncidentUseCase().execute(ctx, { incidentId, notes });
  }

  static async processOverdueTenant(tenantId: string) {
    return await new ProcessIncidentSlaBreachUseCase().execute(tenantId);
  }

  static async addTimeline(tx: any, input: any) {
    return await IncidentSlaShared.addTimeline(tx, input);
  }

  static async scheduleEscalation(tenantId: string, incidentJobKey: string, deadline: Date) {
    return await IncidentSlaShared.scheduleEscalation(tenantId, incidentJobKey, deadline);
  }

  static getMissingEvidenceTypes(requiredTypes: string[], evidences: any[]) {
    return IncidentSlaShared.getMissingEvidenceTypes(requiredTypes, evidences);
  }
}
