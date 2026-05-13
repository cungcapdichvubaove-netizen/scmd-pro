import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasPermission, hasPermissionSync, ROLE_PERMISSIONS, refreshDynamicPermissions } from './permissions.js';
import { db } from '../db/prisma.js';
import { cache } from '../cache/index.js';
import { UserRole } from '../architecture/types.js';

// Mock dependencies
vi.mock('../db/prisma.js', () => ({
  db: {
    system: vi.fn(),
  }
}));

vi.mock('../cache/index.js', () => ({
  cache: {
    get: vi.fn(),
    increment: vi.fn(),
    getOrFetch: vi.fn()
  }
}));

vi.mock('../logger/index.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Dynamic Permission Engine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset local state in permissions.ts
    vi.mocked(cache.increment).mockResolvedValue(1);
    await refreshDynamicPermissions();
  });

  it('should load from DB, use cache hit, and return true for authorized action', async () => {
    const customPerms = {
      ...ROLE_PERMISSIONS,
      [UserRole.GUARD]: ['log:read', 'task:read'] // Removed 'log:write' and 'checkpoint:read' which are default for GUARD
    };
    
    const mockSystemConfig = {
      findUnique: vi.fn().mockResolvedValue({
        key: 'role_permissions',
        value: customPerms
      })
    };
    
    vi.mocked(db.system).mockReturnValue({
      systemConfig: mockSystemConfig
    } as any);

    vi.mocked(cache.get).mockResolvedValue(1); // Set remote cache version
    
    // First time, it will call getOrFetch and our fetcher should hit the DB
    vi.mocked(cache.getOrFetch).mockImplementation(async (key, fetcher) => {
      // Simulate fetcher executing and returning DB config
      return await (fetcher as Function)();
    });

    // Action A: check recognized permission for GUARD
    const resRead = await hasPermission(UserRole.GUARD, 'log:read');
    expect(resRead).toBe(true);
    
    // Should have checked DB
    expect(mockSystemConfig.findUnique).toHaveBeenCalledTimes(1);
    expect(cache.getOrFetch).toHaveBeenCalledTimes(1);
    
    // Action B: check multiple times to ensure short-circuit local cache works 
    // Typescript might complain, so cast to any if we are faking it, but wait, 'log:write' is a valid Permission string.
    const resWrite = await hasPermission(UserRole.GUARD, 'log:write');
    expect(resWrite).toBe(false); // Because we removed it in customPerms
    
    const resTask = await hasPermission(UserRole.GUARD, 'task:read');
    expect(resTask).toBe(true);

    // Call count should STILL be 1 because of short circuit `now - lastLoadTime < 2000`
    expect(mockSystemConfig.findUnique).toHaveBeenCalledTimes(1);
    expect(cache.getOrFetch).toHaveBeenCalledTimes(1);
  });

  it('SUPER_ADMIN should ALWAYS be permitted regardless of DB mapping', async () => {
    // Provide empty config, the system MUST still let SUPER_ADMIN through
    vi.mocked(cache.get).mockResolvedValue(1);
    vi.mocked(cache.getOrFetch).mockImplementation(async () => ({})); // returns empty permissions mapping

    // SUPER_ADMIN
    const res = await hasPermission(UserRole.SUPER_ADMIN, 'system:manage');
    expect(res).toBe(true);
  });

  it('should reject invalid roles and properly deny unauthorized permissions', async () => {
    vi.mocked(cache.get).mockResolvedValue(1);
    vi.mocked(cache.getOrFetch).mockImplementation(async () => ROLE_PERMISSIONS);

    // Invalid role (not existing in our UserRole enum)
    const resInvalidRole = await hasPermission('HACKER_ROLE', 'tenant:manage' as any);
    expect(resInvalidRole).toBe(false);

    // Valid role, unauthorized permission
    const resUnauthorized = await hasPermission(UserRole.GUARD, 'system:manage');
    expect(resUnauthorized).toBe(false);
  });

  describe('hasPermissionSync', () => {
    it('should return true for SUPER_ADMIN', () => {
      expect(hasPermissionSync(UserRole.SUPER_ADMIN, 'system:manage')).toBe(true);
    });

    it('should fall back to ROLE_PERMISSIONS if dynamicPermissions are not loaded', () => {
      // By default after refreshDynamicPermissions, dynamic permissions are null
      
      // Because we didn't call the async `hasPermission` yet, it will use ROLE_PERMISSIONS
      const resRead = hasPermissionSync(UserRole.GUARD, 'log:read');
      expect(resRead).toBe(true);

      const resUnauthorized = hasPermissionSync(UserRole.GUARD, 'system:manage');
      expect(resUnauthorized).toBe(false);
    });

    it('should use dynamic permissions if they are already loaded into memory', async () => {
      const customPerms = {
        ...ROLE_PERMISSIONS,
        [UserRole.GUARD]: [] // Empty permissions for guard
      };
      
      vi.mocked(cache.get).mockResolvedValue(1);
      vi.mocked(cache.getOrFetch).mockImplementation(async () => customPerms);

      // Load it into memory
      await hasPermission(UserRole.GUARD, 'task:read'); // This puts customPerms into `dynamicPermissions`

      // Now sync should use the custom loaded permissions
      const resSync = hasPermissionSync(UserRole.GUARD, 'log:read'); // Which normally is true
      expect(resSync).toBe(false); // Because it is empty in customPerms
    });
  });
});
