import { z } from 'zod';
import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, LocationDTO, UserRole } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';
import { logger } from '../../logger/index.js';
import { BadRequestError } from '../../errors/domain.error.js';

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

const completePatrolRequestSchema = z.object({
  checkpointId: z.string().min(1),
  location: z.object({
    lat: z.number(),
    lon: z.number(),
    accuracy: z.number().optional(),
  }).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  checkItemsData: z.array(z.object({
    id: z.string().min(1),
    checked: z.boolean(),
    note: z.string().max(1000).optional(),
    photoUri: z.string().max(2048).optional(),
  })).optional(),
  anomaly: z.object({
    type: z.string().min(1),
    description: z.string().max(2000).optional(),
  }).catchall(z.unknown()).optional(),
  deviceId: z.string().max(255).optional(),
  _signature: z.string().max(2048).optional(),
  _timestamp: z.string().datetime().optional(),
  isShiftEnd: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (new Date(data.endTime).getTime() < new Date(data.startTime).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endTime phải lớn hơn hoặc bằng startTime',
      path: ['endTime'],
    });
  }
});

export class CompletePatrolUseCase extends BaseUseCase<CompletePatrolRequest, CompletePatrolResponse> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.GUARD, UserRole.SUPERVISOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected override async validate(data: CompletePatrolRequest): Promise<void> {
    const validated = completePatrolRequestSchema.safeParse(data);
    if (!validated.success) {
      throw new BadRequestError(`Dữ liệu hoàn thành tuần tra không hợp lệ: ${validated.error.errors.map((issue) => issue.message).join(', ')}`);
    }
  }

  protected async internalExecute(context: SecurityContext, data: CompletePatrolRequest): Promise<CompletePatrolResponse> {
    try {
      const validated = completePatrolRequestSchema.parse(data);
      // 1. Verify location if coords provided
      let isLocationValid = true;
      if (validated.location) {
        isLocationValid = await PatrolRepository.verifyGuardLocation(
          context.tenantId,
          validated.checkpointId,
          validated.location.lat,
          validated.location.lon
        );
        if (!isLocationValid) {
          logger.warn({ context, checkpointId: validated.checkpointId }, 'FRAUD_DETECTED: Guard completed patrol while too far from checkpoint');
        }
      }

      // 2. Save log to PG
      const log = await PatrolRepository.createLog(
        context,
        validated.checkpointId,
        {
          startTime: validated.startTime,
          endTime: validated.endTime,
          checkItems: validated.checkItemsData,
          anomaly: validated.anomaly ?? (!isLocationValid ? 'LOCATION_MISMATCH_FRAUD' : null),
          status: !isLocationValid ? 'danger' : 'ok',
          location: validated.location,
          deviceId: validated.deviceId,
          offlineSignature: validated._signature,
          offlineTimestamp: validated._timestamp,
          syncTime: new Date().toISOString()
        }
      );

      const logId = (log as { id: string }).id;

      // 3. If isShiftEnd is requested, trigger automatic Check-out
      if (validated.isShiftEnd) {
        const checkOutUseCase = new AttendanceCheckOutUseCase();
        await checkOutUseCase.execute(context, {
          location: validated.location,
          notes: `Tự động đóng ca sau khi hoàn thành tuần tra tại trạm ${validated.checkpointId}`
        });
        logger.info({ staffId: context.userId }, 'Shift auto-closed via Patrol Report');
      }

      await AuditService.log({
        userId: context.userId,
        tenantId: context.tenantId,
        action: 'PATROL_COMPLETE',
        resource: `patrol/checkpoint/${validated.checkpointId}`,
        payload: {
          logId,
          checkpointId: validated.checkpointId,
          locationValid: isLocationValid,
          hasAnomaly: !!validated.anomaly || !isLocationValid
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
