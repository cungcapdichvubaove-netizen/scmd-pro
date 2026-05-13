import { db } from '../../db/prisma.js';
import { GeminiService, BlindSpotAnalysis } from '../../ai/gemini.service.js';
import { CacheManager } from '../../cache/manager.js';

export class GetPredictiveAnalysisUseCase {
  static async execute(tenantId: string): Promise<BlindSpotAnalysis | { message: string }> {
    const cacheKey = `analytics:predictive:${tenantId}`;
    
    return await CacheManager.wrap(cacheKey, async () => {
      // 1. Fetch last 7 days of patrol logs for context
      const past7Days = new Date();
      past7Days.setDate(past7Days.getDate() - 7);

      const [patrolLogs, checkpoints] = await Promise.all([
        db.forTenant(tenantId).patrolLog.findMany({
          where: {
            createdAt: { gte: past7Days }
          },
          orderBy: { createdAt: 'desc' },
          take: 100 // Sample size for AI optimization
        }),
        db.forTenant(tenantId).checkpoint.findMany({
          where: { status: 'active' }
        })
      ]);

      if (patrolLogs.length < 5) {
        return {
          message: "Dữ liệu chưa đủ để phân tích xu hướng (Cần ít nhất 5 lượt tuần tra).",
        };
      }

      // 2. Invoke Gemini Predictive Engine
      const analysis = await GeminiService.predictBlindSpots(patrolLogs, checkpoints);

      // 3. Log the strategic insight (Audit)
      await db.forTenant(tenantId).auditLog.create({
        data: {
          userId: 'SYSTEM_AI',
          action: 'PREDICTIVE_INSIGHT_GENERATED',
          resource: 'PATROL_STRATEGY',
          status: 'SUCCESS',
          timestamp: BigInt(Date.now()),
          payload: { 
            blindSpotsCount: analysis.blindSpots.length,
            suggestionsCount: analysis.dynamicRouteSuggestions.length
          }
        }
      });

      return analysis;
    }, 21600); // 6 hours cache for expensive AI analysis
  }
}
