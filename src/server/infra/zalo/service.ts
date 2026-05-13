import opossum from 'opossum';
import { logger } from '../../core/logger/index.js';
import { metrics } from '../../core/metrics.js';

interface SendZaloMessageParams {
  phone: string;
  message: string;
  tenantId: string;
  accessToken?: string;
  templateId?: string;
}

class ZaloServiceImplementation {
  async sendMessage(params: SendZaloMessageParams): Promise<any> {
    let zaloToken = params.accessToken || process.env.ZALO_ACCESS_TOKEN;
    
    // Fallback logic: Nếu token không được truyền vào, thử lấy từ DB
    if (!zaloToken && params.tenantId) {
      try {
        const { db } = await import('../../core/db/prisma.js');
        const tenant = await db.system().tenant.findUnique({
          where: { id: params.tenantId },
          select: { featuresEnabled: true }
        });
        const features = tenant?.featuresEnabled as any;
        zaloToken = features?.notifications?.zalo?.accessToken || 
                    features?.notifications?.zalo?.access_token ||
                    features?.zalo_access_token;
      } catch (err) {
        logger.error({ err, tenantId: params.tenantId }, 'Failed to load Zalo token from DB in sendMessage');
      }
    }

    if (!zaloToken) {
      logger.warn({ phone: params.phone, tenantId: params.tenantId }, 'ZALO_ACCESS_TOKEN missing. Simulating Zalo message send.');
      return { success: true, simulated: true };
    }

    try {
      const isUid = params.phone.length > 15 || !/^\d+$/.test(params.phone);
      
      // FIX [CRITICAL]: O3 - Phân tách CS API và ZNS
      // CS API (message/cs) yêu cầu user inbox trong 7 ngày.
      // Notification hệ thống (SOS, Alerts) nên dùng ZNS (message/template).
      const endpoint = isUid 
        ? 'https://openapi.zalo.me/v3.0/oa/message/cs' // Chỉ CS API support UID
        : 'https://openapi.zalo.me/v3.0/oa/message/template'; // ZNS dùng cho Phone

      const payload: any = isUid ? {
        recipient: { user_id: params.phone },
        message: { text: params.message }
      } : {
        // ZNS Payload structure (Dummy template for now, requires registration)
        phone: params.phone,
        template_id: params.templateId || "scmd_alert_v1", 
        template_data: {
          content: params.message
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'access_token': zaloToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.error) {
        logger.error({ data, phone: params.phone, tenantId: params.tenantId }, 'Zalo API returned error');
      }
      
      return data;
    } catch (error: any) {
      logger.error({ err: error.message, tenantId: params.tenantId }, 'Failed to send Zalo message');
      throw error;
    }
  }
}

const zaloServiceInstance = new ZaloServiceImplementation();

const breakerOptions = {
  timeout: 8000, 
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

export const ZaloBreaker = new opossum(zaloServiceInstance.sendMessage.bind(zaloServiceInstance), breakerOptions);

// Metrics Bridge
ZaloBreaker.on('open', () => metrics.updateCircuitBreaker('zalo_gateway', 'open'));
ZaloBreaker.on('close', () => metrics.updateCircuitBreaker('zalo_gateway', 'closed'));
ZaloBreaker.on('halfOpen', () => metrics.updateCircuitBreaker('zalo_gateway', 'half-open'));
metrics.updateCircuitBreaker('zalo_gateway', ZaloBreaker.opened ? 'open' : 'closed');

ZaloBreaker.fallback((params, err) => {
  logger.error({ err, params }, 'Zalo Service Circuit Breaker Fallback triggered');
  return { success: false, fallback: true, error: err.message };
});

export class ZaloService {
  /**
   * Helper to load Zalo config for a tenant
   */
  private static async getTenantZaloConfig(tenantId: string) {
    try {
      const { db } = await import('../../core/db/prisma.js');
      const tenant = await db.system().tenant.findUnique({
        where: { id: tenantId },
        select: { featuresEnabled: true }
      });
      const features = tenant?.featuresEnabled as any || {};
      const zaloConfig = features?.notifications?.zalo || {};
      
      return {
        accessToken: zaloConfig.accessToken || zaloConfig.access_token || features.zalo_access_token || process.env.ZALO_ACCESS_TOKEN,
        templateId: zaloConfig.templateId || zaloConfig.template_id || "scmd_alert_v1"
      };
    } catch (err) {
      logger.warn({ err, tenantId }, 'Failed to load tenant Zalo config, using defaults');
      return {
        accessToken: process.env.ZALO_ACCESS_TOKEN,
        templateId: "scmd_alert_v1"
      };
    }
  }

  static async notifyDirect(tenantId: string, message: string, phones: string[]) {
    try {
      const config = await this.getTenantZaloConfig(tenantId);
      const notified = [];
      for (const phone of phones) {
        const result = await ZaloBreaker.fire({
          phone,
          message,
          tenantId,
          accessToken: config.accessToken,
          templateId: config.templateId
        });
        notified.push({ phone, result });
      }
      return notified;
    } catch (err: any) {
      logger.error({ err }, 'Error in notifyDirect Zalo process');
      throw err;
    }
  }

  static async notifyAdmins(tenantId: string, message: string, getAdminsFn: (tenantId: string) => Promise<{ phone?: string | null }[]>) {
    try {
      const [config, admins] = await Promise.all([
        this.getTenantZaloConfig(tenantId),
        getAdminsFn(tenantId)
      ]);

      // SEC-NEW-4: Use Promise.allSettled for parallel execution
      const notifyPromises = admins
        .filter(admin => admin.phone)
        .map(async admin => {
          const result = await ZaloBreaker.fire({
            phone: admin.phone as string,
            message,
            tenantId,
            accessToken: config.accessToken,
            templateId: config.templateId
          });
          return { phone: admin.phone, result };
        });

      const results = await Promise.allSettled(notifyPromises);
      
      const notified = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);
        
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        logger.warn({ failedCount: failed.length, tenantId }, 'Some Zalo admin notifications failed in parallel batch');
      }

      return notified;
    } catch (err: any) {
      logger.error({ err }, 'Error in notifyAdmins Zalo process');
      throw err;
    }
  }
}
