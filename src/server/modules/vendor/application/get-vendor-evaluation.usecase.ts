import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { CacheManager } from '../../../core/cache/manager.js';

export interface VendorEvaluation {
  vendorId: string;
  vendorName: string;
  weightedScore: number;
  rank: 'STRATEGIC' | 'COMPLIANT' | 'NEEDS_IMPROVEMENT' | 'AT_RISK';
  monthlyHistory: {
    month: string;
    score: number;
  }[];
  totalViolations: number;
  recommendation: string;
}

export class GetVendorEvaluationUseCase {
  async execute(ctx: SecurityContext, vendorId: string): Promise<VendorEvaluation> {
    const cacheKey = `vendor:eval:${ctx.tenantId}:${vendorId}`;

    return await CacheManager.wrap(cacheKey, async () => {
      // Dùng transaction (Snapshot Isolation) qua db.withTenant để nhóm 2 queries lại
      const { vendor, scores } = await db.withTenant(ctx.tenantId, async (tx) => {
        const v = await tx.vendor.findUnique({
          where: { id: vendorId },
          select: { name: true }
        });

        if (!v) {
          throw new Error('VENDOR_NOT_FOUND');
        }

        const s = await tx.complianceScore.findMany({
          where: { vendorId },
          orderBy: { month: 'desc' },
          take: 12
        });
        
        return { vendor: v, scores: s };
      });

      if (scores.length === 0) {
        return {
          vendorId,
          vendorName: vendor.name,
          weightedScore: 0,
          rank: 'AT_RISK',
          monthlyHistory: [],
          totalViolations: 0,
          recommendation: 'Không có dữ liệu đánh giá.'
        };
      }

      // Calculate Weighted Score
      // Weight: Current month = 12, Month -1 = 11, ..., Month -11 = 1
      let totalWeight = 0;
      let weightedSum = 0;
      let totalViolations = 0;

      const monthlyHistory = scores.map((s: any, index: number) => {
        const weight = 12 - index; // index 0 is most recent
        totalWeight += weight;
        weightedSum += s.totalScore * weight;
        totalViolations += s.violationsCount;
        
        return {
          month: s.month,
          score: s.totalScore
        };
      });

      const weightedScore = Math.round((weightedSum / totalWeight) * 10) / 10;

      // Determine Rank
      let rank: VendorEvaluation['rank'] = 'AT_RISK';
      let recommendation = '';

      if (weightedScore >= 95) {
        rank = 'STRATEGIC';
        recommendation = 'Đối tác Chiến lược. Khuyến nghị duy trì và mở rộng quy mô hợp tác.';
      } else if (weightedScore >= 85) {
        rank = 'COMPLIANT';
        recommendation = 'Đối tác Đạt chuẩn. Vận hành ổn định, cần duy trì SLA hiện tại.';
      } else if (weightedScore >= 70) {
        rank = 'NEEDS_IMPROVEMENT';
        recommendation = 'Cần cải thiện. Có dấu hiệu suy giảm chất lượng, cần làm việc với Ban Giám Đốc nhà thầu.';
      } else {
        rank = 'AT_RISK';
        recommendation = 'Mức độ Nguy cơ. Khuyến nghị xem xét chấm dứt hợp đồng hoặc phạt nặng.';
      }

      return {
        vendorId,
        vendorName: vendor?.name || 'N/A',
        weightedScore,
        rank,
        monthlyHistory: monthlyHistory.reverse(), // Chronological order for chart
        totalViolations,
        recommendation
      };
    }, 3600); // TTL: 1 hour
  }
}
