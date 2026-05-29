import { Request, Response, NextFunction } from 'express';
import { logger } from '../../core/logger/index.js';
import { RequestContextResolver } from '../../core/context/index.js';
import { ListVendorsUseCase } from './application/list-vendors.usecase.js';
import { CreateVendorUseCase } from './application/create-vendor.usecase.js';
import { UpdateVendorUseCase } from './application/update-vendor.usecase.js';
import { ListContractsUseCase } from './application/list-contracts.usecase.js';
import { CreateContractUseCase } from './application/create-contract.usecase.js';
import { UpdateContractUseCase } from './application/update-contract.usecase.js';
import { ListComplianceScoresUseCase } from './application/list-compliance.usecase.js';
import { GetVendorEvaluationUseCase } from './application/get-vendor-evaluation.usecase.js';
import { CreateSiteUseCase } from './application/create-site.usecase.js';
import { UpdateSiteUseCase } from './application/update-site.usecase.js';
import { ListSitesUseCase } from './application/list-sites.usecase.js';
import { CreateGuardPostUseCase } from './application/create-guard-post.usecase.js';
import { UpdateGuardPostUseCase } from './application/update-guard-post.usecase.js';
import { ListGuardPostsUseCase } from './application/list-guard-posts.usecase.js';
import { ListShiftSchedulesUseCase } from './application/list-shift-schedules.usecase.js';
import { GenerateShiftSchedulesUseCase } from './application/generate-shift-schedules.usecase.js';
import { AssignShiftUseCase } from './application/assign-shift.usecase.js';
import { RemoveShiftAssignmentUseCase } from './application/remove-shift-assignment.usecase.js';
import { ListContractVersionsUseCase } from './application/list-contract-versions.usecase.js';
import { CreateContractVersionUseCase } from './application/create-contract-version.usecase.js';
import { ActivateContractVersionUseCase } from './application/activate-contract-version.usecase.js';
import { ArchiveContractVersionUseCase } from './application/archive-contract-version.usecase.js';
import { vendorSchema, contractSchema, contractUpdateSchema, siteSchema, guardPostSchema, guardPostUpdateSchema, shiftScheduleListSchema, generateShiftSchedulesSchema, assignShiftSchema, contractVersionCreateSchema, contractVersionParamsSchema } from './vendor.schema.js';

export class VendorController {
  static async getVendorEvaluation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new GetVendorEvaluationUseCase();
      const evaluation = await useCase.execute(ctx, id as string);
      return res.json(evaluation);
    } catch (err: any) {
      logger.error({ err }, 'Get vendor evaluation error');
      return next(err);
    }
  }

  static async listVendors(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { cursor, limit, view } = req.query;
      const useCase = new ListVendorsUseCase();
      const vendors = await useCase.execute(ctx, { 
        view: view as string,
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string, 10) : 20
      });
      return res.json(vendors);
    } catch (err: any) {
      logger.error({ err }, 'List vendors error');
      return next(err);
    }
  }

  static async createVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const data = vendorSchema.parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new CreateVendorUseCase();
      const vendor = await useCase.execute(ctx, data);
      return res.status(201).json(vendor);
    } catch (err: any) {
      logger.error({ err }, 'Create vendor error');
      return next(err);
    }
  }

  static async updateVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const data = vendorSchema.partial().parse(req.body);
      const id = req.params.id as string;
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new UpdateVendorUseCase();
      const vendor = await useCase.execute(ctx, { id, ...data });
      return res.json(vendor);
    } catch (err: any) {
      logger.error({ err }, 'Update vendor error');
      return next(err);
    }
  }

  static async listContracts(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { cursor, limit, view } = req.query;
      const useCase = new ListContractsUseCase();
      const contracts = await useCase.execute(ctx, { 
        view: view as string,
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string, 10) : 20
      });
      return res.json(contracts);
    } catch (err: any) {
      logger.error({ err }, 'List contracts error');
      return next(err);
    }
  }

  static async createContract(req: Request, res: Response, next: NextFunction) {
    try {
      const data = contractSchema.parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new CreateContractUseCase();
      const contract = await useCase.execute(ctx, data);
      return res.status(201).json(contract);
    } catch (err: any) {
      logger.error({ err }, 'Create contract error');
      return next(err);
    }
  }

  static async updateContract(req: Request, res: Response, next: NextFunction) {
    try {
      const data = contractUpdateSchema.parse(req.body);
      const id = req.params.id as string;
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new UpdateContractUseCase();
      const contract = await useCase.execute(ctx, { id, ...data });
      return res.json(contract);
    } catch (err: any) {
      logger.error({ err }, 'Update contract error');
      return next(err);
    }
  }

  static async requestContractAiScan(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      return res.status(409).json({
        error: 'AI Contract Scan chưa khả dụng cho đến khi Contract Rule Engine hoàn tất.',
        contractId: req.params.id as string,
        tenantId: ctx.tenantId,
        feature: 'ai_contract_scan',
        status: 'NOT_AVAILABLE',
      });
    } catch (err: any) {
      logger.error({ err }, 'Request contract AI scan error');
      return next(err);
    }
  }

  static async listContractVersions(req: Request, res: Response, next: NextFunction) {
    try {
      const params = contractVersionParamsSchema.pick({ contractId: true }).parse(req.params);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ListContractVersionsUseCase();
      const versions = await useCase.execute(ctx, { contractId: params.contractId });
      return res.json(versions);
    } catch (err: any) {
      logger.error({ err }, 'List contract versions error');
      return next(err);
    }
  }

  static async createContractVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const params = contractVersionParamsSchema.pick({ contractId: true }).parse(req.params);
      const data = contractVersionCreateSchema.parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new CreateContractVersionUseCase();
      const version = await useCase.execute(ctx, { contractId: params.contractId, data });
      return res.status(201).json(version);
    } catch (err: any) {
      logger.error({ err }, 'Create contract version error');
      return next(err);
    }
  }

  static async activateContractVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const params = contractVersionParamsSchema.required({ versionId: true }).parse(req.params);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ActivateContractVersionUseCase();
      const result = await useCase.execute(ctx, params);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Activate contract version error');
      return next(err);
    }
  }

  static async archiveContractVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const params = contractVersionParamsSchema.required({ versionId: true }).parse(req.params);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ArchiveContractVersionUseCase();
      const result = await useCase.execute(ctx, params);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Archive contract version error');
      return next(err);
    }
  }

  static async listSites(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ListSitesUseCase();
      const sites = await useCase.execute(ctx, {
        cursor: req.query.cursor as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        status: req.query.status as string,
        vendorId: req.query.vendorId as string,
      });
      return res.json(sites);
    } catch (err: any) {
      logger.error({ err }, 'List sites error');
      return next(err);
    }
  }

  static async createSite(req: Request, res: Response, next: NextFunction) {
    try {
      const data = siteSchema.parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new CreateSiteUseCase();
      const site = await useCase.execute(ctx, data);
      return res.status(201).json(site);
    } catch (err: any) {
      logger.error({ err }, 'Create site error');
      return next(err);
    }
  }

  static async updateSite(req: Request, res: Response, next: NextFunction) {
    try {
      const data = siteSchema.partial().parse(req.body);
      const id = req.params.id as string;
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new UpdateSiteUseCase();
      const site = await useCase.execute(ctx, { id, ...data });
      return res.json(site);
    } catch (err: any) {
      logger.error({ err }, 'Update site error');
      return next(err);
    }
  }

  static async listGuardPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ListGuardPostsUseCase();
      const guardPosts = await useCase.execute(ctx, { siteId: req.query.siteId as string });
      return res.json(guardPosts);
    } catch (err: any) {
      logger.error({ err }, 'List guard posts error');
      return next(err);
    }
  }

  static async createGuardPost(req: Request, res: Response, next: NextFunction) {
    try {
      const data = guardPostSchema.parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new CreateGuardPostUseCase();
      const guardPost = await useCase.execute(ctx, data);
      return res.status(201).json(guardPost);
    } catch (err: any) {
      logger.error({ err }, 'Create guard post error');
      return next(err);
    }
  }

  static async updateGuardPost(req: Request, res: Response, next: NextFunction) {
    try {
      const data = guardPostUpdateSchema.parse(req.body);
      const id = req.params.id as string;
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new UpdateGuardPostUseCase();
      const guardPost = await useCase.execute(ctx, { id, ...data });
      return res.json(guardPost);
    } catch (err: any) {
      logger.error({ err }, 'Update guard post error');
      return next(err);
    }
  }

  static async listComplianceScores(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ListComplianceScoresUseCase();
      const scores = await useCase.execute(ctx, { view: req.query.view as string });
      return res.json(scores);
    } catch (err: any) {
      logger.error({ err }, 'List compliance scores error');
      return next(err);
    }
  }

  static async listShiftSchedules(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const input = shiftScheduleListSchema.parse({
        contractId: req.query.contractId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      });
      const useCase = new ListShiftSchedulesUseCase();
      const schedules = await useCase.execute(ctx, input);
      return res.json(schedules);
    } catch (err: any) {
      logger.error({ err }, 'List shift schedules error');
      return next(err);
    }
  }

  static async generateShiftSchedules(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const input = generateShiftSchedulesSchema.parse(req.body);
      const useCase = new GenerateShiftSchedulesUseCase();
      const result = await useCase.execute(ctx, input);
      return res.status(201).json(result);
    } catch (err: any) {
      logger.error({ err }, 'Generate shift schedules error');
      return next(err);
    }
  }

  static async assignShift(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const input = assignShiftSchema.parse(req.body);
      const useCase = new AssignShiftUseCase();
      const result = await useCase.execute(ctx, input);
      return res.status(201).json(result);
    } catch (err: any) {
      logger.error({ err }, 'Assign shift error');
      return next(err);
    }
  }

  static async removeShiftAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new RemoveShiftAssignmentUseCase();
      const result = await useCase.execute(ctx, { assignmentId: req.params.id as string });
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Remove shift assignment error');
      return next(err);
    }
  }
}
