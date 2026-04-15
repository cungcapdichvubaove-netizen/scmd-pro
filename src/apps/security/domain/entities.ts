export interface CheckItem {
  id: string;
  task: string;
  required: boolean;
  type: 'toggle' | 'photo' | 'text';
  description?: string;
  expected_format?: string;
  instructions?: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'completed' | 'missed';
  lastCheckedAt?: Date;
  check_items?: CheckItem[];
  // Benchmark fields for Learning Mode
  benchmark_travel_time?: number; // In seconds
  benchmark_work_duration?: number; // In seconds
  is_learning_mode?: boolean;
}

export interface Incident {
  id: string;
  checkpointId?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  imageUrl?: string;
  createdAt: Date;
}

export interface Attendance {
  id: string;
  tenantId: string;
  guardId: string;
  type: 'check-in' | 'check-out';
  location: {
    lat: number;
    lon: number;
  };
  timestamp: Date;
  status: 'valid' | 'invalid'; // Dựa trên khoảng cách tới mục tiêu
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: 'free' | 'pro' | 'enterprise';
  features_enabled?: {
    patrol: boolean;
    attendance: boolean;
    ai_analytics: boolean;
  };
}

