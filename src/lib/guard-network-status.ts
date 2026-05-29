export type GuardNetworkRiskLevel = 'online' | 'degraded' | 'offline';

export interface GuardNetworkStatusInput {
  online: boolean;
  pendingCount: number;
  gpsAvailable: boolean;
  failedCount?: number;
}

export interface GuardNetworkStatus {
  level: GuardNetworkRiskLevel;
  title: string;
  description: string;
  canSync: boolean;
}

export function resolveGuardNetworkStatus(input: GuardNetworkStatusInput): GuardNetworkStatus {
  const failedCount = input.failedCount ?? 0;

  if (failedCount > 0) {
    return {
      level: 'degraded',
      title: 'Có dữ liệu đồng bộ lỗi',
      description: `${failedCount} thao tác đã vượt giới hạn retry. Báo ca trưởng/SOC trước khi xóa dữ liệu trình duyệt.`,
      canSync: input.online,
    };
  }

  if (!input.online) {
    return {
      level: 'offline',
      title: 'Đang ngoại tuyến',
      description: input.pendingCount > 0
        ? `${input.pendingCount} thao tác hiện trường đang chờ đồng bộ. Tiếp tục tuần tra, không xóa dữ liệu trình duyệt.`
        : 'Thiết bị mất mạng. QR/GPS/checklist sẽ lưu tạm nếu đã có dữ liệu ca trực cục bộ.',
      canSync: false,
    };
  }

  if (!input.gpsAvailable) {
    return {
      level: 'degraded',
      title: 'GPS chưa sẵn sàng',
      description: 'Bật định vị chính xác cao trước khi quét QR hoặc gửi báo cáo để tránh bị đánh dấu suspicious.',
      canSync: input.pendingCount > 0,
    };
  }

  if (input.pendingCount > 0) {
    return {
      level: 'degraded',
      title: 'Cần đồng bộ dữ liệu',
      description: `${input.pendingCount} thao tác offline đang chờ gửi về trung tâm. Bấm đồng bộ khi mạng ổn định.`,
      canSync: true,
    };
  }

  return {
    level: 'online',
    title: 'Sẵn sàng hiện trường',
    description: 'Mạng và GPS đang sẵn sàng cho QR/GPS/checklist trong ca trực.',
    canSync: false,
  };
}
