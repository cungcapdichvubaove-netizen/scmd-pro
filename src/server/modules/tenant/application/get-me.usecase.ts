import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { TenantRepository } from '../tenant.repository.js';
import { StaffRepository } from '../../staff/staff.repository.js';
import { db } from '../../../core/db/prisma.js';

// Tập hợp các tenantId thuộc lớp System/Platform — không đi qua nhánh tenant thông thường.
// 'tenant_system' là giá trị seed thực tế trong DB; 'SYSTEM' & 'PLATFORM' là hằng middleware.
const SYSTEM_TENANT_IDS = new Set(['SYSTEM', 'PLATFORM', 'tenant_system']);

export class GetMeUseCase extends BaseUseCase<void, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (!context.userId) throw new Error('UNAUTHORIZED');
  }

  protected async internalExecute(context: SecurityContext): Promise<any> {
    const { userId, tenantId, role, clientContext } = context;

    let tenant = null;
    let user = null;

    // FIX: Bypass nhánh tenant khi:
    //   (a) tenantId thuộc tập SYSTEM_TENANT_IDS  — khớp cả 'tenant_system' (seed) lẫn 'SYSTEM' (middleware)
    //   (b) role là 'super-admin'                  — guard thứ hai nếu tenantId bị lệch
    const isSystemLevel = !tenantId || SYSTEM_TENANT_IDS.has(tenantId) || role === 'super-admin';

    if (!isSystemLevel) {
      const [t, upgradeRequest] = await Promise.all([
        TenantRepository.getById(tenantId!),
        db.forTenant(tenantId!).feedback.findFirst({
          where: {
            type: 'UPGRADE_REQUEST',
            status: 'OPEN'
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);
      tenant = t;
      if (tenant) {
        (tenant as any).hasPendingUpgrade = !!upgradeRequest;
        (tenant as any).pendingUpgradePlan = 'PRO';
      }
      user = await StaffRepository.getById(context, userId);
    } else {
      // Super Admin hoặc Platform level — bypass RLS, truy vấn trực tiếp qua systemBypass
      user = await db.systemBypass().staff.findUnique({ where: { id: userId } });
    }

    return {
      user: {
        ...user,
        id: userId,
        tenantId,
        role,
        clientContext,
        fullName: user?.fullName || 'User'
      },
      tenant
    };
  }
}
