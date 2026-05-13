import { db } from '../../core/db/prisma.js';
import { PatrolRepository } from './repositories/patrol.repository.js';

export class CommandCenterRepository {
  static async getFeedByTenant(tenantId: string) {
    // Real data: Fetch latest feedbacks/incidents and anomalies
    const feedbacks = await db.forTenant(tenantId, { readOnly: true }).feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    return feedbacks.map((f: any) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      severity: f.severity,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      type: f.type
    }));
  }

  static async getMapDataByTenant(tenantId: string) {
    // Real data: Checkpoints from Prisma
    const checkpoints = await PatrolRepository.getCheckpointsByTenant(tenantId);
    const data = checkpoints.data || [];
    
    // In a real app, we might also fetch current guard positions from a high-frequency store (Redis/In-memory)
    return data.map((cp: any) => ({
      id: cp.id,
      name: cp.name,
      lat: cp.latitude || 10.762622,
      lon: cp.longitude || 106.660172,
      status: 'INACTIVE',
      type: 'CHECKPOINT'
    }));
  }

  static async getPrioritiesByTenant(tenantId: string) {
    // Real data: Open incidents with higher severity first
    const priorities = await db.forTenant(tenantId, { readOnly: true }).feedback.findMany({
      where: { 
        status: { notIn: ['RESOLVED', 'CLOSED'] }
      },
      orderBy: { createdAt: 'desc' }, // Simple sort as Prisma doesn't do custom enum sort natively without raw query
      take: 5
    });

    return priorities.map((f: any) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      status: f.status,
      severity: f.severity,
      createdAt: f.createdAt.toISOString(),
    }));
  }
}

