import { SecurityContext } from '../../../core/architecture/types.js';
import { QueueService } from '../../../core/queue/index.js';
import { AuditService } from '../../../core/audit/audit.service.js';

export class ExportWatcherPdfUseCase {
  async execute(ctx: SecurityContext) {
    const jwt = await import('jsonwebtoken');
    const { JWT_SECRET } = await import('../../../core/auth/secrets.js');
    
    // Generate a short-lived (5 min) signed token specifically for this document
    const printToken = jwt.default.sign(
      { 
        type: 'watcher', 
        tenantId: ctx.tenantId,
        purpose: 'print',
        permissions: ['staff:read', 'log:read', 'checkpoint:read']
      }, 
      JWT_SECRET, 
      { expiresIn: '5m' }
    );

    const job = await QueueService.addJob('GENERATE_PDF', {
      type: 'GENERATE_PDF',
      url: `${process.env.APP_URL || 'http://localhost:3000'}/print/watcher?printToken=${printToken}`,
      options: {
        format: 'A4',
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      }
    });

    await AuditService.log({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      action: 'EXPORT_WATCHER_PDF',
      resource: `tenant/${ctx.tenantId}`,
      payload: { jobId: job.id },
      status: 'SUCCESS'
    });

    return { jobId: job.id, status: 'GENERATING' };
  }
}
