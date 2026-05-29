import { UserRole } from '../architecture/types.js';
import { db } from '../db/prisma.js';
import { logger } from '../logger/index.js';
import { cache } from '../cache/index.js';
import { z } from 'zod';

export type Permission = 
  | 'staff:read' 
  | 'staff:write' 
  | 'checkpoint:read' 
  | 'checkpoint:write' 
  | 'log:read' 
  | 'log:write' 
  | 'report:generate' 
  | 'tenant:manage' 
  | 'system:manage' 
  | 'task:read'
  | 'task:write'
  | 'vendor:read'
  | 'vendor:write'
  | 'vendor:dispute:submit'
  | 'vendor:dispute:view'
  | 'violation:review'
  | 'violation:resolve'
  | 'report:finalize'
  | 'billing:read'
  | 'billing:write';

export const ALL_PERMISSIONS: Permission[] = [
  'staff:read', 'staff:write', 
  'checkpoint:read', 'checkpoint:write', 
  'log:read', 'log:write', 
  'report:generate', 
  'report:finalize',
  'tenant:manage', 
  'system:manage',
  'task:read', 'task:write',
  'vendor:read', 'vendor:write',
  'vendor:dispute:submit', 'vendor:dispute:view',
  'violation:review', 'violation:resolve',
  'billing:read', 'billing:write'
];

export const permissionsSchema = z.record(
  z.nativeEnum(UserRole),
  z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]]))
);

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [...ALL_PERMISSIONS],
  [UserRole.TENANT_ADMIN]: [
    'staff:read',
    'staff:write',
    'checkpoint:read',
    'checkpoint:write',
    'log:read',
    'log:write',
    'report:generate',
    'report:finalize',
    'task:read',
    'task:write',
    'vendor:read',
    'vendor:write',
    'vendor:dispute:view',
    'violation:review',
    'violation:resolve'
  ],
  [UserRole.SUPERVISOR]: [
    'staff:read',
    'checkpoint:read',
    'log:read',
    'log:write',
    'report:generate',
    'task:read',
    'task:write',
    'vendor:read',
    'vendor:dispute:view',
    'violation:review'
  ],
  [UserRole.TECHNICIAN]: [
    'checkpoint:read', 'checkpoint:write',
    'log:read',
    'task:read'
  ],
  [UserRole.VENDOR_COMMANDER]: [
    'staff:read',
    'staff:write',
    'checkpoint:read',
    'log:read',
    'log:write',
    'report:generate',
    'task:read',
    'task:write',
    'vendor:read',
    'vendor:dispute:view',
    'vendor:dispute:submit',
    'violation:review'
  ],
  [UserRole.VENDOR_REPRESENTATIVE]: [
    'staff:read',
    'log:read',
    'report:generate',
    'vendor:read',
    'vendor:dispute:view',
    'vendor:dispute:submit'
  ],
  [UserRole.GUARD]: [
    'checkpoint:read',
    'log:write',
    'log:read',
    'task:read'
  ]
};

let dynamicPermissions: Record<UserRole, Permission[]> | null = null;
let lastLoadTime = 0;
let cacheVersion = 0;
const CACHE_TTL = 30; // Seconds for Redis cache
let loadPromise: Promise<Record<UserRole, Permission[]>> | null = null;

function mergeRolePermissions(base: Record<UserRole, Permission[]>, override?: Partial<Record<UserRole, Permission[]>> | null): Record<UserRole, Permission[]> {
  const merged = { ...base } as Record<UserRole, Permission[]>;

  if (!override) {
    return merged;
  }

  for (const role of Object.values(UserRole)) {
    if (Object.prototype.hasOwnProperty.call(override, role)) {
      const overridePermissions = override[role] || [];
      merged[role] = [...new Set(overridePermissions)];
      continue;
    }

    merged[role] = [...new Set(base[role] || [])];
  }

  return merged;
}

export async function refreshDynamicPermissions() {
  dynamicPermissions = null;
  lastLoadTime = 0;
  // Increment distributed version to signal other pods
  const newVersion = await cache.increment('system:permissions:version');
  return newVersion;
}

async function loadDynamicPermissions() {
  try {
    const now = Date.now();
    
    // 1. Quick local check (short-circuit in 2s for extreme performance)
    if (now - lastLoadTime < 2000 && dynamicPermissions) return dynamicPermissions;

    // 2. Single-Flight Pattern: Coalesce concurrent calls to the same promise
    if (loadPromise) return await loadPromise;

    loadPromise = (async () => {
      try {
        // Multi-pod consistency: Check version from Redis
        const remoteVersion = await cache.get<number>('system:permissions:version') || 0;
        if (remoteVersion > cacheVersion) {
          dynamicPermissions = null; // Invalidate local cache
          cacheVersion = remoteVersion;
        }

        if (dynamicPermissions && Date.now() - lastLoadTime < (CACHE_TTL * 1000)) {
          return dynamicPermissions;
        }

        // Use distributed cache with fetcher
        const result = await cache.getOrFetch<Record<UserRole, Permission[]>>('system:permissions', async () => {
          const config = await db.system().systemConfig.findUnique({
            where: { key: 'role_permissions' }
          });

          if (config && config.value) {
            return mergeRolePermissions(ROLE_PERMISSIONS, config.value as Partial<Record<UserRole, Permission[]>>);
          }
          return ROLE_PERMISSIONS;
        }, CACHE_TTL);

        dynamicPermissions = result;
        lastLoadTime = Date.now();
        return result;
      } finally {
        loadPromise = null;
      }
    })();

    return await loadPromise;
  } catch (err) {
    logger.error({ err }, 'Failed to load dynamic permissions');
    return ROLE_PERMISSIONS;
  }
}

export async function hasPermission(role: UserRole | string, permission: Permission): Promise<boolean> {
  const permsMap = await loadDynamicPermissions();
  if (role === UserRole.SUPER_ADMIN) return true;
  const perms = permsMap[role as UserRole];
  if (!perms) return false;
  return perms.includes(permission);
}

export function hasPermissionSync(role: UserRole | string, permission: Permission): boolean {
  if (role === UserRole.SUPER_ADMIN) return true;
  const permsMap = dynamicPermissions || ROLE_PERMISSIONS;
  const perms = permsMap[role as UserRole];
  if (!perms) return false;
  return perms.includes(permission);
}
