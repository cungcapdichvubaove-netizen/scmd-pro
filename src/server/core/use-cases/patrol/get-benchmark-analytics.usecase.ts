import { z } from 'zod';
import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext } from '../../architecture/types.js';
import { db } from '../../db/prisma.js';

/**
 * Zod schema for benchmark analytics input validation
 */
const analyticsSchema = z.object({
  checkpointId: z.string().optional(),
  staffId: z.string().optional(),
  from: z.string().transform(v => new Date(v)).refine(d => !isNaN(d.getTime()), {
    message: "Invalid 'from' date format"
  }).optional(),
  to: z.string().transform(v => new Date(v)).refine(d => !isNaN(d.getTime()), {
    message: "Invalid 'to' date format"
  }).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

type AnalyticsRequest = z.infer<typeof analyticsSchema>;

export class GetBenchmarkAnalyticsUseCase extends BaseUseCase<AnalyticsRequest, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (!context.userId) throw new Error('UNAUTHORIZED');
    // Required permission log:read is already checked by middleware in routes.ts, 
    // but we can add secondary checks here if needed for specific roles.
  }

  protected override async validate(request: any): Promise<void> {
    analyticsSchema.parse(request);
  }

  protected async internalExecute(context: SecurityContext, request: any): Promise<any> {
    const validated = analyticsSchema.parse(request);
    const { checkpointId, staffId, from, to, limit, cursor } = validated;

    // Security: Prevents querying excessive date ranges if not specified, 
    // but here we allow user to specify. We just ensure they are valid dates.
    
    const results = await db.forTenant(context.tenantId).patrolBenchmarkDeviation.findMany({
      where: {
        ...(checkpointId ? { checkpointId } : {}),
        ...(staffId ? { staffId } : {}),
        ...(from || to ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          }
        } : {}),
      },
      include: {
        checkpoint: { select: { name: true } },
        staff: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to check for next page
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    let nextCursor: string | undefined = undefined;
    if (results.length > limit) {
      const nextItem = results.pop();
      nextCursor = nextItem?.id;
    }

    return {
      data: results,
      pagination: {
        nextCursor,
        limit
      }
    };
  }
}
