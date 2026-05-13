import { NextFunction, Request, Response } from 'express';
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
        return res.status(400).json({ error: 'No photo uploaded' });
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
      const { checkpointId, location, qr_hash, ...metadata } = req.body;
      
      // OPTIMIZATION: If this is an offline sync, push to queue to avoid DB bottleneck & support conflict resolution
      if (metadata._timestamp) {
        const jobId = await QueueService.addJob('OFFLINE_SYNC_SCAN', {
          context: ctx,
          request: {
            checkpointId,
            staffId: ctx.userId,
            qr_hash,
            location,
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
        location,
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
      const metadata = req.body;

      // OPTIMIZATION: Queue offline sync completions
      if (metadata._timestamp) {
        const jobId = await QueueService.addJob('OFFLINE_SYNC_COMPLETE', {
          context: ctx,
          data: req.body
        }, `sync_complete_${ctx.userId}_${metadata._timestamp}`);
        
        return res.status(202).json({ success: true, queued: true, jobId: jobId.id });
      }

      const useCase = new CompletePatrolUseCase();
      const result = await useCase.execute(ctx, req.body);
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

  static async checkAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const record = await PatrolService.checkAttendance(ctx, req.body);
      return res.status(201).json(record);
    } catch (err: any) {
      return next(err);
    }
  }

  static async getAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { cursor, limit, startDate, endDate } = req.query;
      const attendance = await PatrolService.getAttendance(
        ctx,
        cursor as string,
        limit ? parseInt(limit as string, 10) : 50,
        startDate as string,
        endDate as string
      );
      return res.json(attendance);
    } catch (err: any) {
      return next(err);
    }
  }
}
