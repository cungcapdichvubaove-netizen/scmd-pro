import { logger } from '../logger/index.js';
import { ZaloService } from '../../infra/zalo/service.js';
import nodemailer from 'nodemailer';

interface PlatformAlertOptions {
  type: string;
  title: string;
  message: string;
}

// Bắt buộc xác thực ENV tại thời điểm khởi động (fail-fast)
if (process.env.NODE_ENV === 'production' && !process.env.PLATFORM_ADMIN_PHONE) {
  throw new Error('CRITICAL: Missing require environment variable "PLATFORM_ADMIN_PHONE". ProactiveAlertService cannot safely initialize.');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER || 'apikey',
    pass: process.env.SMTP_PASS || '',
  },
});

export class ProactiveAlertService {
  static async triggerPlatformAlert(options: PlatformAlertOptions) {
    try {
      logger.error({ alertType: options.type }, `🔔 PROACTIVE PLATFORM ALERT: ${options.title}`);

      const primaryAdminPhone = process.env.PLATFORM_ADMIN_PHONE || '0000000000';
      const adminEmail = process.env.PLATFORM_ADMIN_EMAIL || 'admin@scmdpro.com';
      
      const payloadText = `[SCMD PRO LỖI HỆ THỐNG]\n💥 ${options.title}\n📝 ${options.message}\n⚠️ Vui lòng kiểm tra trên Dashboard Super Admin.`;

      let zaloSuccess = false;
      let attempt = 0;
      const maxRetries = 3;
      let lastZaloError: any = null;

      // Retry với Exponential Backoff
      while (attempt < maxRetries && !zaloSuccess) {
        try {
          await ZaloService.notifyDirect('system', payloadText, [primaryAdminPhone]);
          zaloSuccess = true;
          logger.info(`✅ Proactive Zalo alert sent successfully (Attempt ${attempt + 1})`);
        } catch (err: any) {
          attempt++;
          lastZaloError = err;
          if (attempt < maxRetries) {
            const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            logger.warn({ err: err.message, attempt }, `⚠️ Zalo alert failed, retrying in ${backoffMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }

      // Fallback sang Email nếu Zalo kiệt sức (max retries)
      if (!zaloSuccess) {
        logger.error({ err: lastZaloError?.message }, '❌ Zalo alert exhausted all retries. Triggering Email fallback.');
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'alerts@scmdpro.com',
            to: adminEmail,
            subject: `[CRITICAL/SCMD] ${options.title}`,
            text: payloadText,
          });
          logger.info(`✅ Proactive Email fallback sent to ${adminEmail}`);
        } catch (emailErr: any) {
          logger.error({ err: emailErr.message }, '🚨 CRITICAL: Email fallback also failed. System is completely reactive.');
          return { success: false, error: 'All alerting channels failed' };
        }
      }

      return { success: true };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to dispatch proactive platform alert');
      return { success: false, error: err.message };
    }
  }
}
