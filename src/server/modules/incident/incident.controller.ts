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
import { AcknowledgeIncidentUseCase } from './application/acknowledge-incident.usecase.js';
import { AddIncidentEvidenceUseCase } from './application/add-incident-evidence.usecase.js';
import { UpdateIncidentEvidenceStatusUseCase } from './application/update-incident-evidence-status.usecase.js';
import { RejectIncidentResolutionUseCase } from './application/reject-incident-resolution.usecase.js';
import { ApproveIncidentResolutionUseCase } from './application/approve-incident-resolution.usecase.js';
import { CloseIncidentUseCase } from './application/close-incident.usecase.js';
import {
  addIncidentEvidenceSchema,
  assignIncidentSchema,
  createIncidentSchema,
  rejectResolutionSchema,
  updateEvidenceStatusSchema,
  updateIncidentStatusRequestSchema
} from './incident.schema.js';
import { z } from 'zod';

export class IncidentController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { status, type, limit, cursor, view, priorityOnly, severity, dateFrom, dateTo, search, assigneeId, siteId, vendorId, contractId } = req.query;
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
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
        priorityOnly: priorityOnly === 'true',
        severity: severity as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        search: search as string,
        assigneeId: assigneeId as string,
        siteId: siteId as string,
        vendorId: vendorId as string,
        contractId: contractId as string,
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
      const data = createIncidentSchema.parse({
        ...req.body,
        severity: typeof req.body?.severity === 'string' ? req.body.severity.toUpperCase() : req.body?.severity
      });
      const ctx = RequestContextResolver.resolve(req);
      
      const useCase = new CreateIncidentUseCase();
      const incident = await useCase.execute(ctx, {
        ...data,
        imageUri: data.imageUri || undefined,
        location: data.location || undefined,
        vendorId: data.vendorId || undefined,
        contractId: data.contractId || undefined,
        siteId: data.siteId || undefined
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
      const { staffId } = assignIncidentSchema.parse(req.body);
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
      const data = updateIncidentStatusRequestSchema.parse(req.body);

      const id = req.params.id as string;
      const ctx = RequestContextResolver.resolve(req);

      const useCase = new UpdateIncidentStatusUseCase();

      const incident = await useCase.execute(ctx, {
        id,
        status: data.status,
        resolutionNotes: data.resolutionNotes || undefined,
        resolutionImages: data.resolutionImages,
        reopenReason: data.reopenReason || undefined,
        requiredNextAction: data.requiredNextAction || undefined
      });
      return res.json(incident);
    } catch (err: any) {
      logger.error({ err }, 'Failed to update incident status');
      return next(err);
    }
  }

  static async acknowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = z.object({ notes: z.string().max(2000).optional().nullable() }).parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new AcknowledgeIncidentUseCase();
      const incident = await useCase.execute(ctx, { incidentId: id, notes: data.notes });
      return res.json(incident);
    } catch (err: any) {
      logger.error({ err }, 'Failed to acknowledge incident');
      return next(err);
    }
  }

  static async addEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = addIncidentEvidenceSchema.parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new AddIncidentEvidenceUseCase();
      const evidence = await useCase.execute(ctx, {
        incidentId: id,
        kind: data.kind,
        uri: data.uri || undefined,
        sourceType: data.sourceType,
        sourceId: data.sourceId || undefined,
        fileType: data.fileType || undefined,
        fileUrl: data.fileUrl || undefined,
        thumbnailUrl: data.thumbnailUrl || undefined,
        capturedAt: data.capturedAt || undefined,
        gpsLat: data.gpsLat ?? undefined,
        gpsLng: data.gpsLng ?? undefined,
        checksum: data.checksum || undefined,
        note: data.note || undefined,
        metadata: data.metadata || undefined
      });

      return res.status(201).json(evidence);
    } catch (err: any) {
      logger.error({ err }, 'Failed to add incident evidence');
      return next(err);
    }
  }

  static async updateEvidenceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const evidenceId = req.params.evidenceId as string;
      const data = updateEvidenceStatusSchema.parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new UpdateIncidentEvidenceStatusUseCase();
      const evidence = await useCase.execute(ctx, { incidentId: id, evidenceId, status: data.status, note: data.note });
      return res.json(evidence);
    } catch (err: any) {
      logger.error({ err }, 'Failed to update incident evidence status');
      return next(err);
    }
  }

  static async rejectResolution(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = rejectResolutionSchema.parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new RejectIncidentResolutionUseCase();
      const incident = await useCase.execute(ctx, { incidentId: id, reopenReason: data.reopenReason, requiredNextAction: data.requiredNextAction });
      return res.json(incident);
    } catch (err: any) {
      logger.error({ err }, 'Failed to reject incident resolution');
      return next(err);
    }
  }

  static async approveResolution(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = z.object({ notes: z.string().max(2000).optional().nullable() }).parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ApproveIncidentResolutionUseCase();
      const incident = await useCase.execute(ctx, { incidentId: id, notes: data.notes });
      return res.json(incident);
    } catch (err: any) {
      logger.error({ err }, 'Failed to approve incident resolution');
      return next(err);
    }
  }

  static async close(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = z.object({ notes: z.string().max(2000).optional().nullable() }).parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new CloseIncidentUseCase();
      const incident = await useCase.execute(ctx, { incidentId: id, notes: data.notes });
      return res.json(incident);
    } catch (err: any) {
      logger.error({ err }, 'Failed to close incident');
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
