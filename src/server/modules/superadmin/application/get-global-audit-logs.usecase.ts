import { globalAuditLogQuerySchema } from '../superadmin.schema.js';
import { db } from '../../../core/db/prisma.js';
import { deepMaskSensitiveData } from '../../../core/audit/audit.mask.js';
import { AuditService } from '../../../core/audit/audit.service.js';

export class GetGlobalAuditLogsUseCase {
  async execute(rawInput: any, ctx: any) {
    const query = globalAuditLogQuerySchema.parse(rawInput);
    
    let { from, to, limit, cursor, action } = query;
    const now = new Date();

    // 1. Strict Time Boundary Guard
    if (!to) {
      to = now;
    }
    if (!from) {
      const thirtyDaysAgo = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      from = thirtyDaysAgo;
    }

    // 2. Max Range Check (90 days)
    const rangeDiff = to.getTime() - from.getTime();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    if (rangeDiff > ninetyDaysMs) {
      throw new Error('BAD_REQUEST: Max time range allowed is 90 days to prevent full scan overhead.');
    }

    // Prepare query using Prisma
    const where: any = {
      createdAt: {
        gte: from,
        lte: to
      }
    };

    if (action) {
      where.action = action;
    }

    // 3. Offset Elimination (Cursor-based Pagination only)
    const prismaParams: any = {
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1 // Request 1 extra to check for next page
    };

    if (cursor) {
      prismaParams.cursor = { id: cursor };
      // skip the cursor itself
      prismaParams.skip = 1;
    }

    // Global Query Bypass Tenant Isolation using db.system()
    const logs = await db.system().auditLog.findMany(prismaParams);

    // Prepare pagination flags
    let nextCursor: string | null = null;
    if (logs.length > limit) {
      const nextLog = logs.pop(); // Remove the extra record
      nextCursor = nextLog?.id || null;
    }

    // 4. Record "Audit the Auditor" action
    await AuditService.log({
      userId: ctx.userId,
      tenantId: 'SYSTEM', // Meta-tenant
      action: 'SUPERADMIN_VIEW_GLOBAL_AUDIT_LOGS',
      resource: 'system/audit-logs',
      status: 'SUCCESS',
      payload: { from, to, limit, hasCursor: !!cursor }
    });

    // 5. Deep Mask Sensitive Data (Recursive Data Scrubbing)
    const maskedLogs = logs.map((log: any) => ({
      ...log,
      timestamp: Number(log.timestamp),
      payload: deepMaskSensitiveData(log.payload),
      diff: deepMaskSensitiveData(log.diff)
    }));

    return {
      data: maskedLogs,
      pagination: {
        nextCursor,
        limit,
        from,
        to
      }
    };
  }
}
