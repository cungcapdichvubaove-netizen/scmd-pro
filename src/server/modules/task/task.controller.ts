import { Request, Response, NextFunction } from 'express';
import { logger } from '../../core/logger/index.js';
import { RequestContextResolver } from '../../core/context/index.js';
import { ListTasksUseCase } from '../../core/use-cases/task/list-tasks.usecase.js';
import { CreateTaskUseCase } from '../../core/use-cases/task/create-task.usecase.js';
import { UpdateTaskUseCase } from '../../core/use-cases/task/update-task.usecase.js';
import { DeleteTaskUseCase } from '../../core/use-cases/task/delete-task.usecase.js';
import { createTaskSchema, updateTaskSchema } from './task.schema.js';

export class TaskController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ListTasksUseCase();
      const { status, assigneeId, view } = req.query;
      const tasks = await useCase.execute(ctx, { 
        status: status as string | undefined, 
        assigneeId: assigneeId as string | undefined,
        view: view as string | undefined
      });
      return res.json(tasks);
    } catch (error: any) {
      logger.error({ error }, 'List tasks error');
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const parsed = createTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
      }
      const useCase = new CreateTaskUseCase();
      const task = await useCase.execute(ctx, parsed.data);
      return res.status(201).json(task);
    } catch (error: any) {
      logger.error({ error }, 'Create task error');
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const id = req.params.id as string;
      const parsed = updateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
      }
      const useCase = new UpdateTaskUseCase();
      const task = await useCase.execute(ctx, { id, data: parsed.data });
      return res.json(task);
    } catch (error: any) {
      logger.error({ error }, 'Update task error');
      return next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const id = req.params.id as string;
      const useCase = new DeleteTaskUseCase();
      await useCase.execute(ctx, id);
      return res.json({ success: true });
    } catch (error: any) {
      logger.error({ error }, 'Delete task error');
      return next(error);
    }
  }
}
