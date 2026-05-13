import { z } from 'zod';
import { IncidentStatus, IncidentSeverity } from '@prisma/client';

export const incidentStatusSchema = z.nativeEnum(IncidentStatus);
export const incidentSeveritySchema = z.nativeEnum(IncidentSeverity);

export const incidentSchema = z.object({
  type: z.string().min(2, "Loại sự cố quá ngắn").max(50, "Loại sự cố quá dài"),
  severity: incidentSeveritySchema,
  severityWeight: z.number().int().min(1).max(10).optional().default(1),
  description: z.string().min(10, "Mô tả sự cố tối thiểu 10 ký tự").max(2000, "Mô tả sự cố quá dài"),
  imageUri: z.string().url("Đường dẫn hình ảnh không hợp lệ").optional().nullable(),
  location: z.record(z.unknown()).optional().nullable(),
  status: incidentStatusSchema.default(IncidentStatus.REPORTED),
  assignedToId: z.string().uuid("ID người được giao không hợp lệ").optional().nullable(),
  resolutionNotes: z.string().max(2000, "Ghi chú xử lý quá dài").optional().nullable(),
  resolutionImages: z.array(z.string().url()).optional().default([]),
});

export const createIncidentSchema = incidentSchema.pick({
  type: true,
  severity: true,
  description: true,
  imageUri: true,
  location: true,
});

export const updateIncidentSchema = incidentSchema.partial().omit({
  // Immutable fields during standard update
});

export type Incident = z.infer<typeof incidentSchema>;
export type CreateIncidentData = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentData = z.infer<typeof updateIncidentSchema>;
