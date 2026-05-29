import { db } from '../../../src/server/core/db/prisma.js';
import { logger } from '../utils/logger.js';
import { GLOBAL_CONSTANTS } from '../config.js';
import bcrypt from 'bcryptjs';
import { SubscriptionPlan } from '@prisma/client';

export async function runMinimalSeed() {
  logger.step('Seeding Minimal Data (System Level)');

  await db.withTenant('SYSTEM', async (sys) => {
    // 1. System Tenant
    await sys.tenant.upsert({
      where: { subdomain: 'system' },
      update: {},
      create: {
        id: GLOBAL_CONSTANTS.SYSTEM_TENANT_ID,
        name: 'SCMD Platform Admin',
        subdomain: 'system',
        plan: SubscriptionPlan.ENTERPRISE,
        contactEmail: 'admin@scmd.pro',
        contactPhone: '0900000000',
        ownerName: 'Super Admin',
        maxEmployees: 999,
        status: 'active',
      },
    });
    logger.success('System tenant seeded.');

    // 2. Super Admin Staff
    const hash = await bcrypt.hash(GLOBAL_CONSTANTS.DEFAULT_SUPERADMIN_PASSWORD, GLOBAL_CONSTANTS.SALT_ROUNDS);
    await sys.staff.upsert({
      where: { username: 'superadmin' },
      update: { password: hash },
      create: {
        id: 'staff-super-admin',
        tenantId: GLOBAL_CONSTANTS.SYSTEM_TENANT_ID,
        username: 'superadmin',
        email: 'superadmin@scmd.pro',
        password: hash,
        fullName: 'Super Administrator',
        role: 'super-admin',
        status: 'active',
        tokenVersion: 1,
      },
    });
    logger.success('Super admin seeded.');

    // 3. Global Role Permissions
    await sys.systemConfig.upsert({
      where: { key: 'role_permissions' },
      update: {},
      create: {
        key: 'role_permissions',
        value: {
          "super-admin": [
            "staff:read", "staff:write",
            "checkpoint:read", "checkpoint:write",
            "log:read", "log:write",
            "report:generate",
            "tenant:manage",
            "system:manage",
            "task:read", "task:write",
            "vendor:read", "vendor:write",
            "billing:read", "billing:write"
          ],
          "tenant-admin": [
            "staff:read", "staff:write",
            "checkpoint:read", "checkpoint:write",
            "log:read", "log:write",
            "report:generate",
            "task:read", "task:write",
            "vendor:read", "vendor:write"
          ],
          "supervisor": [
            "staff:read",
            "checkpoint:read",
            "log:read", "log:write",
            "report:generate",
            "task:read", "task:write"
          ],
          "technician": [
            "checkpoint:read", "checkpoint:write",
            "log:read",
            "task:read"
          ],
          "guard": [
            "checkpoint:read",
            "log:write", "log:read",
            "task:read"
          ]
        }
      }
    });
    logger.success('System configs (role_permissions) seeded.');

    // 4. System TenantSubscription (cần thiết để auth middleware không bị lỗi findUnique)
    await sys.tenantSubscription.upsert({
      where: { tenantId: GLOBAL_CONSTANTS.SYSTEM_TENANT_ID },
      update: {},
      create: {
        tenantId: GLOBAL_CONSTANTS.SYSTEM_TENANT_ID,
        plan: 'PRO_MAX' as any,
        paidUsers: 0,
        activeUsers: 1,
        gracePeriodDays: 999,
        autoDowngrade: false,
      },
    });
    logger.success('System TenantSubscription seeded.');
  });
}
