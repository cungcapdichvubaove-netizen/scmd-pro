import { z } from 'zod';

export const CategoryEnum = z.enum([
  'SLA',
  'COMPLIANCE',
  'INCIDENT',
  'EVIDENCE',
  'REPORT',
  'SHIFT_LOG',
  'UNSPECIFIED'
]);

export const CreateAttachmentSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().refine(
    url => url.startsWith('https://') || url.startsWith('http://localhost'),
    { message: 'Only HTTPS URLs are allowed for attachments' }
  ),
  fileType: z.string(),
  size: z.number().int().nonnegative(),
  category: CategoryEnum.default('UNSPECIFIED'),
  tags: z.array(z.string().max(50)).default([]),
  metadata: z.record(z.any()).optional(),
});

export const UpdateAttachmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: CategoryEnum.optional(),
  tags: z.array(z.string().max(50)).optional(),
  metadata: z.record(z.any()).optional(),
});

export const AttachmentFilterSchema = z.object({
  category: CategoryEnum.optional(),
  tags: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'size']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type CreateAttachmentInput = z.infer<typeof CreateAttachmentSchema>;
export type UpdateAttachmentInput = z.infer<typeof UpdateAttachmentSchema>;
export type AttachmentFilterInput = z.infer<typeof AttachmentFilterSchema>;
