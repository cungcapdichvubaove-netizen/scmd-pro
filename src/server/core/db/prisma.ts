import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { AsyncLocalStorage } from 'async_hooks';
import { logger } from '../logger/index.js';
import { metrics } from '../metrics.js';

// FIX: AsyncLocalStorage để truyền SYSTEM bypass context vào isolationGuard
// thay vì tx.$extends() (không hoạt động trên Prisma transaction client)
const systemBypassContext = new AsyncLocalStorage<boolean>();

const { Pool } = pg;

/**
 * FIX #1: Auto build DATABASE_URL từ POSTGRES_* nếu thiếu
 * KHÔNG phá logic cũ, chỉ bổ sung
 */
if (!process.env.DATABASE_URL) {
  const {
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
  } = process.env;

  if (POSTGRES_USER && POSTGRES_PASSWORD && POSTGRES_DB) {
    process.env.DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}`;
    logger.warn('⚠️ DATABASE_URL auto-built from POSTGRES_* env');
  }
}

const dbUrl = process.env.DATABASE_URL;
const isExplicitMock = process.env.MOCK_MODE === 'true';
const isDbMissing =
  !dbUrl ||
  dbUrl === 'undefined' ||
  dbUrl === 'null' ||
  dbUrl === '';

const isProduction = process.env.NODE_ENV === 'production';
const useMock = !isProduction && (isDbMissing || isExplicitMock);

if (useMock) {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
  }
  logger.warn(`⚠️ Prisma will operate in MOCK mode (Reason: ${isExplicitMock ? 'Explicit MOCK_MODE=true' : 'DATABASE_URL is missing'})`);
}

const isProxy = process.env.DATABASE_URL?.includes('pgbouncer=true') || process.env.DATABASE_URL?.includes('supavisor=true');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  /**
   * ⚡ OPTIMIZATION: Nếu dùng Proxy (PgBouncer/Supavisor) ở Transaction Mode, 
   * client pool nên nhỏ lại để Proxy quản lý tập trung. 
   * Với SaaS Multi-tenancy, điều này ngăn chặn tình trạng "Thâm hụt connection" khi scale-up instances.
   */
  max: isProxy ? Math.min(parseInt(process.env.DB_POOL_MAX || '20'), 10) : parseInt(process.env.DB_POOL_MAX || '20'),
  min: isProxy ? 1 : parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
});

// Fix [M1]: Monitor pool usage
pool.on('connect', () => { 
  metrics.updateDBPool(pool.idleCount, pool.totalCount - pool.idleCount);
});
pool.on('acquire', () => { 
  metrics.updateDBPool(pool.idleCount, pool.totalCount - pool.idleCount);
});
pool.on('error', (err) => logger.error({ err }, 'Pool error'));

/**
 * Returns current database pool statistics.
 */
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    active: pool.totalCount - pool.idleCount,
    waiting: pool.waitingCount,
  };
}

// Periodically sync pool metrics to prometheus registry.
// `unref()` keeps long-running services observable without pinning one-off scripts.
const poolMetricsInterval = setInterval(() => {
  const stats = getPoolStats();
  metrics.updateDBPool(stats.idle, stats.active);
}, 15000);
poolMetricsInterval.unref();

const adapter = new PrismaPg(pool);

/**
 * [INFO] ARCH-TRADE-OFF: Prisma Generic Types
 * `createExtendedPrisma` expects `PrismaClient`. To achieve this, instances passed here 
 * (như baseIsolation) phải được cast `as unknown as typeof internalPrisma`.
 * Điều này làm mất một phần Type Inference của các extensions nội bộ (loss of strict typing
 * for intermediate hooks) để bảo vệ Public API boundaries ($queryRaw<T>) không bị vỡ type chữ ký.
 * Đây là hi sinh chủ đích đổi lấy Type-safety ở usecases/controllers.
 */
function createExtendedPrisma(internalClient: PrismaClient) {
  return internalClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (useMock || checkCircuitBreaker()) {
            const { handlePrismaMock } = await import('./prisma.mock.js');
            return handlePrismaMock(model, operation, args);
          }

          try {
            return await query(args);
          } catch (err: any) {
            if (handleDbFailover(err)) {
              const { handlePrismaMock } = await import('./prisma.mock.js');
              return handlePrismaMock(model, operation, args);
            }
            throw err;
          }
        }
      },
      async $queryRaw({ args, query }: any) {
        if (useMock || checkCircuitBreaker()) {
          const { handlePrismaMock } = await import('./prisma.mock.js');
          return handlePrismaMock('$RAW', '$queryRaw', args);
        }
        try {
          return await query(args);
        } catch (err: any) {
          if (handleDbFailover(err)) {
             const { handlePrismaMock } = await import('./prisma.mock.js');
             return handlePrismaMock('$RAW', '$queryRaw', args);
          }
          throw err;
        }
      },
      async $executeRaw({ args, query }: any) {
        if (useMock || checkCircuitBreaker()) return 0;
        try {
          return await query(args);
        } catch (err: any) {
          if (handleDbFailover(err)) return 0;
          throw err;
        }
      },
      async $executeRawUnsafe({ args, query }: any) {
        if (useMock || checkCircuitBreaker()) return 0;
        try {
          return await query(args);
        } catch (err: any) {
          if (handleDbFailover(err)) return 0;
          throw err;
        }
      },
      async $queryRawUnsafe({ args, query }: any) {
        if (useMock || checkCircuitBreaker()) {
          const { handlePrismaMock } = await import('./prisma.mock.js');
          return handlePrismaMock('$RAW', '$queryRawUnsafe', args);
        }
        try {
          return await query(args);
        } catch (err: any) {
          if (handleDbFailover(err)) {
             const { handlePrismaMock } = await import('./prisma.mock.js');
             return handlePrismaMock('$RAW', '$queryRawUnsafe', args);
          }
          throw err;
        }
      }
    }
  });
}

function createIsolationGuard(baseClient: any) {
  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (
            ['$queryRaw', '$executeRaw', '$queryRawUnsafe', '$executeRawUnsafe'].includes(operation)
          ) {
            logger.error({ operation, model }, 'SECURITY ALERT: RAW SQL blocked');
            throw new Error('SECURITY_VIOLATION');
          }

          if (isTenantScopedModel(model)) {
            const isRead = ['findMany', 'findFirst', 'findUnique', 'count', 'groupBy', 'aggregate'].includes(operation);
            // FIX: Đọc bypass context từ AsyncLocalStorage thay vì tx.$extends() (không hoạt động trong transaction)
            const isBypass = systemBypassContext.getStore() === true || args?.bypassIsolation_SYSTEM_ONLY === true;

            if (isBypass) {
              const injectedTenantId = args.where?.tenantId || args.where?.tenant_id;
              if (injectedTenantId && injectedTenantId !== 'SYSTEM' && injectedTenantId !== 'PLATFORM') {
                logger.error({ model, operation, tenantId: injectedTenantId }, 'SECURITY VIOLATION: bypassIsolation_SYSTEM_ONLY attempted in tenant context');
                throw new Error('SECURITY_VIOLATION: System bypass only allowed in SYSTEM context');
              }
            }

            if (isRead && !isBypass && (!args.where || (args.where.tenantId === undefined && args.where.tenant_id === undefined))) {
              logger.error({ model, operation, where: args.where }, 'SECURITY ALERT: Unscoped query detected on tenant-scoped model');
              throw new Error(`SECURITY_VIOLATION: Unscoped query on ${model}. Tenant scope is mandatory.`);
            }
          }

          const { bypassIsolation_SYSTEM_ONLY, ...cleanArgs } = args || {};
          return query(cleanArgs);
        }
      }
    }
  });
}

const internalPrisma = new PrismaClient({
  adapter: useMock ? null : adapter,
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ],
});

internalPrisma.$on('error', (e: any) => {
  if (
    e?.message?.includes('P1001') ||
    e?.message?.includes("Can't reach database server") ||
    e?.message?.includes('Database not reachable') ||
    e?.message?.includes('127.0.0.1:5432')
  ) {
    return;
  }
  console.error('[Prisma Error]', e.message);
});

let databaseUnreachable = false;
let warningShown = false;
let lastDbProbeTime = 0;
const DB_PROBE_INTERVAL = 30000;

function checkCircuitBreaker() {
  if (!databaseUnreachable) return false;
  if (isProduction) return false; // NEVER fallback to mock in production
  if (process.env.STRICT_DB_TEST === 'true') return false;
  
  const now = Date.now();
  if (now - lastDbProbeTime > DB_PROBE_INTERVAL) {
    lastDbProbeTime = now;
    probeDatabase().catch(() => {});
  }
  return true; // Still unreachable for current query
}

async function probeDatabase() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    databaseUnreachable = false;
    warningShown = false;
    logger.info('🚀 [SCMD-DB] Database connection recovered. Circuit breaker CLOSED. Exiting failover mock mode.');
  } catch (err) {
    // Still down, do nothing
  }
}

function handleDbFailover(err: any): boolean {
  if (isProduction) return false; // NEVER fallback to mock in production
  if (process.env.STRICT_DB_TEST === 'true') return false;
  const isConnError = 
    err?.code === 'P1001' || 
    err?.code === 'P2010' ||
    err?.message?.includes('database server') || 
    err?.message?.includes('database') ||
    err?.message?.includes('127.0.0.1:5432');
    
  if (isConnError) {
    if (!databaseUnreachable) {
      databaseUnreachable = true;
      lastDbProbeTime = Date.now();
      if (!warningShown) {
        const maskedUrl = process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@');
        logger.error({ 
          code: err?.code, 
          message: err?.message, 
          url: maskedUrl 
        }, '🚨 [SCMD-DB] Real database unreachable (Failover runtime incident). Entering fallback Mock mode to prevent crashes.');
        
        console.info(`ℹ️ [SCMD-DB] Connection target: ${maskedUrl}`);
        console.info('ℹ️ [SCMD-DB] Real database not found. Entering Preview Mode using Mock storage.');
        warningShown = true;
      }
    }
    return true;
  }
  return false;
}

const TENANT_SCOPED_MODELS = [
  'Staff',
  'Checkpoint',
  'PatrolLog',
  'EventOutbox',
  'Incident',
  'IncidentTimeline',
  'IncidentEvidence',
  'IncidentSlaRule',
  'AttendanceRecord',
  'Notification',
  'Vendor',
  'Site',
  'GuardPost',
  'Contract',
  'ComplianceScore',
  'Audit',
  'DisciplinaryAction',
  'Task',
  'MonthlyStrategyInsight',
  'ShiftSchedule',
  'ShiftComplianceItem',
  'StaffPerformanceMetric',
  'Feedback',
  'AuditLog',
  'PatrolBenchmarkDeviation',
  'PatrolRoute',
  'PatrolRouteCheckpoint',
  'PatrolAssignment',
  'ShiftSession',
  'PatrolSession',
  'ViolationEvent',
  'Attachment',
  'Image',
  'TenantUsageEvent',
  'CheckpointBenchmarkSession',
  'VendorScorecard',
  'MonthlyAcceptanceReport',
  'PenaltyItem',
  'ViolationDispute',
  'ContractPenaltyRule',
  'ContractVersion',
  'ContractLineItem',
  'ContractChecklistRequirement',
  'ContractShiftRequirement',
  'ContractStaffStandard',
  'ShiftAssignment'
];

function isTenantScopedModel(model: string) {
  // Case-insensitive check to prevent leaks due to model naming mismatches in different extensions
  return TENANT_SCOPED_MODELS.some(m => m.toLowerCase() === (model || '').toLowerCase());
}

const baseIsolation = createIsolationGuard(internalPrisma) as unknown as typeof internalPrisma;
const isolationGuard = createExtendedPrisma(baseIsolation);

// SEC-NEW-8: Read Replica Support
let isolationReadGuard = isolationGuard;
let readPool: pg.Pool | null = null;
let baseReadPrisma: typeof internalPrisma | null = null;

if (process.env.DATABASE_READ_URL && process.env.DATABASE_READ_URL !== process.env.DATABASE_URL) {
  readPool = new Pool({
    connectionString: process.env.DATABASE_READ_URL,
    max: isProxy ? Math.min(parseInt(process.env.DB_POOL_MAX || '20'), 10) : parseInt(process.env.DB_POOL_MAX || '20'),
    min: isProxy ? 1 : parseInt(process.env.DB_POOL_MIN || '2'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });
  
  readPool.on('error', (err) => logger.error({ err }, 'Read Pool error'));
  
  const readAdapter = new PrismaPg(readPool);
  
  const internalReadPrisma = new PrismaClient({
    adapter: useMock ? null : readAdapter,
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' }
    ],
  });
  
  internalReadPrisma.$on('error', (e: any) => {
    if (
      e?.message?.includes('P1001') ||
      e?.message?.includes("Can't reach database server")
    ) {
      return;
    }
    console.error('[Prisma Read Error]', e.message);
  });
  
  baseReadPrisma = createIsolationGuard(internalReadPrisma) as unknown as typeof internalPrisma;
  isolationReadGuard = createExtendedPrisma(baseReadPrisma);
  logger.info('🚀 [SCMD-DB] Read Replica connection pool initialized');
}

function createTenantClient(base: any, tenantId: string, options?: { ownerId?: string }) {
  return new Proxy(base, {
    get(target: any, modelName: string) {
      if (typeof modelName !== 'string' || modelName.startsWith('$') || modelName === 'Prisma' || !isTenantScopedModel(modelName)) {
        return target[modelName];
      }

      const modelDelegate = target[modelName];
      if (!modelDelegate) return undefined;

      return new Proxy(modelDelegate, {
        get(modelTarget, operation: string) {
          if (typeof modelTarget[operation] !== 'function') {
            return modelTarget[operation];
          }

          return async (args: any = {}) => {
            const clonedArgs = { ...args };
            if (clonedArgs.bypassIsolation_SYSTEM_ONLY) {
              logger.warn({ model: modelName, operation, tenantId }, 'Attempted to use bypassIsolation_SYSTEM_ONLY in tenant client. Stripping flag.');
              delete clonedArgs.bypassIsolation_SYSTEM_ONLY;
            }

            if (['findUnique', 'findUniqueOrThrow', 'update', 'delete'].includes(operation)) {
              if (operation === 'update' || operation === 'delete') {
                 // Must check existence & ownership BEFORE mutation
                 const whereCheck = { ...clonedArgs.where, tenantId };
                 if (options?.ownerId && modelName.toLowerCase() === 'staff') {
                    whereCheck.id = options.ownerId;
                 }
                 const existing = await target[modelName].findFirst({ where: whereCheck });
                 if (!existing) {
                    const error: any = new Error(`PrismaClientKnownRequestError: Record to ${operation} not found.`);
                    error.code = 'P2025';
                    error.name = 'NotFoundError';
                    throw error;
                 }
                 // Safe to proceed with mutation using original args.
                 return modelTarget[operation](clonedArgs);
              } else {
                 // findUnique or findUniqueOrThrow -> mapped to findFirst internally
                 // We execute this on target (base) to go to next middleware 
                 const findArgs = { ...clonedArgs, where: { ...clonedArgs.where, tenantId } };
                 if (options?.ownerId && modelName.toLowerCase() === 'staff') {
                    findArgs.where.id = options.ownerId;
                 }
                 const result = await target[modelName].findFirst(findArgs);
                 
                 if (!result && operation === 'findUniqueOrThrow') {
                    const error: any = new Error(`PrismaClientKnownRequestError: Record not found.`);
                    error.code = 'P2025';
                    error.name = 'NotFoundError';
                    throw error;
                 }
                 return result;
              }
            }

            if (['findMany','findFirst','count','updateMany','deleteMany','aggregate','groupBy'].includes(operation)) {
              clonedArgs.where = { ...clonedArgs.where, tenantId };
              
              if (options?.ownerId && modelName.toLowerCase() === 'staff') {
                clonedArgs.where.id = options.ownerId;
              }
            } else if (operation === 'create' || operation === 'createMany') {
              if (operation === 'create') {
                clonedArgs.data = { ...clonedArgs.data, tenantId };
              } else {
                 if (Array.isArray(clonedArgs.data)) {
                   clonedArgs.data = clonedArgs.data.map((item: any) => ({ ...item, tenantId }));
                 }
              }
            }

            return modelTarget[operation](clonedArgs);
          };
        }
      });
    }
  });
}

export const isDatabaseUnreachable = () => databaseUnreachable;

export const db = {
  forTenant(tenantId: string, options?: { ownerId?: string, readOnly?: boolean }) {
    if (!tenantId) throw new Error('SECURITY_CRITICAL');
    const baseGuard = options?.readOnly ? isolationReadGuard : isolationGuard;
    return createTenantClient(baseGuard, tenantId, options);
  },
  system(options?: { readOnly?: boolean }) { 
    return options?.readOnly ? isolationReadGuard : isolationGuard; 
  },
  /**
   * Provides a client that explicitly authorizes cross-tenant lookups.
   * MUST only be used by allowlisted repositories with a reason and caller.
   */
  systemBypass(options: { readOnly?: boolean; reason: string; caller: string }) {
    if (!options?.reason || !options?.caller) {
      throw new Error('SECURITY_CRITICAL: systemBypass requires reason and caller');
    }
    logger.warn({
      reason: options.reason,
      caller: options.caller,
      readOnly: options.readOnly === true,
      category: 'SECURITY',
      event: 'SYSTEM_BYPASS_USED'
    }, 'System bypass client requested.');
    const baseGuard = options?.readOnly ? isolationReadGuard : isolationGuard;
    return baseGuard.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }: any) {
            return query({ ...args, bypassIsolation_SYSTEM_ONLY: true });
          }
        }
      }
    });
  },
  $queryRaw: <T = any>(...args: any[]) => (isolationReadGuard as any).$queryRaw(...args) as Promise<T>,
  $executeRaw: <T = any>(...args: any[]) => (isolationGuard as any).$executeRaw(...args) as Promise<T>,
  async withTenant<T>(
    tenantId: string | 'SYSTEM' | 'PLATFORM',
    operation: (tx: any) => Promise<T>,
    options?: { allowRaw?: boolean; readOnly?: boolean; ownerId?: string; callerRole?: string; timeout?: number }
  ): Promise<T> {
    if (!tenantId) {
      logger.error('SECURITY_CRITICAL: tenantId is missing in db.withTenant');
      throw new Error('SECURITY_CRITICAL: tenantId is required for db.withTenant');
    }

    const baseGuard = options?.readOnly ? isolationReadGuard : isolationGuard;

    // FIX [MEDIUM]: RLS & Mock logic isolation
    // Nếu là Mock mode, chúng ta buộc phải bypass $transaction vì DB không có thực
    if (useMock || checkCircuitBreaker()) {
      const client = (tenantId === 'SYSTEM' || tenantId === 'PLATFORM')
        ? baseGuard
        : createTenantClient(baseGuard, tenantId, options);
      return await operation(client as any);
    }

    try {
      // V4.24.0: Default ON for RLS. Use SKIP_DB_RLS_ON_READ=true to opt-out for performance.
      if (options?.readOnly && process.env.SKIP_DB_RLS_ON_READ === 'true') {
        const client = (tenantId === 'SYSTEM' || tenantId === 'PLATFORM')
          ? isolationReadGuard
          : createTenantClient(isolationReadGuard, tenantId, options);
        return await operation(client as any);
      }

      return await isolationGuard.$transaction(async (tx: any) => {
        // Platform level operations - set RLS to 'SYSTEM' để bypass tenant isolation
        if (tenantId === 'SYSTEM' || tenantId === 'PLATFORM') {
          // BẮT BUỘC [RLS-FIX]: set_config 'SYSTEM' để PostgreSQL RLS cho phép cross-tenant access.
          // Thiếu dòng này → current_setting('app.current_tenant_id', true) = '' → RLS block mọi query
          // kể cả seed.ts (upsert tenant/staff) và StaffRepository.getByUsername ($queryRaw super-admin lookup).
          await tx.$executeRaw`SELECT set_config('app.current_tenant_id', 'SYSTEM', true)`;
          // FIX [SYSTEM-BYPASS]: Thay tx.$extends() (không hoạt động trong Prisma transaction)
          // bằng AsyncLocalStorage.run() để inject SYSTEM bypass context cho isolationGuard.
          return await systemBypassContext.run(true, () => operation(tx as any));
        }

        // BẮT BUỘC [RLS]: Thiết lập RLS session variable cho PostgreSQL (Bảo vệ dữ liệu chéo tenant)
        const safeTenantId = tenantId.replace(/[^a-zA-Z0-9_\-]/g, '');
        
        // SECURITY [C-03]: Extra validation for SYSTEM keyword to prevent accidental or malicious bypass
        if (safeTenantId === 'SYSTEM' && options?.callerRole !== 'super-admin') {
          logger.error({ tenantId, options }, 'SECURITY_VIOLATION: Unauthorized attempt to set RLS to SYSTEM');
          throw new Error('FORBIDDEN: UNAUTHORIZED_TENANT_ACCESS');
        }

        // SECURITY [C-03]: Dùng parameterized query để ngăn chặn SQL Injection và đảm bảo an toàn định danh
        // Dùng set_config để parameterize GUC variable (app.current_tenant_id)
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${safeTenantId}, true)`;

        // allowRaw: pass raw tx directly so $executeRaw / $queryRaw (e.g. PostGIS) work
        // FIX: Still wrap with tenant client to ensure model operations are scoped
        if (options?.allowRaw) {
          const tenantTx = createTenantClient(tx, tenantId, options);
          return await operation(tenantTx as any);
        }

        // Inject isolation client
        const tenantTx = createTenantClient(tx, tenantId, options);
        return await operation(tenantTx as any);
      }, {
        isolationLevel: 'ReadCommitted',
        timeout: options?.timeout || (options?.readOnly ? 5000 : 10000)
      });
    } catch (err: any) {
      if (handleDbFailover(err)) {
        const client = (tenantId === 'SYSTEM' || tenantId === 'PLATFORM')
          ? baseGuard
          : createTenantClient(baseGuard, tenantId, options);
        return await operation(client as any);
      }
      throw err;
    }
  },
  async disconnect() {
    logger.info('🛑 Disconnecting database...');
    await isolationGuard.$disconnect();
    if (isolationReadGuard) await isolationReadGuard.$disconnect();
    await pool.end();
    if (readPool) await readPool.end();
    logger.info('✅ Database disconnected');
  }
};

// Internal prisma instance unexported to prevent bypass
// export const prisma = basePrisma;
