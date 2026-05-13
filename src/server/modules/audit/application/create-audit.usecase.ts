import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { z } from 'zod';

export const createAuditSchema = z.object({
  siteId: z.string(),
  checklist: z.array(z.object({
    item: z.string(),
    status: z.enum(['PASS', 'FAIL']),
    note: z.string().optional()
  })),
  overallScore: z.number(),
  evidenceUris: z.array(z.string()).default([]),
  auditorSignature: z.string().optional(),
  contractorRepresentative: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional()
});

export type CreateAuditInput = z.infer<typeof createAuditSchema>;

export class CreateAuditUseCase {
  async execute(ctx: SecurityContext, input: CreateAuditInput) {
    const validated = createAuditSchema.parse(input);

    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const audit = await tx.audit.create({
        data: {
          tenantId: ctx.tenantId,
          auditorId: ctx.userId,
          siteId: validated.siteId,
          checklist: validated.checklist,
          overallScore: validated.overallScore,
          evidenceUris: validated.evidenceUris,
          auditorSignature: validated.auditorSignature,
          contractorRepresentative: validated.contractorRepresentative,
          locationLat: validated.locationLat,
          locationLng: validated.locationLng
        }
      });
      return audit;
    });
  }
}
