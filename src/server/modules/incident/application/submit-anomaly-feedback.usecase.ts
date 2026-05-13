import { SecurityContext } from '../../../core/architecture/types.js';
import { db as pgDb } from '../../../core/db/prisma.js';

export interface SubmitAnomalyFeedbackInput {
  alertId: string;
  verdict: string;
  notes?: string;
}

export class SubmitAnomalyFeedbackUseCase {
  async execute(ctx: SecurityContext, input: SubmitAnomalyFeedbackInput) {
    const { alertId, verdict, notes } = input;

    const feedback = await pgDb.forTenant(ctx.tenantId).feedback.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        title: `Anomaly Feedback: ${alertId}`,
        description: `${verdict} - ${notes || ''}`,
        type: 'AI_FEEDBACK',
        status: 'CLOSED',
        severity: verdict === 'TRUE_POSITIVE' ? 'HIGH' : 'LOW'
      }
    });

    return feedback;
  }
}
