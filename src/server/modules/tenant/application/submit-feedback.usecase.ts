import { db } from '../../../core/db/prisma.js';
// logger removed because it was unused

export class SubmitFeedbackUseCase {
  async execute(dto: { tenantId: string; userId: string; title: string; description: string; severity?: string; type?: string }) {
    // Domain rules or validation could go here
    
    // PostgreSQL is the single source of truth
    const feedback = await db.forTenant(dto.tenantId).feedback.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        description: dto.description,
        severity: dto.severity || 'LOW',
        type: dto.type || 'BUG',
        status: 'OPEN'
      }
    });

    return feedback;
  }
}
