import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { RequestContextResolver } from '../../core/context/index.js';
import { QueueService } from '../../core/queue/index.js';
import { MediaService } from '../../core/media/media.service.js';
import { GetLogsQuery } from '../../core/use-cases/patrol/queries/get-logs.query.js';
import { GetCheckpointsUseCase } from '../../core/use-cases/patrol/get-checkpoints.usecase.js';
import { ScanQRUseCase } from '../../core/use-cases/patrol/scan-qr.usecase.js';
import { CreateCheckpointUseCase } from '../../core/use-cases/patrol/create-checkpoint.usecase.js';
import { UpdateCheckpointUseCase } from '../../core/use-cases/patrol/update-checkpoint.usecase.js';
import { DeleteCheckpointUseCase } from '../../core/use-cases/patrol/delete-checkpoint.usecase.js';
import { CompletePatrolUseCase } from '../../core/use-cases/patrol/complete-patrol.usecase.js';
import { AnalyzeLogUseCase } from '../../core/use-cases/patrol/analyze-log.usecase.js';
import { PatrolService } from './patrol.service.js';

const locationSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  accuracy: z.number().optional(),
});

const scanQrControllerSchema = z.object({
  sessionId: z.string().optional(),
  checkpointId: z.string().min(1),
  location: locationSchema.optional(),
  qr_hash: z.string().min(1),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  accuracyMeters: z.number().optional(),
  scannedAt: z.string().datetime().optional(),
  photoEvidenceIds: z.array(z.string().min(1)).optional(),
  note: z.string().max(1000).optional(),
  patrolSessionId: z.string().optional(),
  _signature: z.string().optional(),
  _timestamp: z.union([z.number().int(), z.string().min(1)]).optional(),
}).superRefine((data, ctx) => {
  const hasLocationObject = !!data.location;
  const hasGpsPair = typeof data.gpsLat === 'number' && typeof data.gpsLng === 'number';
  if (!hasLocationObject && !hasGpsPair) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'location hoặc gpsLat/gpsLng là bắt buộc',
      path: ['location'],
    });
  }
});

const checkItemSchema = z.object({
  id: z.string().min(1),
  checked: z.boolean(),
  note: z.string().optional(),
  photoUri: z.string().optional(),
});

const patrolAnomalySchema = z.object({
  type: z.string().min(1),
  description: z.string().optional(),
}).catchall(z.unknown());

const completePatrolControllerSchema = z.object({
  checkpointId: z.string().min(1),
  location: locationSchema.optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  checkItemsData: z.array(checkItemSchema).optional(),
  anomaly: patrolAnomalySchema.optional(),
  deviceId: z.string().optional(),
  _signature: z.string().optional(),
  _timestamp: z.union([z.number().int(), z.string().min(1)]).optional(),
  isShiftEnd: z.boolean().optional(),
});

const routeCheckpointSchema = z.object({
  checkpointId: z.string().min(1),
  guardPostId: z.string().optional(),
  sequence: z.number().int().positive().optional(),
  sequenceNo: z.number().int().positive().optional(),
  isRequired: z.boolean().optional(),
  required: z.boolean().optional(),
  minOffsetMinutes: z.number().int().nonnegative().optional(),
  minArrivalOffsetMinutes: z.number().int().nonnegative().optional(),
  maxOffsetMinutes: z.number().int().positive().optional(),
  maxArrivalOffsetMinutes: z.number().int().positive().optional(),
  geoRadiusMeters: z.number().int().positive().max(500).optional(),
  gpsRequired: z.boolean().optional(),
  photoRequired: z.boolean().optional(),
  noteRequired: z.boolean().optional(),
});

const createRouteControllerSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  routeName: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  siteId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  positionName: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  expectedDurationMinutes: z.number().int().positive().optional(),
  requiredCompletionPercent: z.number().int().min(1).max(100).optional(),
  repeatIntervalMinutes: z.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).optional(),
  complianceConfig: z.record(z.unknown()).optional(),
  checkpoints: z.array(routeCheckpointSchema).min(1),
}).refine((data) => data.name || data.routeName, {
  message: 'routeName is required',
});

const createAssignmentControllerSchema = z.object({
  routeId: z.string().min(1),
  staffId: z.string().min(1),
  shiftScheduleId: z.string().optional(),
  contractId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  assignmentDate: z.string().optional(),
  plannedStartAt: z.string().datetime().optional(),
  plannedEndAt: z.string().datetime().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const openShiftSessionControllerSchema = z.object({
  staffId: z.string().optional(),
  shiftScheduleId: z.string().optional(),
  patrolAssignmentId: z.string().optional(),
  checkInAttendanceId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const startPatrolSessionControllerSchema = z.object({
  routeId: z.string().optional(),
  shiftSessionId: z.string().optional(),
  patrolAssignmentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine((data) => data.routeId || data.patrolAssignmentId, {
  message: 'routeId or patrolAssignmentId is required',
});

const checkAttendanceControllerSchema = z.object({
  type: z.enum(['CHECK_IN', 'CHECK_OUT', 'LIVENESS']),
  location: z.union([locationSchema, z.string().min(1)]).optional(),
  imageUri: z.string().optional(),
  notes: z.string().optional(),
  shiftScheduleId: z.string().optional(),
  checkpointId: z.string().optional(),
  patrolAssignmentId: z.string().optional(),
});

const attendanceListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  shift: z.enum(['today', 'current-shift', 'week', 'month']).optional(),
  site: z.string().optional(),
  siteId: z.string().optional(),
  vendor: z.string().optional(),
  vendorId: z.string().optional(),
  contractId: z.string().optional(),
  guard: z.string().optional(),
  checkInStatus: z.enum(['all', 'all-checkin', 'late', 'missing']).optional(),
  gpsStatus: z.enum(['all', 'all-gps', 'valid', 'invalid', 'missing']).optional(),
  coverageStatus: z.enum(['all', 'all-status', 'ok', 'warning', 'breach']).optional(),
});

const attendanceOpsSummaryQuerySchema = z.object({
  shift: z.enum(['today', 'current-shift', 'week', 'month']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  site: z.string().optional(),
  siteId: z.string().optional(),
  vendor: z.string().optional(),
  vendorId: z.string().optional(),
  contractId: z.string().optional(),
});

export class PatrolController {
  static async analyzeLog(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { logId } = req.params;
      const useCase = new AnalyzeLogUseCase();
      const result = await useCase.execute(ctx, { logId: logId as string });
      return res.json(result);
    } catch (err: any) {
      return next(err);
    }
  }

  static async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      if (!req.file) {
        return res.status(400).json({ error: 'Chưa tải lên ảnh' });
      }

      const { type = 'PATROL' } = req.body;
      
      const result = await MediaService.uploadImage(req.file.buffer, {
        tenantId: ctx.tenantId,
        guardId: ctx.userId,
        type
      });

      return res.json(result);
    } catch (err: any) {
      return next(err);
    }
  }

  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { cursor, limit, view } = req.query;
      
      const query = new GetLogsQuery();
      const result = await query.execute(ctx, {
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string, 10) : 50,
        view: view as string
      });
      return res.json(result);
    } catch (err: any) {
      return next(err);
    }
  }

  static async scanQR(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const parsed = scanQrControllerSchema.parse(req.body);
      const { sessionId, checkpointId, location, qr_hash, gpsLat, gpsLng, accuracyMeters, scannedAt, photoEvidenceIds, note, ...metadata } = parsed;
      const scanLocation = location || (typeof gpsLat === 'number' && typeof gpsLng === 'number'
        ? { lat: gpsLat, lon: gpsLng, accuracy: accuracyMeters }
        : null);

      if (!scanLocation) {
        throw new z.ZodError([{
          code: z.ZodIssueCode.custom,
          message: 'location hoặc gpsLat/gpsLng là bắt buộc',
          path: ['location'],
        }]);
      }
      
      // OPTIMIZATION: If this is an offline sync, push to queue to avoid DB bottleneck & support conflict resolution
      if (metadata._timestamp) {
        const jobId = await QueueService.addJob('OFFLINE_SYNC_SCAN', {
          context: ctx,
          request: {
            checkpointId,
            staffId: ctx.userId,
            qr_hash,
            location: scanLocation,
            patrolSessionId: sessionId || metadata.patrolSessionId,
            scannedAt,
            photoEvidenceIds,
            note,
            _signature: metadata._signature,
            _timestamp: typeof metadata._timestamp === 'string' ? parseInt(metadata._timestamp, 10) : metadata._timestamp
          }
        }, `sync_scan_${ctx.userId}_${metadata._timestamp}`);
        
        return res.status(202).json({ success: true, queued: true, jobId: jobId.id });
      }

      const useCase = new ScanQRUseCase();
      const log = await useCase.execute(ctx, {
        checkpointId,
        staffId: ctx.userId,
        qr_hash,
        location: scanLocation,
        patrolSessionId: sessionId || metadata.patrolSessionId,
        scannedAt,
        photoEvidenceIds,
        note,
        _signature: metadata._signature,
        _timestamp: typeof metadata._timestamp === 'string' ? parseInt(metadata._timestamp, 10) : metadata._timestamp
      });
      return res.json(log);
    } catch (err: any) {
      return next(err);
    }
  }

  static async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const parsed = completePatrolControllerSchema.parse(req.body);
      const metadata = {
        ...parsed,
        _timestamp: parsed._timestamp !== undefined ? String(parsed._timestamp) : undefined,
      };

      // OPTIMIZATION: Queue offline sync completions
      if (metadata._timestamp) {
        const jobId = await QueueService.addJob('OFFLINE_SYNC_COMPLETE', {
          context: ctx,
          data: metadata
        }, `sync_complete_${ctx.userId}_${metadata._timestamp}`);
        
        return res.status(202).json({ success: true, queued: true, jobId: jobId.id });
      }

      const useCase = new CompletePatrolUseCase();
      const result = await useCase.execute(ctx, metadata);
      return res.json(result);
    } catch (err: any) {
      return next(err);
    }
  }

  static async getCheckpoints(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { cursor, limit } = req.query;

      // [M-03]: Checkpoints are static-ish data, add cache headers for mobile performance
      res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
      res.setHeader('Vary', 'Authorization');

      const useCase = new GetCheckpointsUseCase();
      const result = await useCase.execute(ctx, {
        cursor: cursor as string,
        limit: limit === 'all' ? 'all' : (limit ? Math.min(parseInt(limit as string, 10), 500) : 50)
      });
      return res.json(result);
    } catch (err: any) {
      return next(err);
    }
  }

  static async createCheckpoint(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new CreateCheckpointUseCase();
      const checkpoint = await useCase.execute(ctx, req.body);
      return res.status(201).json(checkpoint);
    } catch (err: any) {
      return next(err);
    }
  }

  static async updateCheckpoint(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const id = req.params.id as string;
      const useCase = new UpdateCheckpointUseCase();
      const checkpoint = await useCase.execute(ctx, { id, data: req.body });
      return res.json(checkpoint);
    } catch (err: any) {
      return next(err);
    }
  }

  static async deleteCheckpoint(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const id = req.params.id as string;
      const useCase = new DeleteCheckpointUseCase();
      await useCase.execute(ctx, id);
      return res.json({ success: true });
    } catch (err: any) {
      return next(err);
    }
  }

  static async getRoutes(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const routes = await PatrolService.getRoutes(ctx);
      return res.json(routes);
    } catch (err: any) {
      return next(err);
    }
  }

  static async createRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const route = await PatrolService.createRoute(ctx, createRouteControllerSchema.parse(req.body));
      return res.status(201).json(route);
    } catch (err: any) {
      return next(err);
    }
  }

  static async createAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const assignment = await PatrolService.createAssignment(ctx, createAssignmentControllerSchema.parse(req.body));
      return res.status(201).json(assignment);
    } catch (err: any) {
      return next(err);
    }
  }

  static async listAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const assignments = await PatrolService.listAssignments(ctx, req.query.status as string | undefined);
      return res.json(assignments);
    } catch (err: any) {
      return next(err);
    }
  }

  static async openShiftSession(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const session = await PatrolService.openShiftSession(ctx, openShiftSessionControllerSchema.parse(req.body));
      return res.status(201).json(session);
    } catch (err: any) {
      return next(err);
    }
  }

  static async startPatrolSession(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const session = await PatrolService.startPatrolSession(ctx, startPatrolSessionControllerSchema.parse(req.body));
      return res.status(201).json(session);
    } catch (err: any) {
      return next(err);
    }
  }

  static async completePatrolSession(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const session = await PatrolService.completePatrolSession(ctx, req.params.id as string);
      return res.json(session);
    } catch (err: any) {
      return next(err);
    }
  }

  static async listPatrolExceptions(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const exceptions = await PatrolService.listPatrolExceptions(ctx);
      return res.json(exceptions);
    } catch (err: any) {
      return next(err);
    }
  }

  static async checkAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const record = await PatrolService.checkAttendance(ctx, checkAttendanceControllerSchema.parse(req.body));
      return res.status(201).json(record);
    } catch (err: any) {
      return next(err);
    }
  }

  static async checkInAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const payload = checkAttendanceControllerSchema.parse({ ...req.body, type: 'CHECK_IN' });
      const record = await PatrolService.checkAttendance(ctx, payload);
      return res.status(201).json(record);
    } catch (err: any) {
      return next(err);
    }
  }

  static async checkOutAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const payload = checkAttendanceControllerSchema.parse({ ...req.body, type: 'CHECK_OUT' });
      const record = await PatrolService.checkAttendance(ctx, payload);
      return res.status(201).json(record);
    } catch (err: any) {
      return next(err);
    }
  }

  static async getAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const query = attendanceListQuerySchema.parse(req.query);
      const attendance = await PatrolService.getAttendance(ctx, query);
      return res.json(attendance);
    } catch (err: any) {
      return next(err);
    }
  }

  static async getAttendanceOpsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const query = attendanceOpsSummaryQuerySchema.parse(req.query);
      const summary = await PatrolService.getAttendanceOpsSummary(ctx, query);
      return res.json(summary);
    } catch (err: any) {
      return next(err);
    }
  }

  static async getMyAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { limit } = req.query;
      const attendance = await PatrolService.getMyAttendance(ctx, limit ? parseInt(limit as string, 10) : 20);
      return res.json(attendance);
    } catch (err: any) {
      return next(err);
    }
  }
}
