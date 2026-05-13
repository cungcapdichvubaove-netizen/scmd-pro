import { Request, Response, NextFunction } from 'express';
import { RequestContextResolver } from '../../core/context/index.js';
import { logger } from '../../core/logger/index.js';
import { ListIncidentsUseCase } from './application/list-incidents.usecase.js';
import { GetIncidentUseCase } from './application/get-incident.usecase.js';
import { CreateIncidentUseCase } from './application/create-incident.usecase.js';
import { AssignIncidentUseCase } from './application/assign-incident.usecase.js';
import { UpdateIncidentStatusUseCase } from './application/update-incident-status.usecase.js';
import { ExportIncidentPdfUseCase } from './application/export-incident-pdf.usecase.js';
import { AnalyzeIncidentImageUseCase } from './application/analyze-incident-image.usecase.js';
import { SubmitAnomalyFeedbackUseCase } from './application/submit-anomaly-feedback.usecase.js';
import { createIncidentSchema } from './incident.schema.js';
import { z } from 'zod';

export class IncidentController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { status, type, limit, cursor, view } = req.query;
      const normalizedStatus = status ? (status as string).toUpperCase() : '';

      // [M-03]: Add HTTP Caching for resolved incidents (stable data)
      if (normalizedStatus === 'RESOLVED' || normalizedStatus === 'CLOSED') {
        res.setHeader('Cache-Control', 'public, max-age=60'); // Cache for 1 minute
      }

      const useCase = new ListIncidentsUseCase();
      
      const result = await useCase.execute(ctx, {
        status: status as string,
        type: type as string,
        limit: limit ? Math.min(parseInt(limit as string, 10), 200) : 50,
        cursor: cursor as string,
        view: view as string,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      });
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Failed to list incidents');
      return next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const ctx = RequestContextResolver.resolve(req);
      
      const useCase = new GetIncidentUseCase();
      
      const incident = await useCase.execute(ctx, id);
      return res.json(incident);
    } catch (err: any) {
      logger.error({ err }, 'Failed to get incident');
      return next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createIncidentSchema.parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      
      const useCase = new CreateIncidentUseCase();
      const incident = await useCase.execute(ctx, {
        ...data,
        imageUri: data.imageUri || undefined,
        location: data.location || undefined
      });

      return res.json(incident);
    } catch (err: any) {
      logger.error({ err }, 'Failed to create incident');
      return next(err);
    }
  }

  static async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { staffId } = req.body;
      const ctx = RequestContextResolver.resolve(req);

      const useCase = new AssignIncidentUseCase();

      const incident = await useCase.execute(ctx, { incidentId: id, staffId });
      return res.json(incident);
    } catch (err: any) {
      logger.error({ err }, 'Failed to assign incident');
      return next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate schema in-line for status update
      const validateSchema = z.object({
        status: z.string(),
        resolutionNotes: z.string().optional().nullable(),
        resolutionImages: z.array(z.string()).optional()
      });
      const data = validateSchema.parse(req.body);

      const id = req.params.id as string;
      const ctx = RequestContextResolver.resolve(req);

      const useCase = new UpdateIncidentStatusUseCase();

      const incident = await useCase.execute(ctx, {
        id,
        status: data.status,
        resolutionNotes: data.resolutionNotes || undefined,
        resolutionImages: data.resolutionImages
      });
      return res.json(incident);
    } catch (err: any) {
      logger.error({ err }, 'Failed to update incident status');
      return next(err);
    }
  }

  static async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ExportIncidentPdfUseCase();
      const result = await useCase.execute(ctx, id);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Failed to export incident PDF');
      return next(err);
    }
  }

  static async analyzeImage(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new AnalyzeIncidentImageUseCase();
      const result = await useCase.execute(ctx, req.body);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'AI Analysis failed for incident image');
      return next(err);
    }
  }

  static async submitAnomalyFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const alertId = req.params.alertId as string;
      const verdict = req.body.verdict as string;
      const notes = req.body.notes as string | undefined;
      const ctx = RequestContextResolver.resolve(req);

      const useCase = new SubmitAnomalyFeedbackUseCase();

      const feedback = await useCase.execute(ctx, { alertId, verdict, notes });
      res.status(200).json({ success: true, feedback });
    } catch (e: any) {
      return next(e);
    }
  }
}

