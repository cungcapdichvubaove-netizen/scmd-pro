import { z } from 'zod';
import { IncidentEvidenceKind, IncidentSeverity, IncidentStatus } from '@prisma/client';

export const incidentStatusSchema = z.nativeEnum(IncidentStatus);
export const incidentSeveritySchema = z.nativeEnum(IncidentSeverity);

export const incidentSchema = z.object({
  type: z.string().min(2).max(80),
  severity: incidentSeveritySchema.default(IncidentSeverity.LOW),
  severityWeight: z.number().int().min(1).max(10).optional().default(1),
  description: z.string().min(10).max(2000),
  imageUri: z.string().url().optional().nullable(),
  location: z.record(z.unknown()).optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
  status: incidentStatusSchema.default(IncidentStatus.REPORTED),
  assignedToId: z.string().uuid().optional().nullable(),
  resolutionNotes: z.string().max(2000).optional().nullable(),
  resolutionImages: z.array(z.string().url()).optional().default([]),
});

export const createIncidentSchema = incidentSchema.pick({
  type: true,
  severity: true,
  description: true,
  imageUri: true,
  location: true,
  vendorId: true,
  contractId: true,
  siteId: true,
});

export const assignIncidentSchema = z.object({
  staffId: z.string().uuid(),
});

export const addIncidentEvidenceSchema = z.object({
  kind: z.nativeEnum(IncidentEvidenceKind).default(IncidentEvidenceKind.NOTE),
  uri: z.string().url().optional().nullable(),
  sourceType: z.enum(['INCIDENT', 'PATROL', 'ATTENDANCE', 'MANUAL_UPLOAD']).default('INCIDENT'),
  sourceId: z.string().optional().nullable(),
  fileType: z.string().max(80).optional().nullable(),
  fileUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  capturedAt: z.coerce.date().optional().nullable(),
  gpsLat: z.number().min(-90).max(90).optional().nullable(),
  gpsLng: z.number().min(-180).max(180).optional().nullable(),
  checksum: z.string().max(256).optional().nullable(),
  note: z.string().min(1).max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
}).refine((data) => Boolean(data.uri || data.fileUrl || data.note), {
  message: 'Bằng chứng phải có liên kết tệp, URL nguồn hoặc ghi chú mô tả',
});

export const updateIncidentStatusRequestSchema = z.object({
  status: z.string(),
  resolutionNotes: z.string().min(1).max(2000).optional().nullable(),
  resolutionImages: z.array(z.string().url()).optional(),
  approvalNotes: z.string().max(2000).optional().nullable(),
  reopenReason: z.string().min(5).max(1000).optional().nullable(),
  requiredNextAction: z.string().min(5).max(1000).optional().nullable(),
});

export const updateIncidentSchema = incidentSchema.partial();

export const rejectResolutionSchema = z.object({
  reopenReason: z.string().min(5).max(1000),
  requiredNextAction: z.string().min(5).max(1000),
});

export const updateEvidenceStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'REJECTED', 'ARCHIVED']),
  note: z.string().max(1000).optional().nullable(),
});

export type Incident = z.infer<typeof incidentSchema>;
export type CreateIncidentData = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentData = z.infer<typeof updateIncidentSchema>;
