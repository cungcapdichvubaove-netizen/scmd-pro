export enum CheckItemType {
  TOGGLE = 'toggle',
  PHOTO = 'photo',
  TEXT = 'text'
}

export interface CheckItem {
  id: string;
  task: string;
  required: boolean;
  type: CheckItemType;
  description?: string;
  expected_format?: string;
  instructions?: string;
}

export enum CheckpointStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  MISSED = 'missed'
}

export interface Checkpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: CheckpointStatus;
  qr_hash?: string;
  lastCheckedAt?: Date;
  check_items?: CheckItem[];
  benchmark_travel_time?: number;
  benchmark_work_duration?: number;
  is_learning_mode?: boolean;
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface Incident {
  id: string;
  checkpointId?: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  imageUrl?: string;
  createdAt: Date;
}

// Note: These values must EXACTLY match the DB string values (CHECK_IN, CHECK_OUT).
export enum AttendanceType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
  LIVENESS = 'LIVENESS'
}

export enum AttendanceStatus {
  VALID = 'valid',
  INVALID = 'invalid'
}

export interface Attendance {
  id: string;
  tenantId: string;
  staffId: string;
  type: AttendanceType;
  location: {
    lat: number;
    lon: number;
  };
  timestamp: Date;
  status: AttendanceStatus;
}

export enum TenantPlanType {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: TenantPlanType;
  features_enabled?: {
    patrol: boolean;
    attendance: boolean;
    ai_watcher: boolean;
  };
  createdAt: Date;
  status: 'active' | 'suspended';
}

export interface GlobalDashboardState {
  totalTenants: number;
  totalGuards: number;
  activePatrols: number;
  incidentCount: number;
}

export enum UsageEventType {
  REGISTRATION = 'registration',
  FIRST_STAFF = 'first_staff',
  FIRST_CHECKPOINT = 'first_checkpoint',
  FIRST_PATROL = 'first_patrol'
}

export interface UsageTimelineEvent {
  name: string;
  timestamp: string;
  type: UsageEventType;
}

export interface SuperAdminStats {
  revenueGrowth: number;
  tenantActivity: number;
  systemHealth: number;
  totalTenants: number;
  lastUpdated?: string;
}

export interface BillingOverview {
  mrr: number;
  churnRate: number;
  pendingInvoices: number;
}

export interface SLOData {
  uptime: number;
  p99ResponseTime: number;
  errorRate: number;
}

export interface TenantBilling {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue';
  dueDate: string;
  lastUpdated?: string;
}

export enum VendorStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended'
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  manager_name?: string;
  contact_person?: string;
  score: number; // 0-100
  total_contracts: number;
  status: VendorStatus;
}

export interface SLAConfig {
  patrol_completion_target: number;
  incident_response_target: number;
  attendance_precision_target: number;
  bonus_kpi_target: number;
  patrol_frequency_minutes?: number;
  min_patrol_compliance?: number;
  penalty_per_violation?: number;
}

export enum ContractStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated'
}

export interface Contract {
  id: string;
  tenantId: string;
  vendorId: string;
  startDate: Date;
  endDate: Date;
  start_date?: Date;
  end_date?: Date;
  site_name?: string;
  value: number;
  currency: string;
  guard_count_per_shift: number;
  status: ContractStatus;
  sla_config: SLAConfig;
}

export interface ComplianceScore {
  id: string;
  vendorId: string;
  contractId: string;
  month: string;
  patrol_rate: number;
  incident_rate: number;
  discipline_rate: number;
  violations_count: number;
  total_score: number;
}
