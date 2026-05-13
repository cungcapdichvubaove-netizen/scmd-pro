import { logger } from '../logger/index.js';
import { mockSharedData, saveMockDataDebounced } from '../mock-store.js';

import bcrypt from 'bcryptjs';

/**
 * Mock handler cho Prisma khi DB không khả dụng (dev/preview mode).
 * Được gọi bởi prisma.ts khi gặp lỗi P1001 (DB unreachable) ở môi trường non-production.
 *
 * KHÔNG import file này trong production. Chỉ được lazy-import qua prisma.ts.
 */
export function handlePrismaMock(model: string, operation: string, args: any): any {
    // Normalize model name (PascalCase) to match store keys and handle case-insensitivity
    const normalizedModel = (model || '').charAt(0).toUpperCase() + (model || '').slice(1);
    
    logger.warn(
        `[MockHandler] DB unreachable. Intercepting Prisma query: ${normalizedModel}.${operation}`
    );

    // Khởi tạo store cho model nếu chưa có hoặc rỗng
    if (!mockSharedData[normalizedModel] || mockSharedData[normalizedModel].length === 0) {
        if (!mockSharedData[normalizedModel]) mockSharedData[normalizedModel] = [];

        // Seed dữ liệu mặc định nếu không có trong file
        if (normalizedModel === 'Tenant') {
            mockSharedData[normalizedModel].push({
                id: 'tenant_1',
                name: 'Demo Security Company',
                subdomain: 'demo',
                plan: 'PRO',
                subscriptionPlan: 'PRO',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        if (normalizedModel === 'Staff' && mockSharedData[normalizedModel].length === 0) {
            const defaultPassword = bcrypt.hashSync('admin', 10);
            
            // Seed Super Admin
            mockSharedData[normalizedModel].push({
                id: 'super-admin-id',
                tenantId: 'tenant_system',
                username: 'superadmin',
                password: defaultPassword,
                fullName: 'System Administrator',
                role: 'super-admin',
                status: 'active',
                tokenVersion: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Seed platform admin
            mockSharedData[normalizedModel].push({
              id: 'staff-demo-admin',
              tenantId: 'tenant_1',
              username: 'admin',
              password: defaultPassword,
              fullName: 'Quản trị viên Demo',
              role: 'tenant-admin',
              status: 'active',
              tokenVersion: 1,
              createdAt: new Date(),
              updatedAt: new Date()
            });
        }
    }

    switch (operation) {
        case 'findMany':
            return handleFindMany(normalizedModel, args);

        case 'findUnique':
        case 'findFirst':
        case 'findUniqueOrThrow':
        case 'findFirstOrThrow':
            return handleFindOne(normalizedModel, operation, args);

        case 'create':
            return handleCreate(normalizedModel, args);

        case 'update':
            return handleUpdate(normalizedModel, args);

        case 'upsert':
            return handleUpsert(normalizedModel, args);

        case 'delete':
            return handleDelete(normalizedModel);

        case 'count':
            return handleFindMany(normalizedModel, args).length;

        case 'deleteMany':
        case 'updateMany':
            return { count: 1 };

        case 'groupBy':
        case 'aggregate':
            return [];

        case '$queryRaw':
        case '$queryRawUnsafe':
            return handleRawQuery(args);

        default:
            return null;
    }
}

function handleRawQuery(args: any): any[] {
  const queryStr = Array.isArray(args) ? args[0] : (typeof args === 'string' ? args : '');
  
  if (queryStr.includes('FROM checkpoints') || queryStr.includes('FROM "checkpoints"')) {
    const store = mockSharedData['Checkpoint'] || [];
    // Seed some checkpoints if empty to make UI look good in preview
    if (store.length === 0) {
      const mockPoints = [
        { id: 'cp-1', name: 'Cổng chính (Main Gate)', status: 'active', latitude: 10.762622, longitude: 106.660172 },
        { id: 'cp-2', name: 'Kho bãi A', status: 'active', latitude: 10.763622, longitude: 106.661172 },
        { id: 'cp-3', name: 'Khu văn phòng', status: 'active', latitude: 10.761622, longitude: 106.659172 }
      ];
      mockPoints.forEach(p => {
        store.push({
          ...p,
          tenantId: 'tenant_1',
          updatedAt: new Date()
        });
      });
    }
    return store.map((cp: any) => ({
      id: cp.id,
      name: cp.name,
      status: cp.status,
      latitude: cp.latitude || 10.762622,
      longitude: cp.longitude || 106.660172,
      updatedAt: cp.updatedAt || new Date()
    }));
  }

  // Handle SuperAdmin Global Lookup (Raw SQL)
  if (queryStr.includes('FROM "Staff"') && queryStr.includes('username =')) {
    const store = mockSharedData['Staff'] || [];
    const username = Array.isArray(args) && args.length > 1 ? args[1] : '';
    const result = store.filter((s: any) => s.username === username);
    return result;
  }

  return [];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Match một item trong store với điều kiện where của Prisma.
 */
function matchesWhere(item: any, where: Record<string, any>): boolean {
  if (!where || Object.keys(where).length === 0) return true;

  return Object.keys(where).every(key => {
    const condition = where[key];

    // Handle logical OR
    if (key === 'OR' && Array.isArray(condition)) {
      return condition.some(subWhere => matchesWhere(item, subWhere));
    }

    // Handle logical AND
    if (key === 'AND' && Array.isArray(condition)) {
      return condition.every(subWhere => matchesWhere(item, subWhere));
    }

    // Prisma ignores undefined conditions in the where object
    if (condition === undefined) return true;

    const itemValue = item[key];

    if (condition && typeof condition === 'object') {
      // Handle contains for fuzzy search
      if (condition.contains !== undefined) {
        if (typeof itemValue !== 'string') return false;
        return itemValue.toLowerCase().includes(condition.contains.toLowerCase());
      }
      // Handle equals
      if (condition.equals !== undefined) {
        return itemValue === condition.equals;
      }
      // Handle in/notIn
      if (condition.in !== undefined && Array.isArray(condition.in)) {
        return condition.in.includes(itemValue);
      }
      if (condition.notIn !== undefined && Array.isArray(condition.notIn)) {
        return !condition.notIn.includes(itemValue);
      }
      // Handle numeric comparisons
      if (condition.gt !== undefined) return itemValue > condition.gt;
      if (condition.gte !== undefined) return itemValue >= condition.gte;
      if (condition.lt !== undefined) return itemValue < condition.lt;
      if (condition.lte !== undefined) return itemValue <= condition.lte;
    }

    return itemValue === condition;
  });
}

function handleFindMany(model: string, args: any): any[] {
  const store: any[] = mockSharedData[model] || [];
  
  if (!args?.where) return store;

  // STRICT ISOLATION CHECK: If model is Staff and we are not in systemBypass mode,
  // we must ensure that we ONLY return items matching the requested tenantId.
  // This prevents Super Admin data (system tenant) from leaking into tenant-specific views.
  return store.filter(item => {
    // If we're looking for a specific tenant in where clause, we MUST match it
    if (args.where.tenantId && item.tenantId !== args.where.tenantId) {
      return false;
    }
    return matchesWhere(item, args.where);
  });
}

function handleFindOne(model: string, operation: string, args: any): any {
  const store: any[] = mockSharedData[model] || [];
  const hasWhere = args?.where && Object.keys(args.where).length > 0;

  if (hasWhere) {
    const result = store.find(item => {
      if (args.where.tenantId && item.tenantId !== args.where.tenantId) {
        return false;
      }
      return matchesWhere(item, args.where);
    });
    if (!result && operation.includes('OrThrow')) {
      throw new Error(`Mock NotFoundError: ${model} not found with matching criteria`);
    }
    return result ?? null;
  }

  // If no where clause, return first item (classic findFirst behavior) 
  // but only if it's not a tenant-scoped model or if we are in system context.
  // Actually, in mock mode we prefer to be strict.
  return operation.includes('OrThrow') ? (store[0] || (() => { throw new Error('Empty store'); })()) : (store[0] ?? null);
}

function handleCreate(model: string, args: any): any {
  const newRecord = {
    id: `mock-${model.toLowerCase()}-${Date.now()}`,
    ...args?.data,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  mockSharedData[model].push(newRecord);
  saveMockDataDebounced();
  return newRecord;
}

function handleUpdate(model: string, args: any): any {
  const store: any[] = mockSharedData[model] || [];
  if (store.length === 0) return null;

  const hasWhere = args?.where && Object.keys(args.where).length > 0;
  if (!hasWhere) {
    logger.warn({ model }, 'MockHandler: Update called without where clause. Denying to prevent bulk corruption.');
    return null;
  }

  const idx = store.findIndex(item => matchesWhere(item, args.where));
  if (idx < 0) return null;

  store[idx] = { ...store[idx], ...args?.data, updatedAt: new Date() };
  saveMockDataDebounced();
  return store[idx];
}

function handleUpsert(model: string, args: any): any {
  const store: any[] = mockSharedData[model] || [];
  const keys = args?.where ? Object.keys(args.where) : [];
  const existingIndex = keys.length > 0
    ? store.findIndex(item => matchesWhere(item, args.where))
    : -1;

  let result: any;
  if (existingIndex >= 0) {
    result = { ...store[existingIndex], ...args.update, updatedAt: new Date() };
    store[existingIndex] = result;
  } else {
    result = {
      id: `mock-${model.toLowerCase()}-${Date.now()}`,
      ...args.create,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    store.push(result);
  }

  saveMockDataDebounced();
  return result;
}

function handleDelete(model: string): any {
  const store: any[] = mockSharedData[model] || [];
  return store.length > 0 ? store.pop() : null;
}