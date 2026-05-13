import { TenantRepository } from '../tenant/tenant.repository.js';
import { logger } from '../../core/logger/index.js';
import { OnboardTenantDTO } from '../../core/architecture/types.js';
import { db } from '../../core/db/prisma.js';
import { MediaService } from '../../core/media/media.service.js';
import { cache } from '../../core/cache/index.js';

import { SubscriptionPlan } from '@prisma/client';

export class SuperAdminService {
  static async getStats() {
    const cacheKey = 'admin:dashboard_stats';
    return await cache.getOrFetch(cacheKey, async () => {
      // 1. Basic Counts
      const grouped = await db.system().tenant.groupBy({
        by: ['status', 'subscriptionPlan', 'plan'],
        _count: { id: true }
      });
      
      let totalTenants = 0;
      let activeTenants = 0;
      let liteTenants = 0;
      let proTenants = 0;
      let enterpriseTenants = 0;

      for (const group of grouped) {
        const count = group._count.id;
        const { status, subscriptionPlan, plan } = group;

        totalTenants += count;
        if (status === 'active' || status === 'TRIAL') activeTenants += count;
        if (plan === 'LITE') liteTenants += count;
        if (subscriptionPlan === SubscriptionPlan.ENTERPRISE || plan === 'ENTERPRISE') enterpriseTenants += count;
        else if (subscriptionPlan === SubscriptionPlan.PRO || plan === 'PRO') proTenants += count;
      }

      // 2. Whale Alerts - Top tenants by staff/checkpoint count
      // We join with counts if possible, or just fetch top tenants and count separately
      const topTenants = await db.system().tenant.findMany({
        where: { id: { not: 'system' } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { staff: true }
          }
        }
      });

      const whaleAlerts = topTenants.map((t: any) => ({
        id: t.id,
        name: t.name,
        staffCount: t._count?.staff || 0,
        checkpointCount: 0, // relation not available
        plan: t.plan,
        potentialValue: (t._count?.staff || 0) > 20 ? 'HIGH' : 'MEDIUM'
      }));

      // 3. Smart Notifications
      // logic: find active Free/Trial tenants with > 10 staff
      const conversionLeads = await db.system().tenant.findMany({
        where: {
          subscriptionPlan: SubscriptionPlan.FREE,
          id: { not: 'system' }
        },
        include: {
          _count: { select: { staff: true } }
        },
        take: 3
      });

      const smartNotifications = conversionLeads
        .filter((t: any) => (t._count?.staff || 0) > 5)
        .map((t: any) => ({
          id: `notif-${t.id}`,
          type: 'conversion_ready',
          priority: (t._count?.staff || 0) > 15 ? 'high' : 'medium',
          tenantName: t.name,
          message: `${t.name} đã đạt ${t._count?.staff || 0} nhân viên. Đây là thời điểm vàng để đề xuất nâng cấp gói PRO.`,
          timestamp: new Date().toISOString()
        }));

      // 4. Growth Velocity (Actual Real-time calculation for the last 6 months)
      const nowNode = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(nowNode.getFullYear(), nowNode.getMonth() - i, 1);
        months.push({
          name: d.toLocaleString('en-US', { month: 'short' }),
          start: d,
          end: new Date(d.getFullYear(), d.getMonth() + 1, 1)
        });
      }

      const chartData = await Promise.all(months.map(async (m) => {
        const count = await db.system().tenant.count({
          where: {
            createdAt: {
              gte: m.start,
              lt: m.end
            },
            id: { not: 'system' }
          }
        });
        return { name: m.name, value: count };
      }));

      // 5. Revenue Stream (Actual Performance Tracking)
      // PRO = 99k/NV. Total revenue = sum of paidUsers in all PRO subscriptions * 99000
      const currentMonthStart = new Date(nowNode.getFullYear(), nowNode.getMonth(), 1);
      const lastMonthStart = new Date(nowNode.getFullYear(), nowNode.getMonth() - 1, 1);

      const [currentRevAgg, lastRevAgg] = await Promise.all([
        db.system().tenantSubscription.aggregate({
          _sum: { paidUsers: true },
          where: {
            plan: 'PRO',
            tenant: { status: 'active' }
          }
        }),
        // For accurate tracking, we should ideally check historical state, 
        // but since we lack a historical snapshot table, we use current active subs 
        // as a baseline and potentially could filter by createdAt if needed.
        // For now, we'll keep the growth calculation based on active revenue.
        db.system().billingPayment.aggregate({
          _sum: { paidUsers: true },
          where: {
            status: 'ACTIVE',
            createdAt: { gte: lastMonthStart, lt: currentMonthStart }
          }
        })
      ]);

      const proRevenue = (currentRevAgg._sum.paidUsers || 0) * 99000;
      const lastMonthRevenue = (lastRevAgg._sum.paidUsers || 0) * 99000;
      
      const revenueGrowth = lastMonthRevenue > 0 
        ? Math.round(((proRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
        : 0;

      return {
        totalTenants,
        activeTenants,
        liteTenants,
        proTenants,
        enterpriseTenants,
        growthVelocity: {
          daily: totalTenants > 0 ? Math.ceil(totalTenants / 30) : 0,
          weekly: totalTenants > 0 ? Math.ceil(totalTenants / 4) : 0,
          chartData
        },
        whaleAlerts,
        smartNotifications,
        revenueStream: {
          totalRevenue: proRevenue,
          growth: revenueGrowth
        }
      };
    }, 300); // 5 mins cache
  }

  static async listTenantsPaginated(cursor?: string, take: number = 50) {
    // Only cache the first page
    if (!cursor) {
      const cacheKey = `admin:tenant_list_paged:${take}`;
      return await cache.getOrFetch(cacheKey, async () => {
        return await TenantRepository.getAllPaginated(cursor, take);
      }, 120);
    }
    return await TenantRepository.getAllPaginated(cursor, take);
  }

  static async listTenants() {
    const cacheKey = 'admin:tenant_list';
    return await cache.getOrFetch(cacheKey, async () => {
      return await TenantRepository.getAll();
    }, 120); // 2 mins cache
  }

  private static async invalidateAdminCaches() {
    await Promise.all([
      cache.del('admin:dashboard_stats'),
      cache.del('admin:tenant_list'),
      cache.del('admin:tenant_list_paged:50')
    ]);
  }

  static async onboardTenant(data: OnboardTenantDTO) {
    logger.info({ name: data.name }, 'Onboarding new tenant');
    const result = await TenantRepository.save(data);
    await this.invalidateAdminCaches();
    return result;
  }

  static async updateTenantStatus(tenantId: string, status: string) {
    logger.info({ tenantId, status }, 'Updating tenant status');
    const result = await db.system().tenant.update({
      where: { id: tenantId },
      data: { status }
    });

    // Invalidate tenant status cache immediately for real-time suspension/activation
    await cache.del(`tenant:status:${tenantId}`);
    
    if (status === 'suspended') {
      const { CacheManager } = await import('../../core/cache/manager.js');
      const staffList = await db.withTenant('SYSTEM', async (tx) => {
        return await tx.staff.findMany({
          where: { tenantId },
          select: { id: true }
        });
      }, { callerRole: 'super-admin' });
      for (const staff of staffList) {
        await CacheManager.del(`auth_metadata:${staff.id}`);
      }
    }

    // Invalidate global admin lists/stats
    await this.invalidateAdminCaches();
    
    return result;
  }

  static async updateTenantFeatures(tenantId: string, features: any) {
    logger.info({ tenantId, features }, 'Updating tenant features_enabled');
    const result = await db.system().tenant.update({
      where: { id: tenantId },
      data: { featuresEnabled: features }
    });
    await this.invalidateAdminCaches();
    return result;
  }
  
  static async updateTenantMaxEmployees(tenantId: string, count: number) {
    logger.info({ tenantId, count }, 'Updating tenant max_employees');
    const result = await db.system().tenant.update({
      where: { id: tenantId },
      data: { maxEmployees: count }
    });
    await this.invalidateAdminCaches();
    return result;
  }

  static async resetTenantAdminPassword(tenantId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('INVALID_PASSWORD: Password must be at least 8 characters long.');
    }

    logger.info({ tenantId }, 'Resetting tenant admin password');
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(newPassword, 10);
    
    // FIX [A08]: Correct SQL logic using tenantId and role, avoid broken startsWith logic
    const result = await db.forTenant(tenantId).staff.updateMany({
      where: { 
        role: 'tenant-admin' 
      },
      data: { password: hashedPassword }
    });

    if (result.count === 0) {
      throw new Error(`NOT_FOUND: No tenant-admin found for tenant ${tenantId}`);
    }

    return result;
  }

  static async getStorageConfig() {
    const config = await db.system().systemConfig.findUnique({
      where: { key: 'STORAGE_CONFIG' }
    });
    return config?.value || null;
  }

  static async updateStorageConfig(data: any) {
    logger.info('Updating global storage configuration');
    const config = await db.system().systemConfig.upsert({
      where: { key: 'STORAGE_CONFIG' },
      update: { value: data },
      create: { key: 'STORAGE_CONFIG', value: data }
    });
    
    // Refresh MediaService internal provider
    await MediaService.refreshConfig();
    
    return config.value;
  }

  static async deleteTenant(tenantId: string) {
    if (tenantId === 'system') {
      throw new Error('SYSTEM_TENANT_PROTECTED: Cannot delete system tenant.');
    }

    logger.info({ tenantId }, 'Starting atomic cleanup for tenant deletion');
    
    try {
      await db.system().$transaction(async (tx: any) => {
        // Step 1: Low-level logs and records (Children of major entities)
        await tx.patrolBenchmarkDeviation.deleteMany({ where: { tenantId } });
        await tx.checkpointBenchmarkSession.deleteMany({ where: { tenantId } });
        await tx.shiftComplianceItem.deleteMany({ where: { tenantId } });
        await tx.attendanceRecord.deleteMany({ where: { tenantId } });
        await tx.patrolLog.deleteMany({ where: { tenantId } });
        await tx.disciplinaryAction.deleteMany({ where: { tenantId } });
        await tx.staffPerformanceMetric.deleteMany({ where: { tenantId } });
        await tx.complianceScore.deleteMany({ where: { tenantId } });
        await tx.notification.deleteMany({ where: { tenantId } });
        await tx.eventOutbox.deleteMany({ where: { tenantId } });
        await tx.idempotency.deleteMany({ where: { createdAt: { lt: new Date() } } }); // Global cleanup
        
        // Step 2: Mid-level entities (Tasks, Incidents, Audits)
        await tx.incident.deleteMany({ where: { tenantId } });
        await tx.task.deleteMany({ where: { tenantId } });
        await tx.audit.deleteMany({ where: { tenantId } });
        await tx.auditLog.deleteMany({ where: { tenantId } });
        await tx.feedback.deleteMany({ where: { tenantId } });
        await tx.attachment.deleteMany({ where: { tenantId } });
        await tx.monthlyStrategyInsight.deleteMany({ where: { tenantId } });
        
        // Step 3: High-level infrastructure (Vendors, Contracts, Checkpoints, Staff)
        await tx.shiftSchedule.deleteMany({ where: { tenantId } });
        await tx.contract.deleteMany({ where: { tenantId } });
        await tx.vendor.deleteMany({ where: { tenantId } });
        await tx.checkpoint.deleteMany({ where: { tenantId } });
        await tx.staff.deleteMany({ where: { tenantId } });
        
        // Final Step: The Tenant itself
        await tx.tenant.delete({ where: { id: tenantId } });
      }, {
        timeout: 15000 // Extended timeout for large tenants
      });

      // Clear caches synchronously
      await cache.del(`tenant:${tenantId}`);
      await cache.del(`tenant:status:${tenantId}`);
      await this.invalidateAdminCaches();
      
      logger.info({ tenantId }, 'Cleanup completed, tenant removed.');
    } catch (err: any) {
      logger.error({ err, tenantId }, "Failed to delete tenant with dependencies");
      throw err;
    }
  }
}
