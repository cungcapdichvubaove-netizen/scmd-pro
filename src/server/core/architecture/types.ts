export enum UserRole {
  SUPER_ADMIN = 'super-admin',
  TENANT_ADMIN = 'tenant-admin',
  GUARD = 'guard',
  SUPERVISOR = 'supervisor',
  TECHNICIAN = 'technician',
  VENDOR_COMMANDER = 'vendor-commander',
  VENDOR_REPRESENTATIVE = 'vendor-representative'
}

export type TenantId = string;

export interface ClientContext {
  ip: string;
  userAgent: string;
}

export interface SecurityContext {
  userId: string;
  tenantId: string;
  role: UserRole;
  email?: string;
  assignedVendorId?: string | null;
  assignedSiteId?: string | null;
  assignedContractId?: string | null;
  clientContext?: ClientContext;
}

export interface AuthContext extends SecurityContext {}

export interface LocationDTO {
  lat: number;
  lon: number;
  accuracy?: number;
}

export interface CreateCheckpointDTO {
  name: string;
  latitude: number;
  longitude: number;
  siteId?: string;
  guardPostId?: string;
  qr_hash?: string;
  check_items?: any[];
}

export interface ScanQRMetadata {
  checkpointId?: string;
  location?: LocationDTO;
  timestamp?: Date;
  qr_hash?: string;
  patrolSessionId?: string;
  scannedAt?: string;
  photoEvidenceIds?: string[];
  note?: string;
  _signature?: string;
  _timestamp?: number | string;
}

export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: string;
  type: string;
  payload: TPayload;
  occurredAt: Date;
}

export enum TenantPlan {
  TRIAL = 'TRIAL',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
  LITE = 'LITE'
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export interface OnboardTenantDTO {
  name: string;
  subdomain: string;
  plan: TenantPlan;
  contactEmail: string;
  contactPhone: string;
  ownerName: string;
  status?: TenantStatus;
  max_employees?: number;
  admin_password?: string;
}

export interface UpdateTenantSubscriptionDTO {
  plan: TenantPlan;
  max_employees?: number;
}
