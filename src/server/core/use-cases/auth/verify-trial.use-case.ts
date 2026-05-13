import bcrypt from 'bcryptjs';
import { redisClient } from '../../redis.js';
import { db } from '../../db/prisma.js';
import { cache } from '../../cache/index.js';
import { AuditService } from '../../audit/audit.service.js';

export interface VerifyTrialInput {
  token: string;
}

export interface VerifyTrialResponse {
  success: boolean;
  message: string;
}

export class VerifyTrialUseCase {
  async execute(input: VerifyTrialInput): Promise<VerifyTrialResponse> {
    const { token } = input;

    const tenantId = await redisClient.get(`trial_verify:${token}`);
    if (!tenantId) {
      throw new Error('TOKEN_EXPIRED');
    }

    const tenant = await db.system().tenant.update({
      where: { id: tenantId },
      data: { status: 'active' }
    });
    
    await cache.del(`tenant:status:${tenantId}`);
    
    const defaultPassword = await bcrypt.hash('password123', 10);
    
    await db.forTenant(tenantId).staff.upsert({
      where: { 
        username: `admin_${tenant.subdomain}`,
        tenantId // Keep explicit for clarity, though db.forTenant injects it
      },
      update: {},
      create: {
        tenantId: tenant.id,
        username: `admin_${tenant.subdomain}`,
        email: tenant.contactEmail || `admin@${tenant.subdomain}.scmd.pro`,
        password: defaultPassword,
        fullName: `Quản trị viên ${tenant.name}`,
        role: 'tenant-admin',
        status: 'active'
      }
    });

    await redisClient.del(`trial_verify:${token}`);
    
    await AuditService.log({
      userId: 'system/onboarding',
      tenantId: 'PLATFORM',
      action: 'VERIFY_TRIAL_EMAIL',
      resource: `tenant/${tenantId}`,
      status: 'SUCCESS'
    });

    return { 
      success: true, 
      message: "Xác thực email thành công, tenant đã được kích hoạt." 
    };
  }
}
