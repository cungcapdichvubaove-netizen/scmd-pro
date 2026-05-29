/**
 * SCMD Pro — Stress Seed (Tier: Stress)
 * ======================================
 * Mục tiêu: Tạo khối lượng dữ liệu lớn để kiểm thử hiệu năng hệ thống.
 *
 * Volume (v2 — nâng cấp):
 *  - 50  Guards mới (tổng ~65 staff sau standard)
 *  - 500 Checkpoints mới (tổng ~520)
 *  - 20.000 Patrol Logs (batch 1.000, 60 ngày gần nhất)
 *  - 500 CheckpointBenchmarkSession (mô phỏng Admin Benchmark Recorder)
 *  - 1.000 PatrolBenchmarkDeviation (AI deviation analysis data)
 *  - 200 Incidents ngẫu nhiên
 *  - Cập nhật benchmark fields trên Checkpoints đã seed
 *
 * Chạy sau standard seed:
 *   npx tsx prisma/seeders/index.ts --tier=stress --reset
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

// ─── Constants ────────────────────────────────────────────────────────────────

const STRESS_GUARD_COUNT      = 50;
const STRESS_CHECKPOINT_COUNT = 500;
const STRESS_PATROL_LOG_COUNT = 20_000;
const STRESS_BENCHMARK_SESSION_COUNT = 500;
const STRESS_DEVIATION_COUNT  = 1_000;
const STRESS_INCIDENT_COUNT   = 200;

const PATROL_LOG_BATCH_SIZE   = 1_000;
const DEVIATION_BATCH_SIZE    = 200;

const INCIDENT_TYPES = [
  'CCTV_OFFLINE', 'INTRUSION', 'FIRE_ALARM', 'PIPE_BROKEN',
  'SUSPICIOUS_PERSON', 'DOOR_OPEN', 'THEFT', 'VANDALISM',
  'MEDICAL_EMERGENCY', 'POWER_FAILURE',
];

const VIOLATION_TYPES = [
  'TRAVEL_TOO_FAST', 'TRAVEL_TOO_SLOW',
  'WORK_TOO_SHORT', 'WORK_TOO_LONG',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

/** Tính % deviation.
 * LƯU Ý: is_compliant là GENERATED ALWAYS STORED column trong DB
 * → KHÔNG được insert thủ công vào Prisma payload
 */
function calcDeviation(actual: number, expected: number, tolerancePct: number) {
  if (expected === 0) return { pct: 0, compliant: true };
  const pct = Math.abs((actual - expected) / expected) * 100;
  return { pct: Math.round(pct * 100) / 100, compliant: pct <= tolerancePct };
}

/** Chuyển số JS thành string để Prisma Decimal field nhận đúng */
function toDecimalStr(n: number): string {
  return n.toFixed(2);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runStressSeed() {
  logger.step('Seeding Stress Data (v2 — High Volume)');

  const tId     = GLOBAL_CONSTANTS.VINHOMES_TENANT_ID;
  const center  = GLOBAL_CONSTANTS.VINHOMES_CENTER;
  const guardHash = await bcrypt.hash(GLOBAL_CONSTANTS.DEFAULT_GUARD_PASSWORD, GLOBAL_CONSTANTS.SALT_ROUNDS);

  await db.withTenant('SYSTEM', async (sys) => {

    // =========================================================================
    // STEP S1: 50 GUARDS MỚI
    // =========================================================================
    logger.info(`Step S1: Tạo ${STRESS_GUARD_COUNT} Guards bổ sung...`);

    const stressStaffIds: string[] = [];
    for (let i = 1; i <= STRESS_GUARD_COUNT; i++) {
      const un = `stress_guard_${i}`;
      const g = await sys.staff.upsert({
        where: { username: un },
        update: { password: guardHash },
        create: {
          id: crypto.randomUUID(),
          tenantId: tId,
          username: un,
          email: `${un}@vinhomes.scmd.pro`,
          password: guardHash,
          fullName: generateVNName(),
          phone: generatePhone(),
          role: 'guard',
          status: 'active',
          tokenVersion: 1,
          qualifications: randomInt(0, 1) === 1
            ? [`Chứng chỉ bảo vệ hạng ${randomInt(1, 3)}`]
            : [],
          idNumber: generateIdNumber(),
        },
      });
      stressStaffIds.push(g.id);
    }
    logger.success(`S1: ${STRESS_GUARD_COUNT} Stress Guards seeded.`);

    // Lấy toàn bộ staff IDs của tenant (bao gồm từ standard seed)
    const allStaff = await sys.staff.findMany({
      where: { tenantId: tId },
      select: { id: true },
    });
    const allStaffIds = allStaff.map((s: { id: string }) => s.id);

    // =========================================================================
    // STEP S2: 500 CHECKPOINTS MỚI
    // =========================================================================
    logger.info(`Step S2: Tạo ${STRESS_CHECKPOINT_COUNT} Checkpoints bổ sung...`);

    const stressCpIds: string[] = [];
    for (let i = 0; i < STRESS_CHECKPOINT_COUNT; i++) {
      const cpId  = crypto.randomUUID();
      const coord = generateCoordinates(center.lat, center.lng, 3.0); // bán kính rộng hơn 3km

      // Benchmark fields được set ngay tại creation để S4 có thể dùng
      const benchmarkTravelTime   = randomInt(120, 600);  // 2–10 phút (giây)
      const benchmarkWorkDuration = randomInt(30, 180);   // 30s–3 phút
      const benchmarkTolerancePct = randomElement([10, 15, 20, 25]);

      await sys.$executeRawUnsafe(
        `INSERT INTO "checkpoints"
          (id, tenant_id, name, location, qr_hash, status,
           benchmark_travel_time, benchmark_work_duration,
           benchmark_tolerance_pct, benchmark_session_count,
           created_at, updated_at)
         VALUES ($1, $2, $3,
                 ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
                 $6, 'active',
                 $7, $8, $9, 0,
                 NOW(), NOW())
         ON CONFLICT (id) DO NOTHING;`,
        cpId, tId, `Stress CP-${String(i + 1).padStart(4, '0')}`,
        coord.lng, coord.lat,
        crypto.randomUUID(),
        benchmarkTravelTime, benchmarkWorkDuration, benchmarkTolerancePct,
      );
      stressCpIds.push(cpId);
    }
    logger.success(`S2: ${STRESS_CHECKPOINT_COUNT} Stress Checkpoints seeded.`);

    // Lấy toàn bộ checkpoints của tenant (bao gồm từ standard seed)
    const allCpRows = await (sys.$queryRawUnsafe(
      `SELECT id FROM checkpoints WHERE tenant_id = $1`,
      tId,
    ) as Promise<{ id: string }[]>);
    const allCpIds = allCpRows.map((r: { id: string }) => r.id);

    // =========================================================================
    // STEP S3: 20.000 PATROL LOGS
    // =========================================================================
    logger.info(`Step S3: Tạo ${STRESS_PATROL_LOG_COUNT.toLocaleString()} Patrol Logs (batch ${PATROL_LOG_BATCH_SIZE})...`);

    const now = new Date();
    const sixtyDaysAgo = daysAgo(60);
    let totalLogs = 0;

    for (let batch = 0; batch < STRESS_PATROL_LOG_COUNT; batch += PATROL_LOG_BATCH_SIZE) {
      const batchSize = Math.min(PATROL_LOG_BATCH_SIZE, STRESS_PATROL_LOG_COUNT - batch);
      const logBatch = [];

      for (let i = 0; i < batchSize; i++) {
        const isSuspicious = randomInt(0, 14) === 0; // ~7% flag
        const travelTime   = randomInt(60, 900);     // giây
        const workDuration = randomInt(15, 300);

        logBatch.push({
          id: crypto.randomUUID(),
          tenantId: tId,
          staffId: randomElement(allStaffIds),
          checkpointId: randomElement(allCpIds),
          metadata: {
            gpsAccuracy: randomInt(3, 120),
            suspicious: isSuspicious,
            travelTime,
            workDuration,
            notes: isSuspicious ? 'GPS deviation detected' : randomElement(['An toàn', 'Bình thường', '']),
            lat: center.lat + (Math.random() - 0.5) * 0.05,
            lng: center.lng + (Math.random() - 0.5) * 0.05,
          },
          createdAt: randomDate(sixtyDaysAgo, now),
        });
      }

      await sys.patrolLog.createMany({ data: logBatch });
      totalLogs += batchSize;

      if (totalLogs % 5_000 === 0) {
        logger.info(`  → ${totalLogs.toLocaleString()} / ${STRESS_PATROL_LOG_COUNT.toLocaleString()} logs...`);
      }
    }
    logger.success(`S3: ${STRESS_PATROL_LOG_COUNT.toLocaleString()} Patrol Logs seeded.`);

    // =========================================================================
    // STEP S4: 500 BENCHMARK SESSIONS (Admin Benchmark Recorder)
    // =========================================================================
    // Mỗi CheckpointBenchmarkSession đại diện cho 1 lần Admin đi thực địa
    // để ghi nhận thời gian đi đến (travelTime) và thời gian làm việc tại điểm (workDuration).
    // Sau N sessions, hệ thống tính benchmark trung bình và cập nhật checkpoint.
    // =========================================================================
    logger.info(`Step S4: Tạo ${STRESS_BENCHMARK_SESSION_COUNT} Benchmark Sessions...`);

    // Admin IDs để làm recordedBy — dùng tenant-admin + supervisors
    const adminStaff = await sys.staff.findMany({
      where: {
        tenantId: tId,
        role: { in: ['tenant-admin', 'supervisor'] },
      },
      select: { id: true },
    });
    const adminIds = adminStaff.map((s: { id: string }) => s.id);
    if (adminIds.length === 0) adminIds.push(...allStaffIds.slice(0, 1));

    // Dùng stress checkpoints vì chúng có benchmark fields sẵn
    const sessionCpSample = stressCpIds.slice(0, 100); // lấy 100 cp đầu để có nhiều sessions/cp
    const cpSessionMap: Record<string, number[]> = {}; // cpId → [travelTimes]

    for (let i = 0; i < STRESS_BENCHMARK_SESSION_COUNT; i++) {
      const cpId        = randomElement(sessionCpSample);
      const travelTime  = randomInt(90, 720);   // giây — thời gian đi đến điểm
      const workDuration = randomInt(20, 240);  // giây — thời gian ở lại điểm
      const coord       = generateCoordinates(center.lat, center.lng, 2.5);
      const recordedBy  = randomElement(adminIds);
      const createdAt   = randomDate(daysAgo(90), daysAgo(1));

      await sys.checkpointBenchmarkSession.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: tId,
          checkpointId: cpId,
          travelTime,
          workDuration,
          lat: coord.lat,
          lon: coord.lng,
          recordedBy,
          createdAt,
        },
      });

      // Ghi lại để tính benchmark trung bình sau
      if (!cpSessionMap[cpId]) cpSessionMap[cpId] = [];
      cpSessionMap[cpId].push(travelTime);
    }
    logger.success(`S4: ${STRESS_BENCHMARK_SESSION_COUNT} Benchmark Sessions seeded.`);

    // ─── Cập nhật benchmark fields trên Checkpoints dựa trên sessions thực tế ──
    logger.info('S4b: Cập nhật benchmark fields trên Checkpoints từ sessions...');
    let updatedCpCount = 0;

    for (const [cpId, times] of Object.entries(cpSessionMap)) {
      const avgTravel = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const sessionCount = times.length;

      await sys.$executeRawUnsafe(
        `UPDATE checkpoints
         SET benchmark_travel_time   = $1,
             benchmark_session_count = $2,
             benchmark_recorded_at   = NOW(),
             updated_at              = NOW()
         WHERE id = $3 AND tenant_id = $4`,
        avgTravel, sessionCount, cpId, tId,
      );
      updatedCpCount++;
    }
    logger.success(`S4b: Cập nhật ${updatedCpCount} Checkpoints với benchmark trung bình.`);

    // =========================================================================
    // STEP S5: 1.000 PATROL BENCHMARK DEVIATIONS
    // =========================================================================
    // Lấy patrol logs vừa tạo — sample ngẫu nhiên 1.000 logs để attach deviation
    // =========================================================================
    logger.info(`Step S5: Tạo ${STRESS_DEVIATION_COUNT} Patrol Benchmark Deviations...`);

    // Lấy sample patrol logs mới nhất của tenant
    const recentLogs = await (sys.$queryRawUnsafe(
      `SELECT id, staff_id, checkpoint_id
       FROM patrol_logs
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      tId, STRESS_DEVIATION_COUNT * 3, // lấy nhiều hơn để có đủ sau filter
    ) as Promise<{ id: string; staff_id: string; checkpoint_id: string }[]>);

    if (recentLogs.length === 0) {
      logger.warn('S5: Không có patrol logs để tạo deviations — bỏ qua.');
    } else {
      // Lấy checkpoint benchmark data để tính deviation chính xác
      const cpBenchmarks = await (sys.$queryRawUnsafe(
        `SELECT id, benchmark_travel_time, benchmark_work_duration, benchmark_tolerance_pct
         FROM checkpoints
         WHERE tenant_id = $1 AND benchmark_travel_time IS NOT NULL`,
        tId,
      ) as Promise<{
        id: string;
        benchmark_travel_time: number;
        benchmark_work_duration: number;
        benchmark_tolerance_pct: number;
      }[]>);
      const cpBenchmarkMap = Object.fromEntries(cpBenchmarks.map((c: { id: string; benchmark_travel_time: number; benchmark_work_duration: number; benchmark_tolerance_pct: number }) => [c.id, c]));

      let deviationCount = 0;
      const deviationBatch = [];

      for (const log of recentLogs) {
        if (deviationCount >= STRESS_DEVIATION_COUNT) break;

        const bench = cpBenchmarkMap[log.checkpoint_id];
        if (!bench) continue; // checkpoint chưa có benchmark — bỏ qua

        const actualTravel   = randomInt(60, 900);
        const actualWork     = randomInt(15, 300);
        const expectedTravel = bench.benchmark_travel_time   ?? randomInt(120, 600);
        const expectedWork   = bench.benchmark_work_duration ?? randomInt(30, 180);
        const tolerance      = bench.benchmark_tolerance_pct ?? 20;

        const travelDev = calcDeviation(actualTravel, expectedTravel, tolerance);
        const workDev   = calcDeviation(actualWork, expectedWork, tolerance);
        const isCompliant = travelDev.compliant && workDev.compliant;

        // Xác định violationType
        let violationType: string | null = null;
        if (!isCompliant) {
          if (!travelDev.compliant) {
            violationType = actualTravel < expectedTravel ? 'TRAVEL_TOO_FAST' : 'TRAVEL_TOO_SLOW';
          } else {
            violationType = actualWork < expectedWork ? 'WORK_TOO_SHORT' : 'WORK_TOO_LONG';
          }
        }

        deviationBatch.push({
          id: crypto.randomUUID(),
          tenantId: tId,
          patrolLogId: log.id,
          checkpointId: log.checkpoint_id,
          staffId: log.staff_id,
          actualTravelTime: actualTravel,
          actualWorkDuration: actualWork,
          expectedTravelTime: expectedTravel,
          expectedWorkDuration: expectedWork,
          tolerancePct: tolerance,
          // FIX [B1]: isCompliant là GENERATED ALWAYS STORED → DB tự tính, không insert
          // FIX [B2]: Decimal field cần string/number — dùng toDecimalStr để tránh precision loss
          travelDeviationPct: toDecimalStr(travelDev.pct),
          workDeviationPct: toDecimalStr(workDev.pct),
          violationType,
          // severity dựa trên deviation thực — isCompliant DB sẽ tự compute
          severity: !travelDev.compliant || !workDev.compliant
            ? (travelDev.pct > 50 || workDev.pct > 50 ? 'high' : 'medium')
            : 'low',
        });

        deviationCount++;

        // Flush batch
        if (deviationBatch.length >= DEVIATION_BATCH_SIZE) {
          await sys.patrolBenchmarkDeviation.createMany({ data: [...deviationBatch] });
          deviationBatch.length = 0;
          logger.info(`  → ${deviationCount} / ${STRESS_DEVIATION_COUNT} deviations...`);
        }
      }

      // Flush remainder
      if (deviationBatch.length > 0) {
        await sys.patrolBenchmarkDeviation.createMany({ data: deviationBatch });
      }

      logger.success(`S5: ${deviationCount} Patrol Benchmark Deviations seeded.`);
    }

    // =========================================================================
    // STEP S6: 200 INCIDENTS NGẪU NHIÊN
    // =========================================================================
    logger.info(`Step S6: Tạo ${STRESS_INCIDENT_COUNT} Incidents ngẫu nhiên...`);

    const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
    const STATUSES   = ['REPORTED', 'INVESTIGATING', 'ESCALATED', 'RESOLVED', 'CLOSED'] as const;

    const incidentBatch = [];
    for (let i = 0; i < STRESS_INCIDENT_COUNT; i++) {
      const reportedAt = randomDate(daysAgo(60), daysAgo(1));
      const status     = randomElement(STATUSES);
      const severity   = randomElement(SEVERITIES);
      const resolvedAt = ['RESOLVED', 'CLOSED'].includes(status)
        ? new Date(reportedAt.getTime() + randomInt(30, 1440) * 60_000)
        : null;

      incidentBatch.push({
        id: crypto.randomUUID(),
        tenantId: tId,
        staffId: randomElement(allStaffIds),
        type: randomElement(INCIDENT_TYPES),
        // FIX [B3]: severity/status là Prisma enum — cần cast `as any` giống pattern standard.ts
        severity: severity as any,
        severityWeight: SEVERITIES.indexOf(severity) + 1,
        description: `[Stress] Sự cố tự động #${i + 1} — ${randomElement(INCIDENT_TYPES).toLowerCase().replace('_', ' ')}.`,
        status: status as any,
        reportedAt,
        investigatingAt: ['INVESTIGATING', 'ESCALATED', 'RESOLVED', 'CLOSED'].includes(status)
          ? new Date(reportedAt.getTime() + randomInt(5, 30) * 60_000)
          : null,
        resolvedAt,
        closedAt: status === 'CLOSED' ? resolvedAt : null,
        createdAt: reportedAt,
        updatedAt: resolvedAt ?? reportedAt,
      });
    }

    // createMany không hỗ trợ nested — dùng loop batch 50
    for (let i = 0; i < incidentBatch.length; i += 50) {
      await sys.incident.createMany({ data: incidentBatch.slice(i, i + 50) });
    }
    logger.success(`S6: ${STRESS_INCIDENT_COUNT} Incidents seeded.`);

    // =========================================================================
    // SUMMARY
    // =========================================================================
    logger.success(`
╔══════════════════════════════════════════════════════════════╗
║         💪 STRESS SEED v2 HOÀN THÀNH                        ║
╠══════════════════════════════════════════════════════════════╣
║  Tenant target : Vinhomes Grand Park                         ║
╠══════════════════════════════════════════════════════════════╣
║  [S1] Guards bổ sung       : ${String(STRESS_GUARD_COUNT).padEnd(30)}║
║  [S2] Checkpoints bổ sung  : ${String(STRESS_CHECKPOINT_COUNT).padEnd(30)}║
║  [S3] Patrol Logs          : ${STRESS_PATROL_LOG_COUNT.toLocaleString().padEnd(30)}║
║  [S4] Benchmark Sessions   : ${String(STRESS_BENCHMARK_SESSION_COUNT).padEnd(30)}║
║  [S5] Benchmark Deviations : ${String(STRESS_DEVIATION_COUNT).padEnd(30)}║
║  [S6] Incidents            : ${String(STRESS_INCIDENT_COUNT).padEnd(30)}║
╚══════════════════════════════════════════════════════════════╝
`);
  });
}