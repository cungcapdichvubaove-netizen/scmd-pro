import { db } from '../../core/db/prisma.js';
import bcrypt from 'bcryptjs';
import { SubscriptionPlan, PlanTier } from '@prisma/client';
import { resolveSeedPassword, shouldResetDemoSeedPasswords } from './seed-password.policy.js';

export async function seed() {
  console.log('🌱 Starting database synchronization and seeding...');

  const SYSTEM_TENANT_ID = 'tenant_system';
  const VINHOMES_TENANT_ID = 'tenant_vinhomes';
  const ANHOI_TENANT_ID = 'tenant_anhoi';
  const SALT_ROUNDS = 10;

  await db.withTenant('SYSTEM', async (sys) => {

    // ============================================================
    // 1. TENANTS
    // ============================================================

    await sys.tenant.upsert({
      where: { subdomain: 'system' },
      update: {},
      create: {
        id: SYSTEM_TENANT_ID,
        name: 'SCMD Platform Admin',
        subdomain: 'system',
        plan: SubscriptionPlan.ENTERPRISE,
        contactEmail: 'cuoixiu.tv@gmail.com',
        contactPhone: '0900000000',
        ownerName: 'Super Admin',
        maxEmployees: 999,
        status: 'active',
      },
    });

    await sys.tenant.upsert({
      where: { subdomain: 'vinhomes' },
      update: {},
      create: {
        id: VINHOMES_TENANT_ID,
        name: 'Vinhomes Grand Park',
        subdomain: 'vinhomes',
        plan: 'PRO',
        contactEmail: 'vinhomes@scmd.pro',
        contactPhone: '0901112223',
        ownerName: 'Admin Vinhomes',
        maxEmployees: 100,
        status: 'active',
      },
    });

    await sys.tenant.upsert({
      where: { subdomain: 'anhoi' },
      update: {},
      create: {
        id: ANHOI_TENANT_ID,
        name: 'Chung cư An Hội',
        subdomain: 'anhoi',
        plan: 'PRO',
        contactEmail: 'anhoi@scmd.pro',
        contactPhone: '0903334445',
        ownerName: 'Admin An Hoi',
        maxEmployees: 50,
        status: 'active',
      },
    });

    console.log('✅ Tenants seeded: system, vinhomes, anhoi');

    // ============================================================
    // 2. STAFF WITH PASSWORDS (SEC-FIX: H-03 - No Plaintext)
    // ============================================================
    const rawSuperAdminPass = resolveSeedPassword('SEED_SUPERADMIN_PASSWORD');
    const rawTenantAdminPass = resolveSeedPassword('SEED_TENANT_ADMIN_PASSWORD');
    const rawGuardPass = resolveSeedPassword('SEED_GUARD_PASSWORD');
    const rawCommanderPass = process.env.SEED_COMMANDER_PASSWORD || rawTenantAdminPass;
    const resetDemoSeedPasswords = shouldResetDemoSeedPasswords();


    const superAdminHash  = await bcrypt.hash(rawSuperAdminPass, SALT_ROUNDS);
    const tenantAdminHash = await bcrypt.hash(rawTenantAdminPass, SALT_ROUNDS);
    const guardHash       = await bcrypt.hash(rawGuardPass, SALT_ROUNDS);
    const commanderHash   = await bcrypt.hash(rawCommanderPass, SALT_ROUNDS);

    await sys.staff.upsert({
      where: { username: 'superadmin' },
      // SECURITY: Không update password khi record đã tồn tại.
      // Password chỉ được set lúc CREATE mới để tránh reset password admin đã thay đổi.
      // Nếu cần reset password, dùng script riêng hoặc SEED_SUPERADMIN_PASSWORD env var khi deploy lần đầu.
      // Production never resets existing passwords. Non-production can repair demo
      // passwords only when SEED_RESET_DEMO_PASSWORDS=true is set explicitly.
      update: {
        status: 'active',
        role: 'super-admin',
        ...(resetDemoSeedPasswords ? { password: superAdminHash, tokenVersion: { increment: 1 } } : {}),
      },
      create: {
        id: 'staff-super-admin',
        tenantId: SYSTEM_TENANT_ID,
        username: 'superadmin',
        password: superAdminHash,
        fullName: 'Super Administrator',
        role: 'super-admin',
        status: 'active',
        tokenVersion: 1,
        email: 'superadmin@local.dev',
      },
    });

    await sys.staff.upsert({
      where: { username: 'admin_vinhomes' },
      update: {
        status: 'active',
        role: 'tenant-admin',
        ...(resetDemoSeedPasswords ? { password: tenantAdminHash, tokenVersion: { increment: 1 } } : {}),
      },
      create: {
        id: 'staff-vinhomes-admin',
        tenantId: VINHOMES_TENANT_ID,
        username: 'admin_vinhomes',
        password: tenantAdminHash,
        fullName: 'Quản lý Vinhomes',
        role: 'tenant-admin',
        status: 'active',
        tokenVersion: 1,
        email: 'admin@vinhomes.local',
      },
    });

    await sys.staff.upsert({
      where: { username: 'admin_anhoi' },
      update: {
        status: 'active',
        role: 'tenant-admin',
        ...(resetDemoSeedPasswords ? { password: tenantAdminHash, tokenVersion: { increment: 1 } } : {}),
      },
      create: {
        id: 'staff-anhoi-admin',
        tenantId: ANHOI_TENANT_ID,
        username: 'admin_anhoi',
        password: tenantAdminHash,
        fullName: 'Quản lý An Hội',
        role: 'tenant-admin',
        status: 'active',
        tokenVersion: 1,
        email: 'admin@anhoi.local',
      },
    });

    const commanderVinhomes = await sys.staff.upsert({
      where: { username: 'commander_vinhomes' },
      update: {
        status: 'active',
        role: 'vendor-commander',
        tenantId: VINHOMES_TENANT_ID,
        fullName: 'Chỉ huy Vinhomes',
        email: 'commander@vinhomes.local',
        ...(resetDemoSeedPasswords ? { password: commanderHash, tokenVersion: { increment: 1 } } : {}),
      },
      create: {
        id: 'staff-vinhomes-commander',
        tenantId: VINHOMES_TENANT_ID,
        username: 'commander_vinhomes',
        password: commanderHash,
        fullName: 'Chỉ huy Vinhomes',
        role: 'vendor-commander',
        status: 'active',
        tokenVersion: 1,
        email: 'commander@vinhomes.local',
      },
    });

    console.log('✅ Staff accounts seeded.');
    console.log(`✅ Staff seeded: ${commanderVinhomes.username} (vendor-commander)`);

    const staffA = await sys.staff.upsert({
      where: { username: 'test_guard_1' },
      update: {
        fullName: 'Nguyễn Văn An',
        role: 'guard',
        status: 'active',
        tenantId: VINHOMES_TENANT_ID,
        ...(resetDemoSeedPasswords ? { password: guardHash, tokenVersion: { increment: 1 } } : {}),
      },
      create: {
        id: 'staff-an-uuid',
        tenantId: VINHOMES_TENANT_ID,
        username: 'test_guard_1',
        password: guardHash,
        fullName: 'Nguyễn Văn An',
        role: 'guard',
        status: 'active',
        tokenVersion: 1,
        email: 'guard1@vinhomes.local',
      },
    });
    console.log(`✅ Staff seeded: ${staffA.username} (guard)`);

    // ============================================================
    // 3. CHECKPOINTS (PostGIS Geography)
    // ============================================================
    const checkpoints = [
      { id: 'checkpoint-alpha', name: 'Alpha Gate',   lat: 10.762622, lng: 106.660172 },
      { id: 'checkpoint-beta',  name: 'Beta Parking', lat: 10.763000, lng: 106.661000 },
    ];

    for (const cp of checkpoints) {
      try {
        await sys.$executeRawUnsafe(`
          INSERT INTO "checkpoints" (id, tenant_id, name, location, created_at, updated_at)
          VALUES (
            $1,
            $2,
            $3,
            ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name       = EXCLUDED.name,
            location   = EXCLUDED.location,
            updated_at = NOW();
        `,
          cp.id,
          VINHOMES_TENANT_ID,
          cp.name,
          cp.lng,   // ST_MakePoint(X=Longitude, Y=Latitude)
          cp.lat,
        );
      } catch (err) {
        console.warn(`⚠️ Failed to seed checkpoint ${cp.id} via raw SQL. Skipping (likely mock mode or missing PostGIS).`);
      }
    }
    console.log('✅ Checkpoints synchronized with PostGIS geography.');

    // ============================================================
    // 4. PATROL LOGS
    // ============================================================
    await sys.patrolLog.upsert({
      where: { id: 'sample-log-1' },
      update: {},
      create: {
        id: 'sample-log-1',
        tenantId: VINHOMES_TENANT_ID,
        staffId: staffA.id,
        checkpointId: checkpoints[0]?.id || '',
      },
    });
    console.log('✅ Initial patrol logs seeded.');

    // ============================================================
    // 5. TEST DATA: TASKS
    // ============================================================
    await sys.task.upsert({
      where: { id: 'task-1' },
      update: {},
      create: {
        id: 'task-1',
        tenantId: VINHOMES_TENANT_ID,
        title: 'Kiểm tra PCCC khu Vực 1',
        description: 'Kiểm tra theo bình cứu hỏa tầng trệt',
        status: 'PENDING',
        priority: 'HIGH',
        assigneeId: staffA.id,
      },
    });

    await sys.task.upsert({
      where: { id: 'task-2' },
      update: {},
      create: {
        id: 'task-2',
        tenantId: VINHOMES_TENANT_ID,
        title: 'Tuần tra bãi xe B1',
        description: 'Kiểm tra xe vãng lai đỗ quá giờ',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        assigneeId: staffA.id,
      },
    });

    // ============================================================
    // 6. TEST DATA: INCIDENTS
    // ============================================================
    await sys.incident.upsert({
      where: { id: 'incident-1' },
      update: {},
      create: {
        id: 'incident-1',
        tenantId: VINHOMES_TENANT_ID,
        description: 'Cửa thoát hiểm bị kẹt: Cửa thoát hiểm tầng 3 bị kẹt không mở được từ bên trong.',
        severity: 'HIGH',
        status: 'REPORTED',
        type: 'MAINTENANCE',
        reporter: {
          connect: { id: staffA.id },
        },
      },
    });

    await sys.incident.upsert({
      where: { id: 'incident-2' },
      update: {},
      create: {
        id: 'incident-2',
        tenantId: VINHOMES_TENANT_ID,
        description: 'Báo cháy giả khu B: Báo cháy kích hoạt tại sảnh B nhưng không có hỏa hoạn.',
        severity: 'CRITICAL',
        status: 'RESOLVED',
        type: 'SECURITY',
        reporter: {
          connect: { id: staffA.id },
        },
      },
    });

    // ============================================================
    // 7. TEST DATA: SHIFT SCHEDULES
    // ============================================================
    try {
      await sys.shiftSchedule.upsert({
        where: { id: 'shift-1' },
        update: {},
        create: {
          id: 'shift-1',
          tenantId: VINHOMES_TENANT_ID,
          contractId: 'contract-demo',
          date: new Date().toISOString().split('T')[0],
          shiftType: 'MORNING',
          startTime: '06:00',
          endTime: '14:00',
          requiredCount: 2,
          positionName: 'Sảnh chính',
          siteId: 'site-alpha',
        },
      });
    } catch (err) {
      console.warn('⚠️ ShiftSchedule model might not exist or schema differs. Skipping shift seed.');
    }

    console.log('✅ Tasks, Incidents, and Shifts seeded for dashboard testing.');

    // ============================================================
    // 8. SYSTEM CONFIG
    // FIX: SystemConfig.id có @default("global-config") — mọi record
    // chia sẻ cùng một id. Phải upsert theo field `key` (@unique)
    // và luôn cung cấp `update` có data thật để tránh P2002.
    // ============================================================
    const storageConfigValue = {
      type: 'cloudinary',
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        apiKey: process.env.CLOUDINARY_API_KEY || '',
        apiSecret: process.env.CLOUDINARY_API_SECRET || '',
      },
    };

    await sys.systemConfig.upsert({
      where: { key: 'STORAGE_CONFIG' },
      update: { value: storageConfigValue },
      create: {
        id: 'config-storage',
        key: 'STORAGE_CONFIG',
        value: storageConfigValue,
      },
    });

    const rolePermissionsValue = {
      'super-admin': [
        'staff:read', 'staff:write',
        'checkpoint:read', 'checkpoint:write',
        'log:read', 'log:write',
        'report:generate',
        'report:finalize',
        'tenant:manage',
        'system:manage',
        'task:read', 'task:write',
        'vendor:read', 'vendor:write',
        'vendor:dispute:submit', 'vendor:dispute:view',
        'violation:review', 'violation:resolve',
        'billing:read', 'billing:write',
      ],
      'tenant-admin': [
        'staff:read', 'staff:write',
        'checkpoint:read', 'checkpoint:write',
        'log:read', 'log:write',
        'report:generate',
        'report:finalize',
        'task:read', 'task:write',
        'vendor:read', 'vendor:write',
        'vendor:dispute:view',
        'violation:review', 'violation:resolve',
      ],
      'supervisor': [
        'staff:read',
        'checkpoint:read',
        'log:read', 'log:write',
        'report:generate',
        'task:read', 'task:write',
        'vendor:read',
        'vendor:dispute:view',
        'violation:review',
      ],
      'vendor-commander': [
        'staff:read', 'staff:write',
        'checkpoint:read',
        'log:read', 'log:write',
        'report:generate',
        'task:read', 'task:write',
        'vendor:read',
        'vendor:dispute:view', 'vendor:dispute:submit',
        'violation:review',
      ],
      'vendor-representative': [
        'staff:read',
        'log:read',
        'report:generate',
        'vendor:read',
        'vendor:dispute:view', 'vendor:dispute:submit',
      ],
      'technician': [
        'checkpoint:read', 'checkpoint:write',
        'log:read',
        'task:read',
      ],
      'guard': [
        'checkpoint:read',
        'log:write', 'log:read',
        'task:read',
      ],
    };

    await sys.systemConfig.upsert({
      where: { key: 'role_permissions' },
      update: { value: rolePermissionsValue },
      create: {
        id: 'config-role-permissions',
        key: 'role_permissions',
        value: rolePermissionsValue,
      },
    });

    
    // ============================================================
    // 9. TENANT SUBSCRIPTIONS (FIX: P2022 — bảng tenant_subscriptions
    //    phải có ít nhất 1 row per tenant trước khi query findUnique)
    // ============================================================
    const tenantSubscriptionData = [
      { tenantId: SYSTEM_TENANT_ID,   plan: PlanTier.PRO_MAX },
      { tenantId: VINHOMES_TENANT_ID, plan: PlanTier.PRO },
      { tenantId: ANHOI_TENANT_ID,    plan: PlanTier.PRO },
    ];

    for (const sub of tenantSubscriptionData) {
      await sys.tenantSubscription.upsert({
        where:  { tenantId: sub.tenantId },
        update: { plan: sub.plan },
        create: {
          tenantId:        sub.tenantId,
          plan:            sub.plan,
          paidUsers:       0,
          activeUsers:     0,
          gracePeriodDays: 3,
          autoDowngrade:   true,
        },
      });
    }

    console.log('✅ TenantSubscription rows seeded (system, vinhomes, anhoi).');

    console.log('✅ System config initialized.');
  });

  const getMaskedPass = (p: string | undefined) =>
    p ? '******** (From ENV)' : 'MISSING - seed would fail before account creation';

  console.log(`
╔══════════════════════════════════════════════════════╗
║        🎉 SEED HOÀN THÀNH - THÔNG TIN ĐĂNG NHẬP     ║
╠══════════════════════════════════════════════════════╣
║  SUPER ADMIN (Quản trị hệ thống)                    ║
║    Workspace: system                                ║
║    Username : superadmin     password: ${getMaskedPass(process.env.SEED_SUPERADMIN_PASSWORD)}
╠══════════════════════════════════════════════════════╣
║  VINHOMES ADMIN (Demo 1)                            ║
║    Workspace: vinhomes                              ║
║    Username : admin_vinhomes password: ${getMaskedPass(process.env.SEED_TENANT_ADMIN_PASSWORD)}
╠══════════════════════════════════════════════════════╣
║  VINHOMES COMMANDER (Demo 1)                        ║
║    Workspace: vinhomes                              ║
║    Username : commander_vinhomes password: ${getMaskedPass(process.env.SEED_COMMANDER_PASSWORD || process.env.SEED_TENANT_ADMIN_PASSWORD)}
╠══════════════════════════════════════════════════════╣
║  AN HOI ADMIN (Demo 2)                              ║
║    Workspace: anhoi                                 ║
║    Username : admin_anhoi    password: ${getMaskedPass(process.env.SEED_TENANT_ADMIN_PASSWORD)}
╚══════════════════════════════════════════════════════╝
`);
}

// Chạy trực tiếp nếu script được gọi bằng node
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seed()
    .catch((e) => {
      console.error('❌ Seeding failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await db.system().$disconnect();
    });
}
