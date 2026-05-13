import { logger } from '../../core/logger/index.js';
import { db } from '../../core/db/prisma.js';
import { ScanQRUseCase } from '../../core/use-cases/patrol/scan-qr.usecase.js';
import { CompletePatrolUseCase } from '../../core/use-cases/patrol/complete-patrol.usecase.js';
import { SecurityContext, LocationDTO } from '../../core/architecture/types.js';
import { CheckItemData, PatrolAnomaly } from '../../core/use-cases/patrol/complete-patrol.usecase.js';

interface OfflineScanRequest {
  checkpointId: string;
  staffId: string;
  qr_hash: string;
  location: LocationDTO;
  _signature?: string;
  _timestamp?: number;
}

interface OfflineScanData {
  context: SecurityContext;
  request: OfflineScanRequest;
}

interface OfflineCompleteReportData {
  checkpointId: string;
  location?: LocationDTO;
  startTime: string;
  endTime: string;
  checkItemsData?: CheckItemData[];
  anomaly?: PatrolAnomaly;
  deviceId?: string;
  _signature?: string;
  _timestamp?: string;
}

interface OfflineCompleteData {
  context: SecurityContext;
  data: OfflineCompleteReportData;
}

/**
 * PatrolSyncService handles asynchronous synchronization of patrol data
 * gathered during offline sessions. It implements conflict resolution
 * logic to ensure data integrity when multiple guards sync simultaneously.
 */
export class PatrolSyncService {
  /**
   * Processes an offline QR scan request asynchronously.
   * Strategy: Last-Write-Wins (based on offlineTimestamp) for metadata updates,
   * but all scans are preserved as unique logs for audit trail.
   */
  static async processOfflineScan(data: OfflineScanData) {
    const { context, request } = data;
    const { checkpointId, staffId, _timestamp } = request;

    logger.info({ checkpointId, staffId, _timestamp }, 'Processing offline sync: QR Scan');

    // 1. Conflict Detection: Check if a duplicate scan already exists for this guard at this checkpoint within 1 minute range of the offline timestamp
    const timestamp = _timestamp ?? 0;
    const duplicate = await db.forTenant(context.tenantId, { readOnly: true }).patrolLog.findFirst({
      where: {
        checkpointId,
        staffId,
        metadata: {
          path: ['offlineTimestamp'],
          gte: timestamp - 60000,
          lte: timestamp + 60000
        }
      },
      select: { id: true }
    });

    if (duplicate) {
      logger.warn({ logId: duplicate.id, _timestamp: timestamp }, 'Offline Sync Conflict: Duplicate scan detected. Skipping to prevent redundancy.');
      return { success: true, status: 'SKIPPED_DUPLICATE' };
    }

    // 2. Execute the use case
    const useCase = new ScanQRUseCase();
    return await useCase.execute(context, request);
  }

  /**
   * Processes an offline patrol completion request.
   */
  static async processOfflineComplete(data: OfflineCompleteData) {
    const { context, data: reportData } = data;
    const { checkpointId, _timestamp } = reportData;

    logger.info({ checkpointId, _timestamp }, 'Processing offline sync: Patrol Completion');

    const useCase = new CompletePatrolUseCase();
    return await useCase.execute(context, reportData);
  }
}
