// ============================================================
// src/server/core/use-cases/patrol/record-benchmark.usecase.ts
// Use case ghi nhận benchmark thực địa - Clean Architecture
// ============================================================

import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';

export interface RecordBenchmarkDTO {
  lat: number;
  lon: number;
  travelTime: number;      // giây
  workDuration: number;    // giây
  tolerancePct?: number;   // % sai số cho phép, default 20
}

interface BenchmarkSession {
  travelTime: number;
  workDuration: number;
  recordedAt: string;
  recordedBy: string;
  lat: number;
  lon: number;
}

interface CheckpointWithBenchmark {
  id: string;
  tenantId: string;
  latitude: number;
  longitude: number;
  benchmark_sessions?: BenchmarkSession[];
  benchmark_travel_time?: number | null;
  benchmark_work_duration?: number | null;
  benchmark_tolerance_pct?: number | null;
  benchmark_session_count?: number | null;
  [key: string]: unknown;
}

export class RecordBenchmarkUseCase extends BaseUseCase<{ id: string; data: RecordBenchmarkDTO }, CheckpointWithBenchmark> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (context.role !== UserRole.TENANT_ADMIN && context.role !== UserRole.SUPER_ADMIN) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected async internalExecute(
    context: SecurityContext,
    request: { id: string; data: RecordBenchmarkDTO }
  ): Promise<CheckpointWithBenchmark> {
    const { id, data } = request;

    const existing = await PatrolRepository.getCheckpointById(context.tenantId, id) as CheckpointWithBenchmark | null;
    if (!existing) throw new Error('CHECKPOINT_NOT_FOUND');
    if (existing.tenantId !== context.tenantId) throw new Error('CROSS_TENANT_ACCESS_DENIED');

    // Validate proximity (50m anti-fraud check)
    const dist = haversineMeters(data.lat, data.lon, existing.latitude, existing.longitude);
    if (dist > 100) {
      throw new Error(`BENCHMARK_TOO_FAR: ${Math.round(dist)}m from checkpoint (max 100m)`);
    }

    const { db } = await import('../../db/prisma.js');
    const updated = await db.withTenant(context.tenantId, async (tx) => {
      // 1. Ghi session mới vào sub-table (tránh race condition JSON blobs)
      await tx.checkpointBenchmarkSession.create({
        data: {
          checkpointId: id,
          tenantId: context.tenantId,
          travelTime: data.travelTime,
          workDuration: data.workDuration,
          lat: data.lat,
          lon: data.lon,
          recordedBy: context.userId
        }
      });

      // 2. Lấy 10 session gần nhất để tính trọng số
      const recentSessions = await tx.checkpointBenchmarkSession.findMany({
        where: { checkpointId: id, tenantId: context.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const totalCount = await tx.checkpointBenchmarkSession.count({
        where: { checkpointId: id, tenantId: context.tenantId }
      });

      const ascSessions = recentSessions.reverse(); // ASC order: cũ -> mới
      
      let totalWeight = 0, sumTravel = 0, sumWork = 0;
      ascSessions.forEach((s: any, i: number) => {
        const weight = i + 1;
        totalWeight += weight;
        sumTravel += s.travelTime * weight;
        sumWork += s.workDuration * weight;
      });

      const avgTravel = ascSessions.length > 0 ? sumTravel / totalWeight : 0;
      const avgWork = ascSessions.length > 0 ? sumWork / totalWeight : 0;

      // 3. Update Checkpoint atomic
      const updatedCp = await tx.checkpoint.update({
        where: { id_tenantId: { id, tenantId: context.tenantId } },
        data: {
          benchmarkTravelTime: Math.round(avgTravel),
          benchmarkWorkDuration: Math.round(avgWork),
          benchmarkTolerancePct: data.tolerancePct ?? existing.benchmark_tolerance_pct ?? 20,
          benchmarkRecordedBy: context.userId,
          benchmarkRecordedAt: new Date(),
          benchmarkSessionCount: totalCount
        }
      });
      return updatedCp;
    });

    await AuditService.logSensitiveChange(
      context.userId,
      context.tenantId,
      'RECORD_BENCHMARK',
      `checkpoint/${id}`,
      {
        prev_travel: existing.benchmark_travel_time,
        prev_work: existing.benchmark_work_duration,
      },
      {
        new_travel: updated.benchmarkTravelTime,
        new_work: updated.benchmarkWorkDuration,
        session_count: updated.benchmarkSessionCount,
      }
    );

    return {
      ...existing,
      benchmark_travel_time: updated.benchmarkTravelTime,
      benchmark_work_duration: updated.benchmarkWorkDuration,
      benchmark_tolerance_pct: updated.benchmarkTolerancePct,
      benchmark_session_count: updated.benchmarkSessionCount,
    } as CheckpointWithBenchmark;
  }
}

// Reset benchmark về null (xóa để học lại)
export class ResetBenchmarkUseCase extends BaseUseCase<{ id: string }, CheckpointWithBenchmark> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (context.role !== UserRole.TENANT_ADMIN && context.role !== UserRole.SUPER_ADMIN) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected async internalExecute(context: SecurityContext, request: { id: string }): Promise<CheckpointWithBenchmark> {
    const existing = await PatrolRepository.getCheckpointById(context.tenantId, request.id) as CheckpointWithBenchmark | null;
    if (!existing) throw new Error('CHECKPOINT_NOT_FOUND');
    if (existing.tenantId !== context.tenantId) throw new Error('CROSS_TENANT_ACCESS_DENIED');

    const { db } = await import('../../db/prisma.js');
    const updated = await db.withTenant(context.tenantId, async (tx) => {
      // Xóa lịch sử sessions
      await tx.checkpointBenchmarkSession.deleteMany({
        where: { checkpointId: request.id, tenantId: context.tenantId }
      });

      return await tx.checkpoint.update({
        where: { id_tenantId: { id: request.id, tenantId: context.tenantId } },
        data: {
          benchmarkTravelTime: null,
          benchmarkWorkDuration: null,
          benchmarkRecordedBy: null,
          benchmarkRecordedAt: null,
          benchmarkSessionCount: 0,
        }
      });
    });

    await AuditService.logSensitiveChange(
      context.userId, context.tenantId,
      'RESET_BENCHMARK', `checkpoint/${request.id}`,
      { sessions: existing.benchmark_session_count },
      { reset: true }
    );

    return {
      ...existing,
      benchmark_travel_time: updated.benchmarkTravelTime,
      benchmark_work_duration: updated.benchmarkWorkDuration,
      benchmark_recorded_by: updated.benchmarkRecordedBy,
      benchmark_recorded_at: updated.benchmarkRecordedAt,
      benchmark_session_count: updated.benchmarkSessionCount,
    } as CheckpointWithBenchmark;
  }
}

// ─────────────────────────────────────────────
// Utilities nội bộ
// ─────────────────────────────────────────────

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


