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

const AttachmentUrlSchema = z.string().refine((url) => {
  if (url.startsWith('https://') || url.startsWith('http://localhost')) {
    return true;
  }

  return /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/.test(url);
}, { message: 'Chỉ chấp nhận liên kết HTTPS hoặc fallback ảnh nội bộ hợp lệ cho tệp đính kèm' });

const TagsSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
}, z.array(z.string().max(50)).default([]));

const MetadataSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}, z.record(z.any()).optional());

export const CreateAttachmentSchema = z.object({
  name: z.string().min(1).max(255),
  url: AttachmentUrlSchema,
  fileType: z.string(),
  size: z.number().int().nonnegative(),
  category: CategoryEnum.default('UNSPECIFIED'),
  tags: TagsSchema,
  metadata: MetadataSchema,
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
