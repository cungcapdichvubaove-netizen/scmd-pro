import { describe, expect, it } from 'vitest';
import { resolveGuardNetworkStatus } from './guard-network-status.js';

describe('resolveGuardNetworkStatus', () => {
  it('ưu tiên trạng thái offline và không cho đồng bộ thủ công khi mất mạng', () => {
    const status = resolveGuardNetworkStatus({ online: false, pendingCount: 2, gpsAvailable: true });

    expect(status.level).toBe('offline');
    expect(status.canSync).toBe(false);
    expect(status.description).toContain('2 thao tác');
  });

  it('cảnh báo degraded khi GPS chưa sẵn sàng dù thiết bị online', () => {
    const status = resolveGuardNetworkStatus({ online: true, pendingCount: 0, gpsAvailable: false });

    expect(status.level).toBe('degraded');
    expect(status.title).toBe('GPS chưa sẵn sàng');
    expect(status.canSync).toBe(false);
  });

  it('cho phép đồng bộ khi online và còn thao tác offline đang chờ', () => {
    const status = resolveGuardNetworkStatus({ online: true, pendingCount: 3, gpsAvailable: true });

    expect(status.level).toBe('degraded');
    expect(status.canSync).toBe(true);
    expect(status.description).toContain('3 thao tác');
  });

  it('ưu tiên cảnh báo thao tác đã lỗi retry để guard không xóa dữ liệu cục bộ', () => {
    const status = resolveGuardNetworkStatus({ online: true, pendingCount: 1, failedCount: 1, gpsAvailable: true });

    expect(status.level).toBe('degraded');
    expect(status.title).toBe('Có dữ liệu đồng bộ lỗi');
    expect(status.canSync).toBe(true);
    expect(status.description).toContain('vượt giới hạn retry');
  });

  it('trả về trạng thái sẵn sàng khi online, có GPS và không còn queue', () => {
    const status = resolveGuardNetworkStatus({ online: true, pendingCount: 0, gpsAvailable: true });

    expect(status.level).toBe('online');
    expect(status.canSync).toBe(false);
  });
});
