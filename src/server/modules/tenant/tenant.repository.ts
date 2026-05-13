import { db as prisma } from '../../core/db/prisma.js';
import { CacheManager } from '../../core/cache/manager.js';

export class TenantRepository {
  static async getAllPaginated(cursor?: string, take: number = 50) {
    // RLS-FIX: bảng tenants chỉ visible khi app.current_tenant_id = 'SYSTEM'
    // prisma.system() không set session variable này — phải dùng withTenant('SYSTEM')
    let result: { data: any[]; nextCursor: string | null } = { data: [], nextCursor: null };
    await prisma.withTenant('SYSTEM', async (tx) => {
      const tenants = await tx.tenant.findMany({
        orderBy: [
          { createdAt: 'desc' },
          { id: 'asc' }
        ],
        take: take + 1,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
      });

      let nextCursor: string | null = null;
      if (tenants.length > take) {
        const nextItem = tenants.pop();
        if (nextItem) nextCursor = nextItem.id;
      }
      result = { data: tenants, nextCursor };
    });
    return result;
  }

  static async getAll() {
    let tenants: any[] = [];
    await prisma.withTenant('SYSTEM', async (tx) => {
      tenants = await tx.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500
      });
    });
    return tenants;
  }

  static async getById(id: string) {
    const cacheKey = `tenant:${id}`;
    return await CacheManager.wrap(cacheKey, async () => {
      try {
        let tenant: any = null;
        await prisma.withTenant('SYSTEM', async (tx) => {
          tenant = await tx.tenant.findUnique({ where: { id } });
        });
        return tenant;
      } catch (err) {
        if (process.env.NODE_ENV !== 'production' && id.startsWith('mock-tenant-')) {
          return {
             id,
             name: 'Demo Tenant',
             subdomain: id.replace('mock-tenant-', ''),
             plan: 'PRO',
             subscriptionPlan: 'PRO',
             status: 'active'
          };
        }
        throw err;
      }
    }, 1800);
  }

  static async getBySubdomain(subdomain: string) {
    const cacheKey = `tenant:subdomain:${subdomain}`;
    return await CacheManager.wrap(cacheKey, async () => {
      // Platform alias: both 'system' and 'admin' can refer to the core admin workspace
      const querySubdomain = subdomain.toLowerCase();
      let tenant: any = null;
      await prisma.withTenant('SYSTEM', async (tx) => {
        tenant = await tx.tenant.findUnique({
          where: { subdomain: querySubdomain }
        });
      });
      return tenant;
    }, 1800);
  }

  static async save(data: any) {
    const id = data.id || crypto.randomUUID();
    
    let tenant: any = null;
    await prisma.withTenant('SYSTEM', async (tx) => {
      tenant = await tx.tenant.upsert({
        where: { id },
        update: {
          name: data.name,
          subdomain: data.subdomain,
          plan: data.plan,
          contactEmail: data.contactEmail || data.contact_email,
          contactPhone: data.contactPhone || data.contact_phone,
          ownerName: data.ownerName || data.owner_name,
          address: data.address,
          maxEmployees: data.maxEmployees || data.max_employees || 5,
          status: data.status || 'active'
        },
        create: {
          id,
          name: data.name,
          subdomain: data.subdomain,
          plan: data.plan || 'TRIAL',
          contactEmail: data.contactEmail || data.contact_email,
          contactPhone: data.contactPhone || data.contact_phone,
          ownerName: data.ownerName || data.owner_name,
          address: data.address,
          maxEmployees: data.maxEmployees || data.max_employees || 5,
          status: data.status || 'active'
        }
      });
    });

    // Invalidate caches
    await Promise.all([
      CacheManager.del(`tenant:${id}`),
      CacheManager.del(`tenant:subdomain:${tenant.subdomain}`),
      CacheManager.del(`tenant:status:${id}`)
    ]);
    
    return tenant;
  }
}

