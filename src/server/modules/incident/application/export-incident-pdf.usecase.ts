import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { QueueService } from '../../../core/queue/index.js';
import { AuditService } from '../../../core/audit/audit.service.js';

export class ExportIncidentPdfUseCase {
  async execute(ctx: SecurityContext, incidentId: string) {
    const incident = await db.forTenant(ctx.tenantId).incident.findUnique({
      where: { id: incidentId },
      include: {
        reporter: { select: { fullName: true } },
        assignee: { select: { fullName: true } }
      }
    });

    if (!incident) throw new Error('INCIDENT_NOT_FOUND');

    const jwt = await import('jsonwebtoken');
    const { JWT_SECRET } = await import('../../../core/auth/secrets.js');
    
    // Generate a short-lived (5 min) signed token specifically for this document
    const printToken = jwt.default.sign(
      { 
        incidentId, 
        tenantId: ctx.tenantId,
        purpose: 'print',
        permissions: ['staff:read', 'log:read']
      }, 
      JWT_SECRET, 
      { expiresIn: '5m' }
    );

    const job = await QueueService.addJob('GENERATE_PDF', {
      type: 'GENERATE_PDF',
      url: `${process.env.APP_URL || 'http://localhost:3000'}/print/incident/${incidentId}?printToken=${printToken}`,
      options: {
        format: 'A4',
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      }
    });

    await AuditService.log({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      action: 'EXPORT_INCIDENT_PDF',
      resource: `incident/${incidentId}`,
      payload: { jobId: job.id },
      status: 'SUCCESS'
    });

    return { jobId: job.id, status: 'GENERATING' };
  }
}
