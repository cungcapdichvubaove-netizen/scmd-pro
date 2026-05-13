import { db } from '../../core/db/prisma.js';
import bcrypt from 'bcryptjs';
import { logger } from '../../core/logger/index.js';
import { CacheManager } from '../../core/cache/manager.js';
import { Staff, createStaffSchema } from './staff.schema.js';
import { EventBus } from '../../core/events/event-bus.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { SecurityContext, UserRole } from '../../core/architecture/types.js';
import { StaffEntity } from './domain/staff.entity.js';

import { canonicalStringify } from '../../core/utils/normalization.js';

export class StaffRepository {
  private static readonly PROFILE_TTL = 3600; // 1 hour
  private static readonly LIST_TTL = 300; // 5 minutes

  private static getCacheKey(id: string) {
    return `staff:profile:${id}`;
  }

  private static getListCacheKey(tenantId: string, pageKey: string) {
    return `staff:list:${tenantId}:${pageKey}`;
  }

  private static normalizeFilters(f: any): string {
    return canonicalStringify(f || {});
  }

  /**
   * Retrieves all staff for a tenant.
   * If role is GUARD, this will effectively return ONLY themselves thanks to withTenant proxy.
   */
  static async getAllByTenant(ctx: SecurityContext, cursor?: string, limit: number = 20, filters?: { role?: string; status?: string; search?: string; view?: string }): Promise<{ data: Omit<Staff, 'password'>[], nextCursor: string | null }> {
    const isGuard = ctx.role === UserRole.GUARD;
    const filterKey = this.normalizeFilters(filters);
    const pageKey = (cursor || 'first') + ':' + filterKey;
    const cacheKey = this.getListCacheKey(ctx.tenantId, pageKey);

    return await CacheManager.wrap(cacheKey, async () => {
      const where: any = {};
      
      if (filters?.role && filters.role !== 'all') {
        where.role = filters.role;
      }
      
      if (filters?.status && filters.status !== 'all') {
        where.status = filters.status;
      }

      if (filters?.search) {
        const s = filters.search.trim();
        const searchConditions: any[] = [
          { fullName: { contains: s, mode: 'insensitive' } },
          { username: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } },
          { phone: { contains: s } } // Phone is numeric, doesn't need insensitive
        ];
        
        // If search looks like an exact ID fit
        if (s.length >= 8) {
          searchConditions.push({ id: { equals: s } });
        }

        where.OR = searchConditions;
      }

      const isMobileView = filters?.view === 'mobile';

      const data = await db.forTenant(ctx.tenantId, { ownerId: isGuard ? ctx.userId : undefined, readOnly: true }).staff.findMany({
        where,
        take: Math.min(limit, 200),
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ id: 'asc' }], // Cursor pagination needs stable ordering, usually ID
        select: {
          id: true,
          fullName: true,
          role: true,
          status: true,
          // Only fetch extra fields if NOT mobile view
          ...(isMobileView ? {} : {
            username: true,
            email: true,
            phone: true,
            qualifications: true,
            idNumber: true,
            licenseNumber: true,
            idExpiry: true,
            createdAt: true,
          })
        }
      });

      return { 
        data, 
        nextCursor: data.length === Math.min(limit, 200) ? data[data.length - 1].id : null 
      };
    }, this.LIST_TTL);
  }

  /**
   * Revokes all active sessions for a staff member by incrementing their token version.
   */
  static async revokeSessions(ctx: SecurityContext, id: string): Promise<void> {
    const { redis } = await import('../../infra/redis/client.js');
    
    await db.withTenant(ctx.tenantId, async (tx: any) => {
      const staff = await tx.staff.update({
        where: { id },
        data: {
          tokenVersion: { increment: 1 },
          updatedAt: new Date()
        }
      });

      // Update Redis cache immediately for instant revocation and profile invalidation
      await CacheManager.del(`auth_metadata:${id}`);
      await redis.set(`user_token_version:${id}`, staff.tokenVersion.toString(), 'EX', 3600);
      await CacheManager.del(this.getCacheKey(id));
      await CacheManager.delByPattern(`staff:list:${ctx.tenantId}:*`);
      
      logger.info({ userId: ctx.userId, targetId: id, version: staff.tokenVersion }, 'Sessions revoked for staff member');
    }, { callerRole: ctx.role });
  }

  static async getById(ctx: SecurityContext, id: string): Promise<Omit<Staff, 'password'> | null> {
    const cacheKey = this.getCacheKey(id);

    return await CacheManager.wrap(cacheKey, async () => {
      const isGuard = ctx.role === UserRole.GUARD;
      return await db.forTenant(ctx.tenantId, { ownerId: isGuard ? ctx.userId : undefined, readOnly: true }).staff.findUnique({
        where: { id },
        select: {
          id: true,
          tenantId: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          phone: true,
          tokenVersion: true,
          qualifications: true,
          idNumber: true,
          licenseNumber: true,
          idExpiry: true,
          createdAt: true,
          updatedAt: true,
        }
      });
    }, this.PROFILE_TTL);
  }

  /**
   * Internal method for auth-related lookups that NEED the password hash.
   */
  static async getByIdWithPassword(ctx: SecurityContext, id: string): Promise<Staff | null> {
    const isGuard = ctx.role === UserRole.GUARD;
    return await db.forTenant(ctx.tenantId, { ownerId: isGuard ? ctx.userId : undefined, readOnly: true }).staff.findUnique({
      where: { id }
    }) as Staff | null;
  }

  static async getEntityById(ctx: SecurityContext, id: string): Promise<StaffEntity | null> {
    const raw = await this.getByIdWithPassword(ctx, id);
    if (!raw) return null;
    return StaffEntity.create(raw.id, raw.tenantId, {
      username: raw.username,
      email: raw.email,
      fullName: raw.fullName,
      phone: raw.phone,
      role: raw.role,
      status: raw.status,
      password: raw.password,
      qualifications: raw.qualifications,
      idNumber: raw.idNumber,
      licenseNumber: raw.licenseNumber,
      idExpiry: raw.idExpiry ? new Date(raw.idExpiry) : null,
    }, raw.createdAt, raw.updatedAt);
  }

  static async save(ctx: SecurityContext, entity: StaffEntity): Promise<StaffEntity> {
    const isGuard = ctx.role === UserRole.GUARD;
    
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const before = await tx.staff.findUnique({ where: { id: entity.id } });
      if (!before) {
        const error: any = new Error('NOT_FOUND_OR_ACCESS_DENIED');
        error.status = 404;
        throw error;
      }

      const props = entity.getProps();
      const updated = await tx.staff.update({
        where: { id: entity.id },
        data: {
          email: props.email,
          fullName: props.fullName,
          phone: props.phone,
          role: props.role,
          status: props.status,
          qualifications: props.qualifications,
          idNumber: props.idNumber,
          licenseNumber: props.licenseNumber,
          idExpiry: props.idExpiry,
          updatedAt: new Date()
        }
      });

      // Invalidate Cache for consistency
      await Promise.all([
        CacheManager.del(this.getCacheKey(entity.id)),
        CacheManager.delByPattern(`staff:list:${ctx.tenantId}:*`),
        CacheManager.del(`auth_metadata:${entity.id}`)
      ]);

      // Domain Event
      await EventBus.dispatch({
        type: 'STAFF_UPDATED',
        version: '1.1',
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        payload: { 
          staffId: entity.id, 
          before: before,
          after: updated,
          changes: { status: props.status, role: props.role } 
        }
      }, tx);

      return entity;
    }, { ownerId: isGuard ? ctx.userId : undefined, callerRole: ctx.role });
  }

  /**
   * Creates a new staff member within a transaction.
   */
  static async create(ctx: SecurityContext, data: any): Promise<Staff> {
    const validated = createStaffSchema.parse(data);
    
    // CRITICAL: Hash password before persisting
    if (validated.password) {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
      (validated as any).password = await bcrypt.hash(validated.password, rounds);
    }
    
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      // 1. Check max employees limit
      const tenant = await tx.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { maxEmployees: true }
      });

      if (tenant) {
        const currentCount = await tx.staff.count({
          where: { tenantId: ctx.tenantId }
        });

        if (currentCount >= tenant.maxEmployees) {
          throw new Error('LIMIT_REACHED: Số lượng nhân viên đã đạt giới hạn tối đa của gói dịch vụ. Vui lòng nâng cấp hoặc xóa bớt nhân sự cũ.');
        }
      }

      // 2. Transactional check for duplicate username
      const existing = await tx.staff.findUnique({
        where: { username: validated.username }
      });
      if (existing) throw new Error('CONFLICT_USERNAME');

      // 3. Create staff record
      const staff = await tx.staff.create({
        data: {
          ...validated
        }
      });

      // Invalidate list cache
      await CacheManager.delByPattern(`staff:list:${ctx.tenantId}:*`);

      // 3. Dispatch Domain Event (Transactional Outbox)
      await EventBus.dispatch({
        type: 'STAFF_CREATED',
        version: '1.1',
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        payload: { staffId: staff.id, fullName: staff.fullName }
      }, tx);

      return staff as Staff;
    }, { callerRole: ctx.role });
  }

  static async update(ctx: SecurityContext, id: string, data: any): Promise<Staff> {
    const isGuard = ctx.role === UserRole.GUARD;
    
    // FIX 4.5: Password Security - Băm mật khẩu nếu có thay đổi trong Repository update path
    if (data.password) {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
      data.password = await bcrypt.hash(data.password, rounds);
    }

    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      // 1. Fetch current state for diffing (with ownership check if guard)
      const before = await tx.staff.findUnique({ where: { id } });
      if (!before) {
        const error: any = new Error('NOT_FOUND_OR_ACCESS_DENIED');
        error.status = 404;
        throw error;
      }

      // 2. Perform update
      const staff = await tx.staff.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      // Invalidate Caches
      await Promise.all([
        CacheManager.del(this.getCacheKey(id)),
        CacheManager.delByPattern(`staff:list:${ctx.tenantId}:*`),
        CacheManager.del(`auth_metadata:${id}`)
      ]);

      // 3. Log Sensitive Change with Diff
      await AuditService.logSensitiveChange(
        ctx.userId,
        ctx.tenantId,
        'UPDATE_STAFF',
        `staff/${id}`,
        before,
        staff
      );

      return staff as Staff;
    }, { ownerId: isGuard ? ctx.userId : undefined, callerRole: ctx.role });
  }

  static async delete(ctx: SecurityContext, id: string): Promise<void> {
    const { redis } = await import('../../infra/redis/client.js');
    
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const before = await tx.staff.findUnique({ where: { id } });
      if (!before) return; // Idempotent or Access Denied

      await tx.staff.delete({
        where: { id }
      });

      // Invalidate Cache
      await Promise.all([
        CacheManager.del(this.getCacheKey(id)),
        CacheManager.delByPattern(`staff:list:${ctx.tenantId}:*`),
        redis.del(`user_token_version:${id}`),
        CacheManager.del(`auth_metadata:${id}`)
      ]);

      // Domain Event
      await EventBus.dispatch({
        type: 'STAFF_DELETED',
        version: '1.1',
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        payload: { staffId: id, before }
      }, tx);
    }, { callerRole: ctx.role });
  }

  private static readonly DUMMY_HASH = '$2b$10$EixZA5VK1pJ4qC0XzYJ3beFsd5X7L.R5vY96lT0.K3Jp1r2q3s4t5'; // Balanced timing hash

  static async getByUsername(username: string, ip?: string): Promise<Staff | null> {
    // SECURITY SEC-003: Dùng db.withTenant('SYSTEM') để set app.current_tenant_id = 'SYSTEM' trong transaction.
    // PostgreSQL RLS require current_setting('app.current_tenant_id') = 'SYSTEM' để bypass tenant isolation.
    // Raw $queryRaw trực tiếp KHÔNG set biến này → RLS trả 0 rows → login luôn fail.
    let user: Staff | null = null;
    await db.withTenant('SYSTEM', async (tx) => {
      const results = await tx.$queryRaw<Staff[]>`
        SELECT * FROM "staff" WHERE username = ${username} LIMIT 1
      `;
      user = (results[0] as Staff) || null;
    }, { allowRaw: true });

    // Safety check: only allow super-admin if queried via global scope
    // We use a dummy comparison to prevent timing-based username enumeration
    if (!user || (user as Staff).role !== UserRole.SUPER_ADMIN) {
      // Simulate crypto work to match the timing of a successful lookup/check
      await bcrypt.compare('dummy_password', this.DUMMY_HASH);
      
      if (user) {
        logger.warn({ 
          username, 
          ip,
          role: (user as Staff).role, 
          category: 'SECURITY',
          alert_type: 'CROSS_TENANT_ENUMERATION_ATTEMPT'
        }, 'Potential cross-tenant username enumeration detected.');
      }
      return null;
    }

    if (ip) {
      logger.info({ username, ip, role: (user as Staff).role, category: 'SECURITY' }, 'Internal super-admin lookup success.');
    }
    
    return user;
  }

  static async getByUsernameAndTenant(username: string, tenantId: string): Promise<Staff | null> {
    // This is used for standard Tenant Login - SECURE ISOLATION
    // IMPORTANT: We use findFirst instead of findUnique because findUnique strips non-unique fields (tenantId)
    // from the where clause during extension chaining, causing a SECURITY_VIOLATION deep in the isolationGuard.
    return await db.forTenant(tenantId, { readOnly: true }).staff.findFirst({
      where: { username }
    }) as Staff | null;
  }

  /**
   * SMART RECOGNITION: Checks reputation across all tenants based on idNumber.
   * Returns counts of negative events without leaking tenant names.
   */
  static async checkReputation(idNumber: string): Promise<{ violations: number, severeViolations: number, incidents: number }> {
    if (!idNumber) return { violations: 0, severeViolations: 0, incidents: 0 };
    
    // Cross-tenant lookup using SYSTEM scope bypass
    const sys = db.systemBypass();
    const [violations, severeViolations, incidents] = await Promise.all([
      sys.disciplinaryAction.count({ where: { staff: { idNumber } } }),
      sys.disciplinaryAction.count({ where: { staff: { idNumber }, severity: 'HIGH' } }),
      sys.incident.count({ where: { assignee: { idNumber } } })
    ]);
    
    return { violations, severeViolations, incidents };
  }

  /**
   * Internal method for securely exporting Staff data to PDF across tenants.
   * Requires system-level bypass because internal requests don't have user context.
   * Strictly limited use.
   */
  static async getInternalExportData(id: string): Promise<{ staff: any, tenant: any } | null> {
    const sys = db.systemBypass({ readOnly: true });
    const staff = await sys.staff.findUnique({ where: { id } });
    if (!staff) return null;
    
    const tenant = await sys.tenant.findUnique({ where: { id: staff.tenantId } });
    return { staff, tenant };
  }
}