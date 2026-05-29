import { resolveSeedPassword } from '../../src/server/modules/auth/seed-password.policy.js';

function getSeedPassword(envName: string): string {
  return resolveSeedPassword(envName);
}

export const GLOBAL_CONSTANTS = {
  SYSTEM_TENANT_ID: 'tenant_system',
  VINHOMES_TENANT_ID: 'tenant_vinhomes',
  ANHOI_TENANT_ID: 'tenant_anhoi',
  SALT_ROUNDS: 10,
  DEFAULT_SUPERADMIN_PASSWORD: getSeedPassword('SEED_SUPERADMIN_PASSWORD'),
  DEFAULT_TENANT_PASSWORD: getSeedPassword('SEED_TENANT_ADMIN_PASSWORD'),
  DEFAULT_GUARD_PASSWORD: getSeedPassword('SEED_GUARD_PASSWORD'),
  
  // Center coordinates for Vinhomes
  VINHOMES_CENTER: { lat: 10.8413, lng: 106.8402 },
  // Center for An Hoi
  ANHOI_CENTER: { lat: 10.8447, lng: 106.6472 },
};
