import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { ClientContext, SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { TenantRepository } from '../tenant.repository.js';
import { db } from '../../../core/db/prisma.js';
import { getAiContractScanAvailability, resolveTenantFeatureFlags } from '../../../../shared/business/feature-flags.js';

// Tập hợp các tenantId thuộc lớp System/Platform — không đi qua nhánh tenant thông thường.
// 'tenant_system' là giá trị seed thực tế trong DB; 'SYSTEM' & 'PLATFORM' là hằng middleware.
const SYSTEM_TENANT_IDS = new Set(['SYSTEM', 'PLATFORM', 'tenant_system']);

interface TenantFeatureAware {
  subscriptionPlan?: string | null;
  plan?: string | null;
  featuresEnabled?: unknown;
}

interface GetMeUser {
  id: string;
  tenantId: string;
  username?: string | null;
  email?: string | null;
  fullName: string;
  role: UserRole;
  staffId?: string | null;
  assignedVendorId?: string | null;
  assignedSiteId?: string | null;
  assignedContractId?: string | null;
  status?: string | null;
  phone?: string | null;
  tokenVersion?: number;
  qualifications?: unknown;
  idNumber?: string | null;
  licenseNumber?: string | null;
  idExpiry?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  clientContext?: ClientContext;
}

interface GetMeTenantExtras {
  hasPendingUpgrade: boolean;
  pendingUpgradePlan: 'PRO';
  resolvedFeatures: ReturnType<typeof resolveTenantFeatureFlags>;
  featureAvailability: {
    ai_contract_scan: ReturnType<typeof getAiContractScanAvailability>;
  };
}

type GetMeTenant = Awaited<ReturnType<typeof TenantRepository.getById>>;
type GetMeTenantResponse = (GetMeTenant & GetMeTenantExtras) | null;

export interface GetMeResponse {
  user: GetMeUser;
  tenant: GetMeTenantResponse;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && Object.values(UserRole).includes(value as UserRole);
}

function getTenantPlan(tenant: TenantFeatureAware): string | null {
  return tenant.subscriptionPlan ?? tenant.plan ?? null;
}

function withTenantFeatureContext(tenant: GetMeTenant, upgradeRequestExists: boolean): GetMeTenantResponse {
  if (!tenant) {
    return null;
  }

  const tenantWithFeatures = tenant as GetMeTenant & TenantFeatureAware;
  const plan = getTenantPlan(tenantWithFeatures);
  const featuresEnabled = tenantWithFeatures.featuresEnabled;

  return {
    ...tenantWithFeatures,
    hasPendingUpgrade: upgradeRequestExists,
    pendingUpgradePlan: 'PRO',
    resolvedFeatures: resolveTenantFeatureFlags(plan, featuresEnabled),
    featureAvailability: {
      ai_contract_scan: getAiContractScanAvailability(plan, featuresEnabled),
    }
  };
}

export class GetMeUseCase extends BaseUseCase<void, GetMeResponse> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (!context.userId) throw new Error('UNAUTHORIZED');
  }

  protected async internalExecute(context: SecurityContext): Promise<GetMeResponse> {
    const { userId, tenantId, role, clientContext } = context;

    let tenant: GetMeTenantResponse = null;
    let user: GetMeUser | null = null;

    // FIX: Bypass nhánh tenant khi:
    //   (a) tenantId thuộc tập SYSTEM_TENANT_IDS  — khớp cả 'tenant_system' (seed) lẫn 'SYSTEM' (middleware)
    //   (b) role là 'super-admin'                  — guard thứ hai nếu tenantId bị lệch
    const isSystemLevel = !tenantId || SYSTEM_TENANT_IDS.has(tenantId) || role === UserRole.SUPER_ADMIN;

    if (!isSystemLevel) {
      const [t, upgradeRequest, currentUser] = await Promise.all([
        TenantRepository.getById(tenantId!),
        db.forTenant(tenantId!).feedback.findFirst({
          where: {
            type: 'UPGRADE_REQUEST',
            status: 'OPEN'
          },
          orderBy: { createdAt: 'desc' }
        }),
        db.forTenant(tenantId!, { ownerId: role === 'guard' ? userId : undefined, readOnly: true }).staff.findUnique({
          where: { id: userId },
          select: {
            id: true,
            tenantId: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
            staffId: true,
            assignedVendorId: true,
            assignedSiteId: true,
            assignedContractId: true,
            status: true,
            phone: true,
            tokenVersion: true,
            qualifications: true,
            idNumber: true,
            licenseNumber: true,
            idExpiry: true,
            createdAt: true,
            updatedAt: true,
          }
        })
      ]);
      tenant = t;
      tenant = withTenantFeatureContext(t, !!upgradeRequest);
      if (currentUser && isUserRole(currentUser.role)) {
        user = {
          ...currentUser,
          role: currentUser.role,
          fullName: currentUser.fullName || currentUser.username || 'User',
        };
      }
    } else {
      // Super Admin / Platform level:
      // db.withTenant('SYSTEM') thực thi SET_CONFIG app.current_tenant_id='SYSTEM' trong
      // PostgreSQL session VÀ tự động kích hoạt AsyncLocalStorage bypass context →
      // isolationGuard cho phép unscoped query mà không cần inject flag vào args.
      const systemUser = await db.withTenant('SYSTEM', async (tx) => {
        return await tx.staff.findUnique({
          where: { id: userId },
          select: {
            id: true,
            tenantId: true,
            username: true,
            fullName: true,
            role: true,
            staffId: true,
            status: true,
            email: true,
            phone: true,
            tokenVersion: true,
          },
        });
      });

      if (systemUser && isUserRole(systemUser.role)) {
        user = {
          ...systemUser,
          role: systemUser.role,
          fullName: systemUser.fullName || systemUser.username || 'User',
        };
      }
    }

    return {
      user: {
        ...(user ?? {
          id: userId,
          tenantId,
          role,
          fullName: 'User',
        }),
        clientContext,
      },
      tenant
    };
  }
}
