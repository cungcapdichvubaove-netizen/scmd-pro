import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, LocationDTO, UserRole } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';
import { logger } from '../../logger/index.js';

export interface CheckItemData {
  id: string;
  checked: boolean;
  note?: string;
  photoUri?: string;
}

export interface PatrolAnomaly {
  type: string;
  description?: string;
  [key: string]: unknown;
}

export interface CompletePatrolRequest {
  checkpointId: string;
  location?: LocationDTO;
  startTime: string;
  endTime: string;
  checkItemsData?: CheckItemData[];
  anomaly?: PatrolAnomaly;
  deviceId?: string;
  _signature?: string;
  _timestamp?: string;
  isShiftEnd?: boolean; // New flag to automatically close shift
}

export interface CompletePatrolResponse {
  success: boolean;
  logId: string;
}

import { AttendanceCheckOutUseCase } from '../attendance/check-out.usecase.js';

export class CompletePatrolUseCase extends BaseUseCase<CompletePatrolRequest, CompletePatrolResponse> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.GUARD, UserRole.SUPERVISOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected async internalExecute(context: SecurityContext, data: CompletePatrolRequest): Promise<CompletePatrolResponse> {
    try {
      // 1. Verify location if coords provided
      let isLocationValid = true;
      if (data.location) {
        isLocationValid = await PatrolRepository.verifyGuardLocation(
          context.tenantId,
          data.checkpointId,
          data.location.lat,
          data.location.lon
        );
        if (!isLocationValid) {
          logger.warn({ context, checkpointId: data.checkpointId }, 'FRAUD_DETECTED: Guard completed patrol while too far from checkpoint');
        }
      }

      // 2. Save log to PG
      const log = await PatrolRepository.createLog(
        context,
        data.checkpointId,
        {
          startTime: data.startTime,
          endTime: data.endTime,
          checkItems: data.checkItemsData,
          anomaly: data.anomaly ?? (!isLocationValid ? 'LOCATION_MISMATCH_FRAUD' : null),
          status: !isLocationValid ? 'danger' : 'ok',
          location: data.location,
          deviceId: data.deviceId,
          offlineSignature: data._signature,
          offlineTimestamp: data._timestamp,
          syncTime: new Date().toISOString()
        }
      );

      const logId = (log as { id: string }).id;

      // 3. If isShiftEnd is requested, trigger automatic Check-out
      if (data.isShiftEnd) {
        const checkOutUseCase = new AttendanceCheckOutUseCase();
        try {
          await checkOutUseCase.execute(context, {
            location: data.location,
            notes: `Tự động đóng ca sau khi hoàn thành tuần tra tại trạm ${data.checkpointId}`
          });
          logger.info({ staffId: context.userId }, 'Shift auto-closed via Patrol Report');
        } catch (err) {
          // If already checked out or other error, log it but don't fail the patrol completion
          logger.warn({ staffId: context.userId, err }, 'Failed to auto-close shift during patrol completion');
        }
      }

      await AuditService.log({
        userId: context.userId,
        tenantId: context.tenantId,
        action: 'PATROL_COMPLETE',
        resource: `patrol/checkpoint/${data.checkpointId}`,
        payload: {
          logId,
          checkpointId: data.checkpointId,
          locationValid: isLocationValid,
          hasAnomaly: !!data.anomaly || !isLocationValid
        },
        status: isLocationValid ? 'SUCCESS' : 'WARNING'
      });

      return { success: true, logId };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error({ err: error, staffId: context.userId }, 'Complete patrol failed');
      throw error;
    }
  }
}
