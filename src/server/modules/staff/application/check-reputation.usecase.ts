import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { StaffRepository } from '../staff.repository.js';
import { redis } from '../../../infra/redis/client.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { logger } from '../../../core/logger/index.js';

export interface CheckReputationInput {
  idNumber: string;
}

export interface ReputationResult {
  violations: number;
  severeViolations: number;
  incidents: number;
  status: 'CLEAN' | 'WARNING' | 'CRITICAL';
}

export class CheckReputationUseCase extends BaseUseCase<CheckReputationInput, ReputationResult> {
  override async authorize(context: SecurityContext): Promise<void> {
    // Both Tenant Admins and Super Admins can check reputation
    if (context.role !== UserRole.TENANT_ADMIN && context.role !== UserRole.SUPER_ADMIN) {
      throw new Error('FORBIDDEN_ACTION');
    }
  }

  override async validate(request: CheckReputationInput): Promise<void> {
    if (!request.idNumber || request.idNumber.length < 5) {
      throw new Error('INVALID_ID_NUMBER');
    }
  }

  override async internalExecute(context: SecurityContext, request: CheckReputationInput): Promise<ReputationResult> {
    const { tenantId, userId } = context;
    const { idNumber } = request;

    // 1. Per-tenant Rate Limiting (50 requests/hour)
    const rateLimitKey = `rate_limit:reputation:${tenantId}`;
    try {
      const currentCount = await redis.incr(rateLimitKey);
      if (currentCount === 1) {
        await redis.expire(rateLimitKey, 3600); // 1 hour TTL
      }
      
      if (currentCount > 50) {
        logger.warn({ tenantId, userId, idNumber }, 'Reputation check rate limit exceeded');
        throw new Error('RATE_LIMIT_EXCEEDED: Tenant đã đạt giới hạn 50 lượt kiểm tra uy tín mỗi giờ.');
      }
    } catch (err: any) {
      if (err.message.startsWith('RATE_LIMIT_EXCEEDED')) throw err;
      // Fail open for standard redis errors to not block production logic but log it
      logger.error({ err, tenantId }, 'Redis rate limit error for reputation check');
    }

    // 2. Audit Trail logging for cross-tenant data access
    await AuditService.log({
      userId,
      tenantId,
      action: 'REPUTATION_CHECK',
      resource: `staff/idNumber/${idNumber.slice(0, 4)}****`, // Mask PII
      payload: { idNumber: `${idNumber.slice(0, 4)}****` },
      status: 'SUCCESS'
    });

    // 3. Repository lookup (Cross-tenant)
    const rep = await StaffRepository.checkReputation(idNumber);
    
    // FIX [P4]: Minimum threshold to avoid probing & false positives
    // Only return data if there's significant evidence (violation >= 2)
    if (rep.violations < 2 && rep.severeViolations === 0 && rep.incidents < 3) {
      return {
        violations: 0,
        severeViolations: 0,
        incidents: 0,
        status: 'CLEAN'
      };
    }

    let status: ReputationResult['status'] = 'CLEAN';
    if (rep.severeViolations > 0 || rep.violations > 3) {
      status = 'CRITICAL';
    } else if (rep.violations > 0 || rep.incidents > 5) {
      status = 'WARNING';
    }

    return {
      ...rep,
      status
    };
  }
}
