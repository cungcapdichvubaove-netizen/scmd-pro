import nodemailer from 'nodemailer';
import { logger } from '../../core/logger/index.js';

export class EmailService {
  static async sendNotification(tenantId: string, emailConfig: any, toEmails: string[], subject: string, text: string) {
    if (!emailConfig?.enabled || !emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.smtpPass) {
      return false;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: parseInt(emailConfig.smtpPort || '587', 10),
        auth: {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPass,
        },
      });

      await transporter.sendMail({
        from: emailConfig.smtpFrom || emailConfig.smtpUser,
        to: toEmails.join(','),
        subject,
        text,
      });

      logger.info({ tenantId, recipients: toEmails.length }, 'Email notification sent successfully');
      return true;
    } catch (err: any) {
      logger.error({ err: err.message, tenantId }, 'Failed to send email notification');
      throw err;
    }
  }
}
