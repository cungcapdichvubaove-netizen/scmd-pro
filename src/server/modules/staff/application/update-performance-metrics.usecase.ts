import { Prisma } from '@prisma/client';
import { db } from '../../../core/db/prisma.js';
import { logger } from '../../../core/logger/index.js';

interface TenantRow { id: string; status: string; }

export class UpdatePerformanceMetricsUseCase {
  async execute() {
    logger.info('Starting staff performance metrics calculation job...');

    const tenants = await db.system().tenant.findMany({
      where: { status: 'active' }
    }) as TenantRow[];

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Lấy ngày mùng 1 của tháng hiện tại
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const tenant of tenants) {
      try {
        await db.withTenant(tenant.id, async (tx) => {
          // SEC-NEW-1: Thay thế N+1 loops bằng 1 Raw SQL Aggregation duy nhất
          await tx.$executeRaw(Prisma.sql`
            WITH stats AS (
              SELECT 
                s.id as staff_id,
                COALESCE(i.sos_count, 0) as sos_count,
                COALESCE(d.discipline_count, 0) as discipline_count,
                COALESCE(a.attendance_rate, 100.0) as attendance_rate
              FROM staff s
              LEFT JOIN (
                SELECT staff_id, COUNT(*)::int as sos_count 
                FROM incidents 
                WHERE tenant_id = ${tenant.id} 
                  AND type = 'SOS' 
                  AND created_at >= ${startOfMonth}
                GROUP BY staff_id
              ) i ON i.staff_id = s.id
              LEFT JOIN (
                SELECT staff_id, COUNT(*)::int as discipline_count 
                FROM disciplinary_actions 
                WHERE tenant_id = ${tenant.id} 
                  AND occurred_at >= ${startOfMonth}
                GROUP BY staff_id
              ) d ON d.staff_id = s.id
              LEFT JOIN (
                SELECT 
                  staff_id,
                  CASE 
                    WHEN COUNT(*) FILTER (WHERE type = 'CHECK_IN' AND is_valid = true) = 0 THEN 100.0
                    ELSE (
                      COUNT(*) FILTER (WHERE type = 'CHECK_IN' AND is_valid = true AND late_minutes = 0) * 100.0 
                      / NULLIF(COUNT(*) FILTER (WHERE type = 'CHECK_IN' AND is_valid = true), 0)
                    )
                  END as attendance_rate
                FROM attendance_records
                WHERE tenant_id = ${tenant.id} 
                  AND created_at >= ${startOfMonth}
                GROUP BY staff_id
              ) a ON a.staff_id = s.id
              WHERE s.tenant_id = ${tenant.id} AND s.status = 'active'
            )
            INSERT INTO staff_performance_metrics (
              id, tenant_id, staff_id, period, trust_score, sos_count, missed_points, attendance_rate, created_at
            )
            SELECT 
              gen_random_uuid(),
              ${tenant.id},
              staff_id,
              ${period},
              GREATEST(0, LEAST(100, 95 - (discipline_count * 10) + (sos_count * 1))),
              sos_count,
              discipline_count,
              attendance_rate,
              NOW()
            FROM stats
            ON CONFLICT (tenant_id, staff_id, period) 
            DO UPDATE SET 
              trust_score = EXCLUDED.trust_score,
              sos_count = EXCLUDED.sos_count,
              missed_points = EXCLUDED.missed_points,
              attendance_rate = EXCLUDED.attendance_rate;
          `);
        });
      } catch (err) {
        logger.error({ err, tenantId: tenant.id }, 'Failed to update metrics for tenant');
      }
    }

    logger.info('Finished staff performance metrics calculation job');
  }
}
