import { Request, Response, NextFunction } from 'express';
import { logger } from '../../core/logger/index.js';
import { RequestContextResolver } from '../../core/context/index.js';
import { ListVendorsUseCase } from './application/list-vendors.usecase.js';
import { CreateVendorUseCase } from './application/create-vendor.usecase.js';
import { UpdateVendorUseCase } from './application/update-vendor.usecase.js';
import { ListContractsUseCase } from './application/list-contracts.usecase.js';
import { CreateContractUseCase } from './application/create-contract.usecase.js';
import { ListComplianceScoresUseCase } from './application/list-compliance.usecase.js';
import { GetVendorEvaluationUseCase } from './application/get-vendor-evaluation.usecase.js';
import { vendorSchema, contractSchema } from './vendor.schema.js';

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
}
