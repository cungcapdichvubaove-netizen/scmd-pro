export const GLOBAL_CONSTANTS = {
  SYSTEM_TENANT_ID: 'tenant_system',
  VINHOMES_TENANT_ID: 'tenant_vinhomes',
  ANHOI_TENANT_ID: 'tenant_anhoi',
  SALT_ROUNDS: 10,
  DEFAULT_SUPERADMIN_PASSWORD: process.env.SEED_SUPERADMIN_PASSWORD || 'Admin@2025!',
  DEFAULT_TENANT_PASSWORD: process.env.SEED_TENANT_ADMIN_PASSWORD || 'Demo@2025!',
  DEFAULT_GUARD_PASSWORD: process.env.SEED_GUARD_PASSWORD || 'Guard@2025!',
  
  // Center coordinates for Vinhomes
  VINHOMES_CENTER: { lat: 10.8413, lng: 106.8402 },
  // Center for An Hoi
  ANHOI_CENTER: { lat: 10.8447, lng: 106.6472 },
};
