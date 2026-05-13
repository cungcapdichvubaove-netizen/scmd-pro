import { z } from 'zod';

export const taskStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  status: taskStatusSchema.default('PENDING'),
  priority: taskPrioritySchema.default('MEDIUM'),
  dueDate: z.string().datetime({ offset: true }).nullish().transform(v => v ?? undefined),
  assigneeId: z.string().uuid().nullish().transform(v => v ?? undefined),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullish().transform(v => v ?? undefined),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().datetime({ offset: true }).nullish().transform(v => v ?? undefined),
  assigneeId: z.string().uuid().nullish().transform(v => v ?? undefined),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
