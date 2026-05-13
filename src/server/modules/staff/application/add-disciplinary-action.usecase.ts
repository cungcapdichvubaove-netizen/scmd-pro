import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { z } from 'zod';

export const addDisciplinarySchema = z.object({
  staffId: z.string(),
  type: z.string(),
  description: z.string(),
  severity: z.string().default('LOW'),
  evidenceUris: z.array(z.string()).default([]),
  actionTaken: z.string().optional(),
  occurredAt: z.any().optional() // Can be string or Date
});

export type AddDisciplinaryInput = z.infer<typeof addDisciplinarySchema>;

export class AddDisciplinaryActionUseCase {
  async execute(ctx: SecurityContext, input: AddDisciplinaryInput) {
    const validated = addDisciplinarySchema.parse(input);

    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const staff = await tx.staff.findUnique({
        where: { id: validated.staffId }
      });

      if (!staff) throw new Error('STAFF_NOT_FOUND');

      const action = await tx.disciplinaryAction.create({
        data: {
          tenantId: ctx.tenantId,
          staffId: validated.staffId,
          type: validated.type,
          description: validated.description,
          severity: validated.severity,
          evidenceUris: validated.evidenceUris,
          actionTaken: validated.actionTaken,
          occurredAt: validated.occurredAt ? new Date(validated.occurredAt) : new Date()
        }
      });

      // Audit Logging
      await tx.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId || 'system',
          action: 'CREATE_DISCIPLINARY',
          resource: `staff:${validated.staffId}`,
          payload: validated as any,
          status: 'SUCCESS',
          timestamp: BigInt(Date.now())
        }
      });

      return action;
    });
  }
}
