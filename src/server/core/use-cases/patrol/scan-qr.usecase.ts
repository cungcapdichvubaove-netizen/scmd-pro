import { trace, SpanStatusCode } from '@opentelemetry/api';
import { z } from 'zod';
import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole, LocationDTO } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';
import { timingSafeStringEqual } from '../../security/constant-time.js';
import { db } from '../../db/prisma.js';
import { BadRequestError } from '../../errors/domain.error.js';

const tracer = trace.getTracer('scmd-usecases');

const scanQrRequestSchema = z.object({
  checkpointId: z.string().min(1),
  qr_hash: z.string().min(1).optional(),
  qrHash: z.string().min(1).optional(),
  staffId: z.string().min(1),
  location: z.object({
    lat: z.number(),
    lon: z.number(),
    accuracy: z.number().optional(),
  }),
  patrolSessionId: z.string().optional(),
  scannedAt: z.string().datetime().optional(),
  photoEvidenceIds: z.array(z.string().min(1)).optional(),
  note: z.string().max(1000).optional(),
  _signature: z.string().optional(),
  _timestamp: z.number().int().optional(),
}).superRefine((value, ctx) => {
  if (!value.qr_hash && !value.qrHash) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['qr_hash'],
      message: 'QR hash là bắt buộc',
    });
  }
});

export interface ScanQRRequest {
  checkpointId: string;
  qr_hash?: string;
  qrHash?: string;
  staffId: string;
  location: LocationDTO;
  patrolSessionId?: string;
  scannedAt?: string;
  photoEvidenceIds?: string[];
  note?: string;
  _signature?: string;
  _timestamp?: number;
}

export interface ScanQRResponse {
  success: boolean;
  log: { id: string; [key: string]: unknown };
}

export class ScanQRUseCase extends BaseUseCase<ScanQRRequest, ScanQRResponse> {
  constructor() {
    super();
  }

  protected async authorize(context: SecurityContext, _request: ScanQRRequest): Promise<void> {
    const allowedRoles: string[] = [
      UserRole.GUARD,
      UserRole.SUPERVISOR,
      UserRole.TENANT_ADMIN,
      UserRole.SUPER_ADMIN
    ];

    if (!allowedRoles.includes(context.role)) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected override async validate(request: ScanQRRequest): Promise<void> {
    const validated = scanQrRequestSchema.safeParse(request);
    if (!validated.success) {
      throw new BadRequestError(`Dữ liệu scan QR không hợp lệ: ${validated.error.errors.map((e) => e.message).join(', ')}`);
    }
  }

  protected async internalExecute(context: SecurityContext, request: ScanQRRequest): Promise<ScanQRResponse> {
    return await tracer.startActiveSpan('ScanQRUseCase:execute', async (span) => {
      try {
        const validated = scanQrRequestSchema.parse(request);
        const { checkpointId, location, patrolSessionId, scannedAt, photoEvidenceIds = [], note, _signature, _timestamp } = validated;
        const qr_hash = String(validated.qr_hash || validated.qrHash || '');
        const { tenantId } = context;
        if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
          throw new Error('SCAN_LOCATION_REQUIRED');
        }

        span.setAttributes({
          'scmd.tenant_id': tenantId,
          'scmd.checkpoint_id': checkpointId,
          'scmd.staff_id': context.userId,
        });

        // 1. Get checkpoint via PostgreSQL repository
        const checkpoint = await PatrolRepository.getCheckpointById(tenantId, checkpointId);
        if (!checkpoint) throw new Error('NOT_FOUND');

        // GAP A — Replay Attack Window: Prevent double scan within 30 minutes
        const referenceTime = _timestamp ? new Date(_timestamp) : new Date();
        const isReplay = await PatrolRepository.checkLastScan(tenantId, context.userId, checkpointId, 30, referenceTime.getTime());
        if (isReplay) {
          throw new Error('REPLAY_SCAN_BUFFER: Checkpoint already scanned recently. Please wait 30 minutes.');
        }

        // GAP B — Offline Signature Verification removed due to NEW-B1 insecurity.
        // Frontend secrets are inherently exposed. Rely on server-side edge-validation and anomaly ML instead.

        // FIX [A01]: Verify qr_hash to prevent fraud (cloned/known IDs)
        const expectedQrHash = String((checkpoint as any).qrHash || (checkpoint as any).qr_hash || '');
        const inputQrHash = String(qr_hash || '');
        
        if (!timingSafeStringEqual(expectedQrHash, inputQrHash)) {
          throw new Error('QR_INTEGRITY_FAILED: Invalid QR hash detected.');
        }

        // 2. Domain rules: Cannot scan if not active
        if ((checkpoint as { status: string }).status !== 'active') {
          throw new Error(`StateConflict: Checkpoint '${checkpointId}' is ${(checkpoint as { status: string }).status}, scans are forbidden.`);
        }

        if (!patrolSessionId) {
          const complianceRouteCheckpoint = await db.forTenant(tenantId, { readOnly: true }).patrolRouteCheckpoint.findFirst({
            where: {
              checkpointId,
              route: {
                status: 'ACTIVE',
                contractId: { not: null },
              },
            },
            select: {
              id: true,
              route: {
                select: {
                  id: true,
                  contractId: true,
                  siteId: true,
                },
              },
            },
          });

          if (complianceRouteCheckpoint) {
            throw new Error('PATROL_SESSION_REQUIRED_FOR_CONTRACT_ROUTE');
          }
        }

        let routeCheckpointId: string | null = null;
        let expectedSequence: number | null = null;
        let sequenceActual: number | null = null;
        let gpsRequired = true;
        let routeRadiusMeters = 50;
        const exceptionCodes: string[] = [];

        if (patrolSessionId) {
          const session = await db.forTenant(tenantId, { readOnly: true }).patrolSession.findUnique({
            where: { id: patrolSessionId },
            include: {
              route: {
                include: {
                  checkpoints: {
                    orderBy: { sequence: 'asc' },
                    include: { checkpoint: { select: { id: true } } }
                  }
                }
              },
              logs: { orderBy: { createdAt: 'asc' } }
            }
          });
          if (!session) throw new Error('PATROL_SESSION_NOT_FOUND');
          if (['COMPLETED', 'CANCELLED', 'MISSED'].includes(session.status)) {
            throw new Error('PATROL_SESSION_CLOSED');
          }
          if (session.staffId !== context.userId && context.role === UserRole.GUARD) {
            throw new Error('UNAUTHORIZED_ACTION');
          }
          const routeItems = session.route.checkpoints;
          const routeItem = routeItems.find((item: any) => item.checkpointId === checkpointId);
          const scannedRouteCheckpointIds = new Set(session.logs.map((log: any) => log.routeCheckpointId).filter(Boolean));
          const nextExpected = routeItems.find((item: any) => item.isRequired && !scannedRouteCheckpointIds.has(item.id));
          expectedSequence = nextExpected?.sequence ?? null;
          sequenceActual = routeItem?.sequence ?? null;

          if (!routeItem) {
            exceptionCodes.push('OFF_ROUTE');
          } else {
            routeCheckpointId = routeItem.id;
            gpsRequired = routeItem.gpsRequired ?? true;
            routeRadiusMeters = routeItem.geoRadiusMeters || 50;
            if (scannedRouteCheckpointIds.has(routeItem.id)) {
              throw new Error('DUPLICATE_PATROL_CHECKPOINT_SCAN');
            }
            if (nextExpected && routeItem.id !== nextExpected.id) {
              exceptionCodes.push('WRONG_ORDER');
            }
            if (routeItem.photoRequired && photoEvidenceIds.length === 0) {
              exceptionCodes.push('MISSING_PHOTO_EVIDENCE');
            }
            if (routeItem.noteRequired && !note) {
              exceptionCodes.push('MISSING_REQUIRED_NOTE');
            }
          }
        }

        // 3. Proximity check using PostgreSQL PostGIS (Server-authoritative)
        const isProximityValid = gpsRequired
          ? await PatrolRepository.verifyGuardLocation(
              tenantId,
              checkpointId,
              location.lat,
              location.lon,
              location.accuracy,
              routeRadiusMeters
            )
          : true;

        if (!isProximityValid && patrolSessionId) {
          exceptionCodes.push('GPS_MISMATCH');
        } else if (!isProximityValid) {
          throw new Error('LOCATION_FRAUD_DETECTED: Guard too far from checkpoint');
        }

        // 4. Create log in PostgreSQL
        const log = await PatrolRepository.createLog(
          context,
          checkpointId,
          {
            location,
            status: exceptionCodes.length > 0 ? 'exception' : 'scanned',
            patrolSessionId: patrolSessionId || null,
            routeCheckpointId,
            sequenceActual,
            expectedSequence,
            scannedAt,
            photoEvidenceIds,
            note,
            validationStatus: exceptionCodes.length > 0 ? 'EXCEPTION' : 'VALID',
            exceptionCodes,
            offlineSignature: _signature,
            offlineTimestamp: _timestamp,
            syncTime: new Date().toISOString()
          }
        );

        await AuditService.log({
          userId: context.userId,
          tenantId: context.tenantId,
          action: 'PATROL_SCAN_QR',
          resource: `patrol/checkpoint/${checkpointId}`,
          payload: { checkpointId, logId: (log as { id: string }).id, patrolSessionId: patrolSessionId || null, exceptionCodes },
          status: 'SUCCESS'
        });

        if (patrolSessionId) {
          await this.refreshSessionProgress(context, patrolSessionId);
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return { success: true, log: log as { id: string } };
      } catch (err: any) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  private async refreshSessionProgress(context: SecurityContext, patrolSessionId: string) {
    const session = await db.forTenant(context.tenantId, { readOnly: true }).patrolSession.findUnique({
      where: { id: patrolSessionId },
      include: {
        route: { include: { checkpoints: { orderBy: { sequence: 'asc' } } } },
        logs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) return;

    const { PatrolComplianceCalculator } = await import('../../../modules/patrol/patrol-compliance.calculator.js');
    const compliance = PatrolComplianceCalculator.calculate({
      startedAt: session.startedAt,
      completedAt: null,
      route: session.route,
      logs: session.logs,
    });

    await db.withTenant(context.tenantId, async (tx: any) => {
      await tx.patrolSession.update({
        where: { id: patrolSessionId },
        data: {
          completionPercent: compliance.completionPercent,
          scannedCheckpointCount: new Set(session.logs.map((log: any) => log.routeCheckpointId).filter(Boolean)).size,
          missedCheckpointCount: compliance.missedCheckpointIds.length,
          lateCheckpointCount: compliance.lateCheckpointIds.length,
          outOfOrderCount: compliance.outOfOrderCount,
          gpsViolationCount: compliance.gpsViolationCount,
          evidenceMissingCount: compliance.evidenceMissingCount,
          complianceScore: compliance.complianceScore,
          exceptionSummary: {
            missedCheckpointIds: compliance.missedCheckpointIds,
            lateCheckpointIds: compliance.lateCheckpointIds,
            recommendation: compliance.recommendation,
          },
        },
      });
      const { EventBus } = await import('../../events/event-bus.js');
      await EventBus.dispatch({
        type: 'PATROL_SESSION_SCANNED',
        version: '1.0',
        tenantId: context.tenantId,
        actorId: context.userId,
        payload: {
          sessionId: patrolSessionId,
          completionPercent: compliance.completionPercent,
          complianceScore: compliance.complianceScore,
        },
      }, tx);
    });
  }
}
