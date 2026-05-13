// ─── Shared Types ─── //
export interface CheckItem {
  id: string;
  task: string;
  required: boolean;
  type: 'toggle' | 'photo' | 'text';
}

export interface Checkpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  qr_hash?: string;
  check_items?: CheckItem[];
  benchmark_travel_time?: number;
  benchmark_work_duration?: number;
  is_learning_mode?: boolean;
}

export interface WorkHistory {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface Staff {
  id: string;
  staffId: string;
  fullName: string;
  role: string;
  phone?: string;
  email: string;
  username?: string;
  password?: string;
  qualifications?: string[];
  certificates?: string[];
  rewards?: string;
  disciplines?: string;
  workHistory?: WorkHistory[];
  credentials?: {
    idNumber: string;
    licenseNumber: string;
    expiryDate: string;
  };
}

export interface PatrolRoute {
  id: string;
  name: string;
  checkpoints: string[];
  schedule: string;
  frequency: string;
}

export interface PatrolLog {
  id: string;
  checkpointId: string;
  checkpointName: string;
  staffId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  isSuspicious: boolean;
  suspicionReason?: string;
  checkItemsData: any[];
  metadata?: any;
  createdAt: string;
}

export interface Stats {
  completionRate: number;
  totalCheckpoints: number;
  completedCheckpoints: number;
  dailyStats: { name: string; completion: number }[];
}

export interface Notification {
  id: string;
  title: string;
  type: string;
  message: string;
  createdAt: string;
}

export type ActiveTab =
  | 'overview'
  | 'sites'
  | 'vendors'
  | 'violations'
  | 'reports'
  | 'staff'
  | 'tasks'
  | 'incidents'
  | 'attendance'
  | 'audit'
  | 'attachments'
  | 'market-growth'
  | 'usage-analytics'
  | 'settings'
  | 'subscription'
  | 'help';