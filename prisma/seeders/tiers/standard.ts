/**
 * SCMD Pro — Standard Demo Seed (Tier: Standard)
 * ================================================
 * Tạo dữ liệu demo hoàn chỉnh cho 2 Tenants: Vinhomes Grand Park (PRO) & Chung cư An Hội (FREE).
 *
 * Phạm vi coverage:
 *  - Tenants + TenantSubscription (PRO, FREE)
 *  - Staff (tenant-admin, supervisor, guard, technician)
 *  - Checkpoints (PostGIS geography)
 *  - Checkpoint Benchmark Sessions (Admin Benchmark Recorder — 3–5 sessions/checkpoint PRO, 1–2 FREE)
 *  - Patrol Logs (last 30 days, đa dạng)
 *  - Incidents (đủ status: REPORTED → CLOSED, đa loại/severity)
 *  - Tasks (PENDING / IN_PROGRESS / COMPLETED, priority đa dạng)
 *  - Attendance Records (CHECK_IN / CHECK_OUT, lateMinutes)
 *  - Disciplinary Actions (đa loại)
 *  - Staff Performance Metrics (3 tháng gần nhất)
 *  - Vendors + Contracts + Compliance Scores
 *  - Shift Schedules + Shift Compliance Items
 *  - Monthly Strategy Insights (AI Watchdog simulation)
 *  - Notifications (unread/read)
 *  - News (platform-level)
 *  - Feedback
 *  - System Configs (STORAGE_CONFIG, role_permissions, ai_quota)
 */

import { db } from '../../../src/server/core/db/prisma.js';
import { logger } from '../utils/logger.js';
import { GLOBAL_CONSTANTS } from '../config.js';
import {
  generateVNName,
  generateIdNumber,
  generatePhone,
  randomInt,
  randomElement,
  generateCoordinates,
  randomDate,
} from '../utils/random.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PlanTier, SubscriptionPlan, PaymentStatus } from '@prisma/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

function monthStr(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function periodStr(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function dateStr(daysAgoN: number): string {
  const d = daysAgo(daysAgoN);
  return d.toISOString().split('T')[0];
}

const INCIDENT_TYPES = [
  'CCTV_OFFLINE', 'INTRUSION', 'FIRE_ALARM', 'PIPE_BROKEN',
  'SUSPICIOUS_PERSON', 'DOOR_OPEN', 'THEFT', 'VANDALISM',
  'MEDICAL_EMERGENCY', 'POWER_FAILURE',
];

const INCIDENT_STATUSES = ['REPORTED', 'INVESTIGATING', 'ESCALATED', 'RESOLVED', 'CLOSED'] as const;

const DISCIPLINARY_TYPES = [
  'LATE_ARRIVAL', 'UNIFORM_VIOLATION', 'ABANDON_POST',
  'PHONE_USAGE', 'PATROL_SKIP', 'MISCONDUCT',
];

const QUALIFICATION_POOL = [
  'Chứng chỉ bảo vệ hạng 3', 'Chứng chỉ PCCC', 'Chứng chỉ sơ cấp cứu',
  'Chứng chỉ an ninh mạng cơ bản', 'Bằng lái xe hạng B2', 'Chứng nhận võ thuật cơ bản',
  'Chứng chỉ xử lý tình huống khẩn cấp', 'Chứng chỉ giám sát CCTV',
];

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function runStandardSeed() {
  logger.step('Seeding Standard Demo Data (Comprehensive)');

  const tenantAdminHash = await bcrypt.hash(GLOBAL_CONSTANTS.DEFAULT_TENANT_PASSWORD, GLOBAL_CONSTANTS.SALT_ROUNDS);
  const guardHash = await bcrypt.hash(GLOBAL_CONSTANTS.DEFAULT_GUARD_PASSWORD, GLOBAL_CONSTANTS.SALT_ROUNDS);

  // ─── Tenant Definitions ───────────────────────────────────────────────────
  const tenantDefs = [
    {
      id: GLOBAL_CONSTANTS.VINHOMES_TENANT_ID,
      name: 'Vinhomes Grand Park',
      subdomain: 'vinhomes',
      plan: PlanTier.PRO,
      subscriptionPlan: SubscriptionPlan.ENTERPRISE,
      center: GLOBAL_CONSTANTS.VINHOMES_CENTER,
      maxEmployees: 100,
      paidUsers: 20,
      staffCount: 15,       // tenant-admin(1) + supervisor(2) + technician(1) + guard(11)
      checkpointCount: 20,
      patrolLogCount: 200,
      incidentCount: 15,
      taskCount: 30,
    },
    {
      id: GLOBAL_CONSTANTS.ANHOI_TENANT_ID,
      name: 'Chung cư An Hội',
      subdomain: 'anhoi',
      plan: PlanTier.FREE,
      subscriptionPlan: SubscriptionPlan.FREE,
      center: GLOBAL_CONSTANTS.ANHOI_CENTER,
      maxEmployees: 5,
      paidUsers: 0,
      staffCount: 3,        // tenant-admin(1) + guard(2)
      checkpointCount: 5,
      patrolLogCount: 30,
      incidentCount: 3,
      taskCount: 6,
    },
  ];

  await db.withTenant('SYSTEM', async (sys) => {

    // =========================================================================
    // STEP 1: TENANTS + SUBSCRIPTIONS + BILLING PAYMENTS
    // =========================================================================
    logger.info('Step 1/12: Tenants + Subscriptions');

    for (const t of tenantDefs) {
      // Upsert Tenant
      await sys.tenant.upsert({
        where: { subdomain: t.subdomain },
        update: {
          name: t.name,
          maxEmployees: t.maxEmployees,
          paidUsers: t.paidUsers,
          status: 'active',
        },
        create: {
          id: t.id,
          name: t.name,
          subdomain: t.subdomain,
          plan: t.plan === PlanTier.PRO ? 'PRO' : 'FREE',
          subscriptionPlan: t.subscriptionPlan,
          contactEmail: `admin@${t.subdomain}.scmd.pro`,
          contactPhone: generatePhone(),
          ownerName: `Quản lý ${t.name}`,
          address: t.subdomain === 'vinhomes'
            ? 'Quận 9, Thành phố Hồ Chí Minh'
            : 'Bình Thạnh, Thành phố Hồ Chí Minh',
          maxEmployees: t.maxEmployees,
          paidUsers: t.paidUsers,
          status: 'active',
        },
      });

      // Upsert TenantSubscription
      const expiresAt = new Date(Date.now() + 90 * 86_400_000); // 90 ngày nữa
      await sys.tenantSubscription.upsert({
        where: { tenantId: t.id },
        update: { plan: t.plan, paidUsers: t.paidUsers, expiresAt },
        create: {
          tenantId: t.id,
          plan: t.plan,
          paidUsers: t.paidUsers,
          activeUsers: t.staffCount,
          expiresAt,
          gracePeriodDays: 3,
          autoDowngrade: true,
        },
      });

      // BillingPayment (chỉ PRO tenant)
      if (t.plan === PlanTier.PRO) {
        const payRef = `PAY-${t.subdomain.toUpperCase()}-2025Q2`;
        await sys.billingPayment.upsert({
          where: { tenantId_paymentRef: { tenantId: t.id, paymentRef: payRef } },
          update: {},
          create: {
            tenantId: t.id,
            paidUsers: t.paidUsers,
            paidMonths: 3,
            amountVnd: BigInt(t.paidUsers * 99000 * 3),
            status: PaymentStatus.ACTIVE,
            paymentRef: payRef,
            paidAt: daysAgo(60),
            activatedAt: daysAgo(60),
            activatedBy: 'staff-super-admin',
            note: `Thanh toán gói PRO Q2/2025 - ${t.paidUsers} nhân viên x 3 tháng`,
            periodStart: daysAgo(60),
            periodEnd: new Date(Date.now() + 30 * 86_400_000),
          },
        });
      }
    }
    logger.success('Tenants, Subscriptions, Billing seeded.');

    // =========================================================================
    // STEP 2: STAFF
    // =========================================================================
    logger.info('Step 2/12: Staff');

    // Lưu staff IDs theo tenant để dùng lại ở các step sau
    const tenantStaff: Record<string, { id: string; role: string }[]> = {};

    for (const t of tenantDefs) {
      const staffList: { id: string; role: string }[] = [];

      // 2a. Tenant Admin
      const adminUsername = `admin_${t.subdomain}`;
      const admin = await sys.staff.upsert({
        where: { username: adminUsername },
        update: { password: tenantAdminHash },
        create: {
          id: `staff-admin-${t.subdomain}`,
          tenantId: t.id,
          username: adminUsername,
          email: `admin@${t.subdomain}.scmd.pro`,
          password: tenantAdminHash,
          fullName: `Quản lý ${t.name}`,
          phone: generatePhone(),
          role: 'tenant-admin',
          status: 'active',
          tokenVersion: 1,
          qualifications: ['Chứng chỉ bảo vệ hạng 3', 'Chứng chỉ PCCC'],
          idNumber: generateIdNumber(),
        },
      });
      staffList.push({ id: admin.id, role: 'tenant-admin' });

      // 2b. Supervisor (chỉ PRO)
      if (t.plan === PlanTier.PRO) {
        for (let i = 1; i <= 2; i++) {
          const un = `supervisor_${t.subdomain}_${i}`;
          const sv = await sys.staff.upsert({
            where: { username: un },
            update: { password: guardHash },
            create: {
              id: crypto.randomUUID(),
              tenantId: t.id,
              username: un,
              email: `${un}@${t.subdomain}.scmd.pro`,
              password: guardHash,
              fullName: generateVNName(),
              phone: generatePhone(),
              role: 'supervisor',
              status: 'active',
              tokenVersion: 1,
              qualifications: randomElement([
                ['Chứng chỉ bảo vệ hạng 3', 'Chứng chỉ PCCC'],
                ['Chứng chỉ sơ cấp cứu', 'Chứng chỉ giám sát CCTV'],
              ]),
              idNumber: generateIdNumber(),
              licenseNumber: `LIC-${randomInt(100000, 999999)}`,
            },
          });
          staffList.push({ id: sv.id, role: 'supervisor' });
        }

        // 2c. Technician (chỉ PRO)
        const un = `tech_${t.subdomain}_1`;
        const tech = await sys.staff.upsert({
          where: { username: un },
          update: { password: guardHash },
          create: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            username: un,
            email: `${un}@${t.subdomain}.scmd.pro`,
            password: guardHash,
            fullName: generateVNName(),
            phone: generatePhone(),
            role: 'technician',
            status: 'active',
            tokenVersion: 1,
            qualifications: ['Chứng chỉ an ninh mạng cơ bản', 'Chứng chỉ giám sát CCTV'],
            idNumber: generateIdNumber(),
          },
        });
        staffList.push({ id: tech.id, role: 'technician' });
      }

      // 2d. Guards
      const guardCount = t.plan === PlanTier.PRO ? 12 : 2;
      for (let i = 1; i <= guardCount; i++) {
        const un = `guard_${t.subdomain}_${i}`;
        const isInactive = i === guardCount; // 1 guard inactive để test
        const g = await sys.staff.upsert({
          where: { username: un },
          update: { password: guardHash },
          create: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            username: un,
            email: `${un}@${t.subdomain}.scmd.pro`,
            password: guardHash,
            fullName: generateVNName(),
            phone: generatePhone(),
            role: 'guard',
            status: isInactive ? 'inactive' : 'active',
            tokenVersion: 1,
            qualifications: randomInt(0, 1) === 1
              ? [randomElement(QUALIFICATION_POOL)]
              : [],
            idNumber: generateIdNumber(),
          },
        });
        staffList.push({ id: g.id, role: 'guard' });
      }

      tenantStaff[t.id] = staffList;
      logger.success(`Staff seeded for ${t.name}: ${staffList.length} members.`);
    }

    // =========================================================================
    // STEP 3: CHECKPOINTS (PostGIS)
    // =========================================================================
    logger.info('Step 3/12: Checkpoints');

    const tenantCheckpoints: Record<string, { id: string; name: string }[]> = {};

    const CHECKPOINT_NAMES = [
      'Cổng chính', 'Cổng phụ', 'Sảnh A', 'Sảnh B', 'Tầng hầm B1',
      'Tầng hầm B2', 'Bãi xe', 'Hồ bơi', 'Khu thương mại', 'Công viên trung tâm',
      'Khu vực CCTV trung tâm', 'Cầu thang thoát hiểm A', 'Cầu thang thoát hiểm B',
      'Phòng bảo vệ', 'Khu vực kỹ thuật', 'Sân thượng', 'Lối vào VIP',
      'Khu trẻ em', 'Phòng gym', 'Nhà để xe máy',
    ];

    for (const t of tenantDefs) {
      const checkpoints: { id: string; name: string }[] = [];

      for (let i = 0; i < t.checkpointCount; i++) {
        const cpId = crypto.randomUUID();
        const coords = generateCoordinates(t.center.lat, t.center.lng, 0.8);
        const cpName = i < CHECKPOINT_NAMES.length
          ? CHECKPOINT_NAMES[i]
          : `Điểm kiểm tra ${i + 1}`;

        await sys.$executeRawUnsafe(
          `INSERT INTO "checkpoints"
            (id, tenant_id, name, location, qr_hash, status,
             benchmark_tolerance_pct, benchmark_session_count,
             created_at, updated_at)
           VALUES ($1, $2, $3,
                   ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
                   $6, 'active', 20, 0, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING;`,
          cpId, t.id, cpName,
          coords.lng, coords.lat,
          crypto.randomUUID(),
        );
        checkpoints.push({ id: cpId, name: cpName });
      }

      tenantCheckpoints[t.id] = checkpoints;
      logger.success(`Checkpoints seeded for ${t.name}: ${checkpoints.length}`);
    }

    // =========================================================================
    // STEP 3b: CHECKPOINT BENCHMARK SESSIONS (Admin Benchmark Recorder)
    // =========================================================================
    // Mỗi session = 1 lần Admin đi thực địa ghi nhận thời gian chuẩn cho checkpoint.
    // Sau khi đủ sessions, hệ thống tính benchmark trung bình và cập nhật checkpoint.
    // PRO tenant: 3–5 sessions/checkpoint. FREE tenant: 1–2 sessions/checkpoint.
    // =========================================================================
    logger.info('Step 3b/12: Checkpoint Benchmark Sessions');

    for (const t of tenantDefs) {
      const checkpoints = tenantCheckpoints[t.id];
      if (checkpoints.length === 0) continue;

      // Admin và supervisor là người đi ghi benchmark ngoài thực địa
      const recorders = tenantStaff[t.id]
        .filter(s => ['tenant-admin', 'supervisor'].includes(s.role))
        .map(s => s.id);
      if (recorders.length === 0) continue;

      const sessionsPerCp = t.plan === PlanTier.PRO ? randomInt(3, 5) : randomInt(1, 2);
      const allSessions: {
        cpId: string;
        travelTime: number;
        workDuration: number;
      }[] = [];

      for (const cp of checkpoints) {
        const sessionTravals: number[] = [];

        for (let s = 0; s < sessionsPerCp; s++) {
          // Mô phỏng thực địa: thời gian đi đến checkpoint (giây)
          // Checkpoint trong toà nhà: 60–300s. Ngoài trời: 120–480s.
          const travelTime   = randomInt(60, 480);
          const workDuration = randomInt(20, 180); // thời gian làm việc tại điểm (giây)
          const coord        = generateCoordinates(t.center.lat, t.center.lng, 0.8);
          const recordedBy   = randomElement(recorders);
          const createdAt    = randomDate(daysAgo(60), daysAgo(7));

          await sys.checkpointBenchmarkSession.create({
            data: {
              id: crypto.randomUUID(),
              tenantId: t.id,
              checkpointId: cp.id,
              travelTime,
              workDuration,
              lat: coord.lat,
              lon: coord.lng,
              recordedBy,
              createdAt,
            },
          });

          sessionTravals.push(travelTime);
          allSessions.push({ cpId: cp.id, travelTime, workDuration });
        }

        // Tính benchmark trung bình từ sessions và cập nhật lại checkpoint
        const avgTravel = Math.round(
          sessionTravals.reduce((a, b) => a + b, 0) / sessionTravals.length,
        );
        const avgWork = Math.round(
          allSessions
            .filter(s => s.cpId === cp.id)
            .reduce((sum, s) => sum + s.workDuration, 0) / sessionsPerCp,
        );

        await sys.$executeRawUnsafe(
          `UPDATE checkpoints
           SET benchmark_travel_time   = $1,
               benchmark_work_duration = $2,
               benchmark_tolerance_pct = 20,
               benchmark_session_count = $3,
               benchmark_recorded_at   = NOW(),
               updated_at              = NOW()
           WHERE id = $4 AND tenant_id = $5`,
          avgTravel,
          avgWork,
          sessionsPerCp,
          cp.id,
          t.id,
        );
      }

      const totalSessions = checkpoints.length * sessionsPerCp;
      logger.success(`Benchmark Sessions seeded for ${t.name}: ${totalSessions} sessions (${sessionsPerCp}/checkpoint)`);
    }

    // =========================================================================
    // STEP 4: PATROL LOGS (last 30 days)
    // =========================================================================
    logger.info('Step 4/12: Patrol Logs');

    for (const t of tenantDefs) {
      const staffIds = tenantStaff[t.id]
        .filter(s => s.role !== 'tenant-admin')
        .map(s => s.id);
      const cpIds = tenantCheckpoints[t.id].map(cp => cp.id);

      for (let i = 0; i < t.patrolLogCount; i++) {
        const pastDate = randomDate(daysAgo(30), new Date());
        const hasFlag = randomInt(0, 10) === 0; // 10% bị flag suspicious

        await sys.patrolLog.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            staffId: randomElement(staffIds),
            checkpointId: randomElement(cpIds),
            metadata: {
              notes: randomElement(['An toàn', 'Bình thường', 'Everything OK', 'Khu vực tối', '']),
              gpsAccuracy: randomInt(3, 80),
              suspicious: hasFlag,
              lat: t.center.lat + (Math.random() - 0.5) * 0.01,
              lng: t.center.lng + (Math.random() - 0.5) * 0.01,
            },
            createdAt: pastDate,
          },
        });
      }
      logger.success(`Patrol Logs seeded for ${t.name}: ${t.patrolLogCount}`);
    }

    // =========================================================================
    // STEP 5: INCIDENTS (đủ status, đủ severity, đủ loại)
    // =========================================================================
    logger.info('Step 5/12: Incidents');

    for (const t of tenantDefs) {
      const staffList = tenantStaff[t.id];
      const supervisors = staffList.filter(s => ['supervisor', 'tenant-admin'].includes(s.role));
      const guards = staffList.filter(s => s.role === 'guard');
      const allActive = [...supervisors, ...guards];

      // Tạo mẫu cố định đủ mọi trạng thái
      const FIXED_INCIDENTS = [
        {
          type: 'INTRUSION', severity: 'CRITICAL', status: 'ESCALATED',
          description: 'Phát hiện người lạ xâm nhập khu vực cấm lúc 2:00 sáng, đã kích hoạt báo động.',
          daysAgoN: 1,
        },
        {
          type: 'FIRE_ALARM', severity: 'HIGH', status: 'RESOLVED',
          description: 'Báo cháy kích hoạt tại tầng hầm B2 do chập điện. Đã xử lý và reset hệ thống.',
          daysAgoN: 5, resolveDeltaHours: 3,
        },
        {
          type: 'CCTV_OFFLINE', severity: 'MEDIUM', status: 'INVESTIGATING',
          description: 'Camera giám sát góc A3 mất tín hiệu từ 18:00. Kỹ thuật viên đang kiểm tra.',
          daysAgoN: 2,
        },
        {
          type: 'SUSPICIOUS_PERSON', severity: 'MEDIUM', status: 'CLOSED',
          description: 'Người lạ lảng vảng khu vực bãi xe. Đã xác minh là thân nhân cư dân.',
          daysAgoN: 10, resolveDeltaHours: 1,
        },
        {
          type: 'PIPE_BROKEN', severity: 'LOW', status: 'REPORTED',
          description: 'Đường ống nước tầng 5 khu A bị rò rỉ nhỏ. Báo cáo chờ xử lý.',
          daysAgoN: 0,
        },
      ];

      let seededCount = 0;

      // Seed fixed incidents
      for (const inc of FIXED_INCIDENTS.slice(0, Math.min(FIXED_INCIDENTS.length, t.incidentCount))) {
        const reportedAt = daysAgo(inc.daysAgoN);
        const resolvedAt = inc.resolveDeltaHours
          ? addHours(reportedAt, inc.resolveDeltaHours)
          : null;
        const reporter = randomElement(allActive);
        const assignee = inc.status !== 'REPORTED' ? randomElement(supervisors) : null;

        await sys.incident.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            staffId: reporter.id,
            assignedToId: assignee?.id ?? null,
            type: inc.type,
            severity: inc.severity as any,
            severityWeight: inc.severity === 'CRITICAL' ? 4 : inc.severity === 'HIGH' ? 3 : inc.severity === 'MEDIUM' ? 2 : 1,
            description: inc.description,
            status: inc.status as any,
            reportedAt,
            investigatingAt: ['INVESTIGATING', 'ESCALATED', 'RESOLVED', 'CLOSED'].includes(inc.status)
              ? addHours(reportedAt, 0.5)
              : null,
            resolvedAt,
            closedAt: inc.status === 'CLOSED' ? resolvedAt : null,
            createdAt: reportedAt,
            updatedAt: resolvedAt || reportedAt,
          },
        });
        seededCount++;
      }

      // Seed random incidents để đủ số lượng
      for (let i = seededCount; i < t.incidentCount; i++) {
        const reportedAt = randomDate(daysAgo(30), daysAgo(1));
        const status = randomElement(INCIDENT_STATUSES);
        const resolvedAt = ['RESOLVED', 'CLOSED'].includes(status)
          ? addHours(reportedAt, randomInt(1, 24))
          : null;

        await sys.incident.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            staffId: randomElement(allActive).id,
            type: randomElement(INCIDENT_TYPES),
            severity: randomElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) as any,
            severityWeight: randomInt(1, 4),
            description: 'Phát hiện sự cố bất thường tại khu vực quản lý. Đang theo dõi xử lý.',
            status: status as any,
            reportedAt,
            resolvedAt,
            closedAt: status === 'CLOSED' ? resolvedAt : null,
            createdAt: reportedAt,
            updatedAt: resolvedAt || reportedAt,
          },
        });
      }

      logger.success(`Incidents seeded for ${t.name}: ${t.incidentCount}`);
    }

    // =========================================================================
    // STEP 6: TASKS
    // =========================================================================
    logger.info('Step 6/12: Tasks');

    const TASK_TEMPLATES = [
      { title: 'Kiểm tra PCCC khu vực A', priority: 'HIGH', desc: 'Kiểm tra bình cứu hỏa, lối thoát hiểm tầng trệt và hầm B1.' },
      { title: 'Tuần tra bãi xe tối', priority: 'MEDIUM', desc: 'Kiểm tra xe vãng lai, đảm bảo an ninh khu đỗ xe từ 22:00.' },
      { title: 'Kiểm tra camera khu B', priority: 'HIGH', desc: 'Rà soát toàn bộ camera giám sát khu B, báo hỏng nếu có.' },
      { title: 'Bàn giao ca sáng', priority: 'LOW', desc: 'Bàn giao ca với đầy đủ báo cáo sự cố trong đêm.' },
      { title: 'Kiểm tra cửa thoát hiểm', priority: 'HIGH', desc: 'Đảm bảo tất cả cửa thoát hiểm hoạt động tốt, không bị khóa.' },
      { title: 'Tuần tra tầng hầm B1 B2', priority: 'MEDIUM', desc: 'Kiểm tra ánh sáng, camera, và phương tiện đỗ xe.' },
      { title: 'Báo cáo nhật ký tuần tra', priority: 'LOW', desc: 'Hoàn thiện và nộp báo cáo nhật ký tuần tra cuối ngày.' },
      { title: 'Kiểm tra hệ thống báo động', priority: 'CRITICAL', desc: 'Test định kỳ toàn bộ hệ thống báo động khẩn cấp.' },
    ];

    for (const t of tenantDefs) {
      const staffList = tenantStaff[t.id];
      const guards = staffList.filter(s => ['guard', 'supervisor'].includes(s.role));

      for (let i = 0; i < t.taskCount; i++) {
        const tmpl = TASK_TEMPLATES[i % TASK_TEMPLATES.length];
        const createdAt = randomDate(daysAgo(30), daysAgo(1));
        const status = randomElement(['PENDING', 'IN_PROGRESS', 'COMPLETED']);

        await sys.task.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            title: `${tmpl.title} #${i + 1}`,
            description: tmpl.desc,
            status,
            priority: tmpl.priority,
            assigneeId: randomElement(guards).id,
            createdBy: staffList[0].id, // admin
            dueDate: new Date(createdAt.getTime() + randomInt(1, 7) * 86_400_000),
            createdAt,
            updatedAt: createdAt,
          },
        });
      }
      logger.success(`Tasks seeded for ${t.name}: ${t.taskCount}`);
    }

    // =========================================================================
    // STEP 7: ATTENDANCE RECORDS (7 ngày gần nhất)
    // =========================================================================
    logger.info('Step 7/12: Attendance Records');

    for (const t of tenantDefs) {
      const guards = tenantStaff[t.id].filter(s => ['guard', 'supervisor'].includes(s.role));

      for (const guard of guards) {
        for (let day = 0; day < 7; day++) {
          const checkInAt = new Date(daysAgo(day));
          checkInAt.setHours(7, randomInt(0, 30), 0, 0); // 7:00 - 7:30
          const lateMinutes = checkInAt.getMinutes(); // Trễ nếu sau 7:00

          const checkOutAt = new Date(checkInAt);
          checkOutAt.setHours(15, randomInt(0, 30), 0, 0); // 15:00 - 15:30

          const workedMinutes = Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000);

          await sys.attendanceRecord.create({
            data: {
              id: crypto.randomUUID(),
              tenantId: t.id,
              staffId: guard.id,
              type: 'CHECK_IN',
              location: { lat: t.center.lat, lng: t.center.lng },
              isValid: true,
              checkInAt,
              checkOutAt,
              workedMinutes,
              lateMinutes,
              earlyLeaveMinutes: 0,
              createdAt: checkInAt,
            },
          });
        }
      }
      logger.success(`Attendance Records seeded for ${t.name}`);
    }

    // =========================================================================
    // STEP 8: DISCIPLINARY ACTIONS
    // =========================================================================
    logger.info('Step 8/12: Disciplinary Actions');

    for (const t of tenantDefs) {
      const guards = tenantStaff[t.id].filter(s => s.role === 'guard');
      const actionCount = t.plan === PlanTier.PRO ? 8 : 2;

      for (let i = 0; i < actionCount; i++) {
        const guard = randomElement(guards);
        const occurredAt = randomDate(daysAgo(60), daysAgo(1));

        await sys.disciplinaryAction.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            staffId: guard.id,
            type: randomElement(DISCIPLINARY_TYPES),
            description: randomElement([
              'Đến muộn hơn 30 phút so với giờ quy định.',
              'Mặc đồng phục không đúng quy cách khi làm việc.',
              'Rời bỏ vị trí trực mà không có sự cho phép.',
              'Sử dụng điện thoại cá nhân trong giờ trực.',
              'Bỏ qua điểm tuần tra mà không ghi nhận lý do.',
            ]),
            severity: randomElement(['LOW', 'MEDIUM', 'HIGH']),
            actionTaken: randomElement([
              'Nhắc nhở bằng miệng',
              'Cảnh cáo bằng văn bản',
              'Phạt hành chính 200.000đ',
              null,
            ]),
            occurredAt,
            createdAt: occurredAt,
            updatedAt: occurredAt,
          },
        });
      }
      logger.success(`Disciplinary Actions seeded for ${t.name}: ${actionCount}`);
    }

    // =========================================================================
    // STEP 9: STAFF PERFORMANCE METRICS (3 tháng gần nhất)
    // =========================================================================
    logger.info('Step 9/12: Staff Performance Metrics');

    for (const t of tenantDefs) {
      const guards = tenantStaff[t.id].filter(s => s.role !== 'tenant-admin');

      for (const staff of guards) {
        for (let m = 0; m < 3; m++) {
          const period = periodStr(m);
          const exists = await sys.staffPerformanceMetric.findUnique({
            where: { tenantId_staffId_period: { tenantId: t.id, staffId: staff.id, period } },
          });
          if (exists) continue;

          await sys.staffPerformanceMetric.create({
            data: {
              id: crypto.randomUUID(),
              tenantId: t.id,
              staffId: staff.id,
              period,
              trustScore: randomInt(60, 100) / 10 * 10, // 60-100
              attendanceRate: randomInt(80, 100) / 100,
              missedPoints: randomInt(0, 5),
              sosCount: randomInt(0, 2),
            },
          });
        }
      }
      logger.success(`Performance Metrics seeded for ${t.name}`);
    }

    // =========================================================================
    // STEP 10: VENDORS + CONTRACTS + COMPLIANCE SCORES (chỉ PRO)
    // =========================================================================
    logger.info('Step 10/12: Vendors + Contracts + Compliance Scores');

    for (const t of tenantDefs) {
      if (t.plan !== PlanTier.PRO) continue;

      const VENDOR_DATA = [
        { name: 'Công ty TNHH Bảo vệ An Phúc', contactPerson: 'Nguyễn Văn An', score: 92.5 },
        { name: 'Dịch vụ Bảo vệ Sài Gòn Pro', contactPerson: 'Trần Thị Bình', score: 78.0 },
      ];

      for (const vd of VENDOR_DATA) {
        const vendorId = crypto.randomUUID();
        await sys.vendor.create({
          data: {
            id: vendorId,
            tenantId: t.id,
            name: vd.name,
            address: randomElement(['Quận 1, TP.HCM', 'Quận 7, TP.HCM', 'Quận 9, TP.HCM']),
            managerName: generateVNName(),
            contactPerson: vd.contactPerson,
            email: `contact@${vd.name.toLowerCase().replace(/\s+/g, '').replace(/[^\x00-\x7F]/g, '')}.vn`.slice(0, 50),
            phone: generatePhone(),
            score: vd.score,
            status: 'active',
          },
        });

        // Contract
        const contractId = crypto.randomUUID();
        const startDate = daysAgo(180);
        const endDate = new Date(Date.now() + 180 * 86_400_000);

        await sys.contract.create({
          data: {
            id: contractId,
            tenantId: t.id,
            vendorId,
            siteName: t.name,
            startDate,
            endDate,
            value: randomInt(50, 200) * 1_000_000, // 50M - 200M VND
            currency: 'VND',
            guardCountPerShift: randomInt(3, 8),
            status: 'active',
            slaConfig: {
              minPatrolRate: 0.9,
              maxIncidentResponseMinutes: 15,
              penaltyPerMissingGuard: 500000,
            },
          },
        });

        // Compliance Scores (3 tháng)
        for (let m = 0; m < 3; m++) {
          const month = monthStr(m);
          await sys.complianceScore.create({
            data: {
              id: crypto.randomUUID(),
              tenantId: t.id,
              contractId,
              vendorId,
              month,
              patrolRate: randomInt(80, 100) / 100,
              incidentRate: randomInt(0, 20) / 100,
              disciplineRate: randomInt(0, 10) / 100,
              totalScore: randomInt(70, 99),
              violationsCount: randomInt(0, 5),
            },
          });
        }
      }
      logger.success(`Vendors + Contracts seeded for ${t.name}`);
    }

    // =========================================================================
    // STEP 11: SHIFT SCHEDULES + COMPLIANCE ITEMS (chỉ PRO)
    // =========================================================================
    logger.info('Step 11/12: Shift Schedules + Compliance Items');

    for (const t of tenantDefs) {
      if (t.plan !== PlanTier.PRO) continue;

      // Lấy contractId vừa tạo
      const contracts = await sys.contract.findMany({
        where: { tenantId: t.id },
        select: { id: true },
      });
      if (contracts.length === 0) continue;
      const contractId = contracts[0].id;

      const SHIFTS = [
        { type: 'MORNING', start: '06:00', end: '14:00' },
        { type: 'AFTERNOON', start: '14:00', end: '22:00' },
        { type: 'NIGHT', start: '22:00', end: '06:00' },
      ];

      for (let day = 0; day < 7; day++) {
        const date = dateStr(day);
        for (const shift of SHIFTS) {
          const shiftId = crypto.randomUUID();
          const required = randomInt(2, 5);
          const actual = required - randomInt(0, 1); // Đôi khi thiếu 1 người

          await sys.shiftSchedule.create({
            data: {
              id: shiftId,
              tenantId: t.id,
              contractId,
              date,
              shiftType: shift.type,
              startTime: shift.start,
              endTime: shift.end,
              requiredCount: required,
              positionName: randomElement(['Sảnh chính', 'Cổng vào', 'Bãi xe', 'Hầm B1']),
              siteId: t.id,
            },
          });

          // Compliance item
          const missing = required - actual;
          await sys.shiftComplianceItem.create({
            data: {
              id: crypto.randomUUID(),
              tenantId: t.id,
              shiftScheduleId: shiftId,
              contractId,
              date,
              requiredCount: required,
              actualCount: actual,
              missingCount: missing,
              excessCount: 0,
              complianceRate: actual / required,
              penaltyAmount: missing * 500000,
              status: missing > 0 ? 'PENALIZED' : 'RESOLVED',
              notes: missing > 0 ? `Thiếu ${missing} nhân viên ca ${shift.type}` : null,
            },
          });
        }
      }
      logger.success(`Shift Schedules seeded for ${t.name}`);
    }

    // =========================================================================
    // STEP 12A: MONTHLY STRATEGY INSIGHTS (AI Watchdog — 3 tháng)
    // =========================================================================
    logger.info('Step 12/12: Notifications, News, Insights, Configs');

    for (const t of tenantDefs) {
      for (let m = 0; m < 3; m++) {
        const month = monthStr(m);
        const exists = await sys.monthlyStrategyInsight.findFirst({
          where: { tenantId: t.id, month },
        });
        if (exists) continue;

        await sys.monthlyStrategyInsight.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            month,
            summary: `Tháng ${month}: Hệ thống vận hành ổn định. Phát hiện ${randomInt(1, 5)} điểm rủi ro cần chú ý, chủ yếu tập trung ở ca đêm và khu vực hầm xe.`,
            fraudRiskScore: randomInt(5, 35) / 10,
            fraudDetails: {
              gps_spoofing_attempts: randomInt(0, 3),
              fast_checkin_count: randomInt(0, 5),
              missed_checkpoints: randomInt(0, 8),
            },
            efficiencyScore: randomInt(70, 95) / 10,
            topPerformers: [
              { name: generateVNName(), score: randomInt(85, 100) },
              { name: generateVNName(), score: randomInt(80, 90) },
            ],
            criticalIssues: [
              { issue: 'Tỷ lệ tuần tra ca đêm thấp hơn SLA 5%', severity: 'MEDIUM' },
            ],
            recommendations: [
              'Tăng cường giám sát bãi xe ca đêm thứ 6, 7.',
              'Bổ sung 1 guard cho ca sáng khu sảnh B.',
            ],
          },
        });
      }
    }

    // =========================================================================
    // STEP 12B: NOTIFICATIONS
    // =========================================================================
    for (const t of tenantDefs) {
      const adminId = `staff-admin-${t.subdomain}`;
      const NOTIF_DATA = [
        { title: '🚨 Sự cố mới cần xử lý', message: 'Camera khu vực B3 mất tín hiệu. Vui lòng kiểm tra ngay.', type: 'WARNING', status: 'UNREAD' },
        { title: '✅ Tuần tra ca sáng hoàn thành', message: 'Ca sáng đã hoàn thành 100% checkpoint. Không ghi nhận sự cố.', type: 'INFO', status: 'READ' },
        { title: '⚠️ Nhân viên đến muộn', message: 'Nguyễn Văn A đến muộn 25 phút ca chiều ngày hôm nay.', type: 'WARNING', status: 'UNREAD' },
        { title: '📊 Báo cáo tháng đã sẵn sàng', message: 'Báo cáo tổng hợp tháng này đã được AI Watchdog tạo xong.', type: 'INFO', status: 'READ' },
      ];

      for (const n of NOTIF_DATA) {
        await sys.notification.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            userId: adminId,
            title: n.title,
            message: n.message,
            type: n.type,
            status: n.status,
            createdAt: randomDate(daysAgo(7), new Date()),
          },
        });
      }
    }

    // =========================================================================
    // STEP 12C: NEWS (Platform-level)
    // =========================================================================
    const NEWS_DATA = [
      {
        title: 'AI Watchdog 2.0: giám sát tuần tra bảo vệ bằng AI cho tòa nhà và khu đô thị',
        slug: 'scmd-pro-ai-watchdog-2-0',
        excerpt: 'AI Watchdog 2.0 giúp đội vận hành phát hiện bất thường tuần tra, sai lệch GPS và rủi ro SLA theo thời gian thực trong SCMD Pro.',
        seoTitle: 'AI Watchdog 2.0 cho quản lý tuần tra bảo vệ | SCMD Pro',
        seoDescription: 'Tìm hiểu AI Watchdog 2.0 của SCMD Pro: phân tích ca trực, phát hiện gian lận GPS, cảnh báo rủi ro SLA và tối ưu lịch tuần tra bảo vệ.',
        thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&h=675&auto=format&fit=crop',
        content: `# AI Watchdog 2.0 trong SCMD Pro là gì?

AI Watchdog 2.0 là lớp phân tích thông minh của SCMD Pro dành cho nghiệp vụ quản lý bảo vệ, tuần tra an ninh và vận hành hiện trường. Thay vì chỉ ghi nhận log sau khi ca trực kết thúc, hệ thống liên tục đối chiếu dữ liệu GPS, checkpoint QR, thời gian phản hồi sự cố và lịch phân công để phát hiện rủi ro ngay trong ca.

## Bài toán vận hành mà AI Watchdog giải quyết

Các ban quản lý tòa nhà, khu đô thị, nhà máy và chuỗi bán lẻ thường gặp 4 vấn đề lớn: nhân sự quét điểm không đúng vị trí, bỏ lượt tuần tra, phản hồi sự cố chậm và thiếu dữ liệu khách quan khi đánh giá chất lượng dịch vụ bảo vệ. Nếu chỉ dùng bảng chấm công hoặc báo cáo thủ công, đội quản lý thường phát hiện sai lệch quá muộn.

Với AI Watchdog 2.0, SCMD Pro chuyển dữ liệu vận hành thành tín hiệu kiểm soát rủi ro:

- Phát hiện đường đi bất thường so với tuyến tuần tra đã cấu hình.
- Cảnh báo checkpoint có GPS lệch quá ngưỡng cho phép.
- Nhận diện ca trực có tỷ lệ hoàn thành thấp hoặc phản hồi sự cố chậm.
- Gợi ý tối ưu lịch tuần tra dựa trên mật độ sự kiện và khung giờ rủi ro.

## Cơ chế phân tích dữ liệu trong SCMD Pro

AI Watchdog không thay thế quy trình vận hành hiện trường. Công cụ này đóng vai trò lớp giám sát thứ hai, chạy trên dữ liệu đã được xác thực từ PostgreSQL, bao gồm patrol log, incident, checkpoint, attendance và audit log. Mỗi tín hiệu đều được gắn tenant, thời gian máy chủ và traceId để đảm bảo khả năng truy vết.

Các cảnh báo quan trọng được đưa vào dashboard vận hành để supervisor xử lý theo mức độ ưu tiên. Với tenant quy mô lớn, dữ liệu có thể được gom theo ca, khu vực, nhân sự hoặc loại sự cố để giúp ban quản lý nhìn thấy xu hướng thay vì chỉ xem từng log rời rạc.

## Lợi ích cho doanh nghiệp bảo vệ và ban quản lý

AI Watchdog 2.0 giúp giảm phụ thuộc vào báo cáo thủ công, tăng tính minh bạch giữa chủ đầu tư và đơn vị dịch vụ bảo vệ. Doanh nghiệp có thể đo chất lượng vận hành bằng dữ liệu: tỷ lệ hoàn thành checkpoint, thời gian phản hồi sự cố, tần suất cảnh báo GPS và số lần vi phạm SLA theo khu vực.

## Khi nào nên bật AI Watchdog 2.0?

Tính năng phù hợp với các mô hình có nhiều ca trực, nhiều điểm tuần tra hoặc yêu cầu nghiệm thu dịch vụ bảo vệ minh bạch: khu căn hộ, trung tâm thương mại, nhà máy, kho vận, bệnh viện, trường học và chuỗi cơ sở bán lẻ.

Để đạt hiệu quả cao nhất, tenant nên chuẩn hóa checkpoint, phân quyền supervisor rõ ràng, bật ghi nhận GPS và yêu cầu nhân sự cập nhật sự cố bằng bằng chứng ảnh hoặc ghi chú hiện trường.`,
        category: 'Tính năng',
        tags: ['AI Watchdog', 'quản lý tuần tra bảo vệ', 'SCMD Pro', 'GPS', 'SLA vận hành'],
      },
      {
        title: 'Hướng dẫn thiết lập checkpoint GPS chống gian lận tuần tra trong SCMD Pro',
        slug: 'huong-dan-checkpoint-gps-chong-gian-lan',
        excerpt: 'Quy trình cấu hình checkpoint QR và GPS trong SCMD Pro để giảm gian lận tuần tra, kiểm soát sai lệch vị trí và nâng chất lượng nghiệm thu ca trực.',
        seoTitle: 'Thiết lập checkpoint GPS chống gian lận tuần tra | SCMD Pro',
        seoDescription: 'Hướng dẫn cấu hình checkpoint GPS, QR code, bán kính xác thực và quy trình kiểm tra sai lệch vị trí cho hệ thống tuần tra bảo vệ SCMD Pro.',
        thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1200&h=675&auto=format&fit=crop',
        content: `# Vì sao checkpoint GPS quyết định độ tin cậy của tuần tra?

Checkpoint là điểm kiểm soát trung tâm trong nghiệp vụ tuần tra bảo vệ. Nếu checkpoint được đặt sai, thiếu bán kính xác thực hoặc không gắn đúng tuyến, dữ liệu quét QR có thể tạo cảm giác hệ thống đang hoạt động nhưng thực tế không phản ánh đúng vị trí nhân sự.

Trong SCMD Pro, checkpoint GPS được thiết kế để kết hợp 3 yếu tố: QR code, tọa độ thực địa và ngưỡng sai lệch vị trí. Khi nhân viên quét điểm, hệ thống đối chiếu dữ liệu thiết bị với cấu hình checkpoint để xác định lượt tuần tra hợp lệ, đáng ngờ hoặc cần supervisor kiểm tra lại.

## Quy trình thiết lập checkpoint chuẩn

Để triển khai hiệu quả, đội quản lý nên thực hiện theo quy trình sau:

1. Khảo sát tuyến tuần tra thực tế trước khi nhập dữ liệu.
2. Đặt checkpoint tại vị trí có ý nghĩa kiểm soát: cổng, sảnh, phòng kỹ thuật, tầng hầm, kho hoặc khu vực rủi ro cao.
3. Ghi nhận tọa độ GPS tại đúng điểm dán QR, tránh lấy tọa độ từ bản đồ ước lượng.
4. Cấu hình bán kính xác thực theo môi trường: khu ngoài trời có thể rộng hơn, khu trong nhà nên kiểm soát chặt hơn.
5. Kiểm thử bằng thiết bị thật ở nhiều khung giờ để phát hiện điểm có tín hiệu GPS yếu.

## Ngưỡng sai lệch GPS nên đặt bao nhiêu?

SCMD Pro khuyến nghị dùng ngưỡng 50m làm mốc cảnh báo mặc định cho tình huống sai lệch GPS đáng ngờ. Tuy nhiên, con số này cần được hiệu chỉnh theo địa hình. Tầng hầm, lõi thang máy và khu vực nhiều vật cản có thể tạo sai số cao hơn so với sân nội khu hoặc cổng chính.

Quan điểm vận hành đúng là không dùng GPS như bằng chứng duy nhất. Hệ thống nên kết hợp thêm QR code, timestamp máy chủ, lịch phân công và bằng chứng ảnh trong các điểm nhạy cảm.

## Cách giảm gian lận tuần tra

- QR code cần được quản lý vòng đời, thay mới khi có dấu hiệu sao chép.
- Tuyến tuần tra phải có thứ tự logic để phát hiện việc quét gom.
- Các lượt quét ngoài bán kính cần được gắn cờ suspicious thay vì tự động hợp lệ.
- Supervisor cần có dashboard lọc theo nhân sự, ca trực, điểm lỗi và khu vực.
- Audit log phải giữ lại lịch sử thay đổi checkpoint để phục vụ truy vết.

Khi triển khai đúng, checkpoint GPS giúp SCMD Pro trở thành nguồn dữ liệu tin cậy cho nghiệm thu dịch vụ bảo vệ, đánh giá SLA và xử lý tranh chấp vận hành.`,
        category: 'Hướng dẫn',
        tags: ['checkpoint GPS', 'QR tuần tra', 'chống gian lận', 'quản lý bảo vệ', 'SCMD ERP'],
      },
      {
        title: 'Bảo mật multi-tenant trong SCMD Pro: RLS, RBAC và Zero Trust cho dữ liệu vận hành',
        slug: 'cap-nhat-bao-mat-multi-tenant-v4-38',
        excerpt: 'SCMD Pro bảo vệ dữ liệu nhiều khách hàng bằng PostgreSQL RLS, RBAC, kiểm tra tenant context và chiến lược Zero Trust ở mọi điểm vào ra.',
        seoTitle: 'Bảo mật multi-tenant bằng RLS và RBAC | SCMD Pro',
        seoDescription: 'Phân tích kiến trúc bảo mật multi-tenant của SCMD Pro: PostgreSQL RLS, RBAC, tenant isolation, audit log và Zero Trust cho dữ liệu vận hành.',
        thumbnail: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?q=80&w=1200&h=675&auto=format&fit=crop',
        content: `# Multi-tenant security là nền móng của SCMD Pro

SCMD Pro phục vụ nhiều doanh nghiệp, ban quản lý và đơn vị bảo vệ trên cùng một nền tảng SaaS. Vì vậy, bảo mật multi-tenant không phải là tính năng bổ sung mà là nguyên tắc kiến trúc bắt buộc. Mỗi tenant phải được cô lập dữ liệu, phân quyền rõ ràng và có khả năng truy vết khi xảy ra thay đổi quan trọng.

## RLS bảo vệ dữ liệu ngay tại PostgreSQL

Row-Level Security giúp giới hạn dữ liệu theo tenant ở tầng cơ sở dữ liệu. Trong kiến trúc SCMD Pro, business logic được lưu tại PostgreSQL như Single Source of Truth, còn ứng dụng chỉ được truy cập dữ liệu qua tenant context hợp lệ. Điều này giảm rủi ro lộ dữ liệu chéo tenant khi code phát sinh lỗi ở tầng controller hoặc repository.

Nguyên tắc vận hành là mọi truy vấn nghiệp vụ phải đi qua lớp tenant-aware database client. Các truy vấn hệ thống chỉ dành cho tác vụ platform-level và phải được kiểm soát bằng quyền Super Admin cùng audit log.

## RBAC kiểm soát quyền theo vai trò

Không phải người dùng nào trong một tenant cũng được xem cùng một dữ liệu. SCMD Pro dùng RBAC để phân tách vai trò như tenant admin, supervisor, guard và technician. Mỗi vai trò chỉ được thực hiện nhóm thao tác phù hợp với trách nhiệm vận hành.

Ví dụ, nhân viên bảo vệ có thể ghi nhận tuần tra và báo cáo sự cố, supervisor có thể duyệt hoặc điều phối, còn tenant admin quản lý cấu hình nhân sự, checkpoint và báo cáo. Cách tách quyền này giảm blast radius nếu một tài khoản bị lộ.

## Zero Trust tại entry và exit point

SCMD Pro áp dụng tư duy Zero Trust: không tin dữ liệu đầu vào chỉ vì nó đến từ frontend, thiết bị di động hoặc phiên đăng nhập hợp lệ. API cần validate payload bằng schema, kiểm tra RBAC, xác nhận tenant context và trả lỗi đã được làm sạch để không lộ stack trace.

Ở chiều xuất dữ liệu, báo cáo PDF, dữ liệu realtime và API public cũng phải giữ nguyên nguyên tắc tối thiểu quyền. Token in ấn, watcher token hoặc đường dẫn public không được vượt phạm vi tài nguyên được cấp.

## Audit log và observability

Bảo mật vận hành không dừng ở ngăn chặn. Hệ thống cần biết ai đã làm gì, lúc nào, trên tenant nào và kết quả ra sao. SCMD Pro gắn audit log với các hành động nhạy cảm như cập nhật nhân sự, thay đổi checkpoint, xử lý sự cố và quản trị gói dịch vụ.

Kết hợp với OpenTelemetry traceId, đội kỹ thuật có thể điều tra sự cố xuyên suốt từ Express, Prisma đến background worker mà không phải suy đoán thủ công.

## Giá trị chiến lược

Với khách hàng doanh nghiệp, niềm tin vào dữ liệu quan trọng không kém tính năng. Kiến trúc RLS, RBAC và Zero Trust giúp SCMD Pro đáp ứng yêu cầu mở rộng SaaS, giảm rủi ro pháp lý khi phục vụ nhiều khách hàng và tạo nền tảng vững chắc cho các gói Pro, Max hoặc white-label trong tương lai.`,
        category: 'Bảo mật',
        tags: ['multi-tenant security', 'PostgreSQL RLS', 'RBAC', 'Zero Trust', 'SCMD Pro'],
      },
    ];

    for (const news of NEWS_DATA) {
      await sys.news.upsert({
        where: { slug: news.slug },
        update: {
          ...news,
          status: 'published',
          author: 'SCMD Pro Team',
        },
        create: {
          id: crypto.randomUUID(),
          ...news,
          status: 'published',
          author: 'SCMD Pro Team',
          publishedAt: randomDate(daysAgo(30), daysAgo(1)),
        },
      });
    }

    // =========================================================================
    // STEP 12D: FEEDBACK
    // =========================================================================
    for (const t of tenantDefs) {
      const adminId = `staff-admin-${t.subdomain}`;
      await sys.feedback.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: t.id,
          userId: adminId,
          title: 'Giao diện báo cáo cần cải thiện filter theo ngày',
          description: 'Khi lọc báo cáo theo ngày, hệ thống load khá chậm. Mong muốn thêm lazy loading.',
          severity: 'LOW',
          type: 'FEATURE_REQUEST',
          status: 'OPEN',
          createdAt: daysAgo(3),
        },
      });
    }

    // =========================================================================
    // STEP 12E: SYSTEM CONFIGS
    // =========================================================================
    const ROLE_PERMISSIONS = {
      'super-admin': [
        'staff:read', 'staff:write', 'checkpoint:read', 'checkpoint:write',
        'log:read', 'log:write', 'report:generate', 'tenant:manage',
        'system:manage', 'task:read', 'task:write', 'vendor:read', 'vendor:write',
        'billing:read', 'billing:write',
      ],
      'tenant-admin': [
        'staff:read', 'staff:write', 'checkpoint:read', 'checkpoint:write',
        'log:read', 'log:write', 'report:generate', 'task:read', 'task:write',
        'vendor:read', 'vendor:write',
      ],
      'supervisor': [
        'staff:read', 'checkpoint:read', 'log:read', 'log:write',
        'report:generate', 'task:read', 'task:write',
      ],
      'technician': ['checkpoint:read', 'checkpoint:write', 'log:read', 'task:read'],
      'guard': ['checkpoint:read', 'log:write', 'log:read', 'task:read'],
    };

    await sys.systemConfig.upsert({
      where: { key: 'role_permissions' },
      update: { value: ROLE_PERMISSIONS },
      create: { id: 'config-role-permissions', key: 'role_permissions', value: ROLE_PERMISSIONS },
    });

    await sys.systemConfig.upsert({
      where: { key: 'ai_quota_config' },
      update: { value: { monthlyLimit: 1000, warningThreshold: 800 } },
      create: {
        id: 'config-ai-quota',
        key: 'ai_quota_config',
        value: { monthlyLimit: 1000, warningThreshold: 800 },
      },
    });

    await sys.systemConfig.upsert({
      where: { key: 'STORAGE_CONFIG' },
      update: { value: { type: 'r2', enabled: true } },
      create: {
        id: 'config-storage',
        key: 'STORAGE_CONFIG',
        value: { type: 'r2', enabled: true },
      },
    });

    logger.success('System Configs seeded.');
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  const getMasked = (envKey: string) =>
    process.env[envKey] ? '****** (ENV)' : 'MISSING - seed requires ENV';

  logger.success(`
╔══════════════════════════════════════════════════════════════╗
║         🎉 STANDARD SEED HOÀN THÀNH — TÀI KHOẢN TEST        ║
╠══════════════════════════════════════════════════════════════╣
║  SUPER ADMIN                                                 ║
║    Workspace : system         Role: super-admin              ║
║    Username  : superadmin                                    ║
║    Password  : ${getMasked('SEED_SUPERADMIN_PASSWORD').padEnd(43)}║
╠══════════════════════════════════════════════════════════════╣
║  VINHOMES (PRO) — 15 staff, 20 checkpoints, đầy đủ data     ║
║    Workspace : vinhomes        Role: tenant-admin            ║
║    Username  : admin_vinhomes                                ║
║    Password  : ${getMasked('SEED_TENANT_ADMIN_PASSWORD').padEnd(43)}║
║    Guard ex  : guard_vinhomes_1  (pass same as above)        ║
║    Supervisor: supervisor_vinhomes_1                         ║
╠══════════════════════════════════════════════════════════════╣
║  AN HỘI (FREE) — 3 staff, 5 checkpoints                     ║
║    Workspace : anhoi           Role: tenant-admin            ║
║    Username  : admin_anhoi                                   ║
║    Password  : ${getMasked('SEED_TENANT_ADMIN_PASSWORD').padEnd(43)}║
╚══════════════════════════════════════════════════════════════╝
`);
}
