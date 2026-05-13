import { trace, SpanStatusCode } from '@opentelemetry/api';
import crypto from 'node:crypto';
import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole, LocationDTO } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';

const tracer = trace.getTracer('scmd-usecases');

export interface ScanQRRequest {
  checkpointId: string;
  qr_hash: string;
  staffId: string;
  location: LocationDTO;
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

  protected async internalExecute(context: SecurityContext, request: ScanQRRequest): Promise<ScanQRResponse> {
    return await tracer.startActiveSpan('ScanQRUseCase:execute', async (span) => {
      try {
        const { checkpointId, qr_hash, location, _signature, _timestamp } = request;
        const { tenantId } = context;

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
        const expectedQrHash = String((checkpoint as any).qrHash || '');
        const inputQrHash = String(qr_hash || '');
        
        if (
          expectedQrHash.length !== inputQrHash.length || 
          !crypto.timingSafeEqual(Buffer.from(expectedQrHash), Buffer.from(inputQrHash))
        ) {
          throw new Error('QR_INTEGRITY_FAILED: Invalid QR hash detected.');
        }

        // 2. Domain rules: Cannot scan if not active
        if ((checkpoint as { status: string }).status !== 'active') {
          throw new Error(`StateConflict: Checkpoint '${checkpointId}' is ${(checkpoint as { status: string }).status}, scans are forbidden.`);
        }

        // 3. Proximity check using PostgreSQL PostGIS (Server-authoritative)
        const isProximityValid = await PatrolRepository.verifyGuardLocation(
          tenantId,
          checkpointId,
          location.lat,
          location.lon,
          location.accuracy
        );

        if (!isProximityValid) {
          throw new Error('LOCATION_FRAUD_DETECTED: Guard too far from checkpoint');
        }

        // 4. Create log in PostgreSQL
        const log = await PatrolRepository.createLog(
          context,
          checkpointId,
          {
            location,
            status: 'scanned',
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
          payload: { checkpointId, logId: (log as { id: string }).id },
          status: 'SUCCESS'
        });

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
}
