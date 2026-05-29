import { describe, expect, it } from 'vitest';

import { normalizeServiceType, servesPublicHttpApi, servesRealtimeGateway } from './service-profile.js';

describe('service profile', () => {
  it('mac dinh ALL va yeu cau public HTTP/API validation', () => {
    expect(normalizeServiceType(undefined)).toBe('ALL');
    expect(servesPublicHttpApi(undefined)).toBe(true);
  });

  it('chi validate public contact challenge cho service phuc vu public HTTP/API', () => {
    expect(servesPublicHttpApi('ALL')).toBe(true);
    expect(servesPublicHttpApi('API')).toBe(true);
    expect(servesPublicHttpApi('PUBLIC_API')).toBe(true);
    expect(servesPublicHttpApi('PUBLIC_API_REALTIME')).toBe(true);
    expect(servesPublicHttpApi('WORKER')).toBe(false);
    expect(servesPublicHttpApi('WORKER_LIGHT')).toBe(false);
    expect(servesPublicHttpApi('WORKER_HEAVY')).toBe(false);
    expect(servesPublicHttpApi('REALTIME')).toBe(false);
  });

  it('phan biet realtime gateway voi worker-only service', () => {
    expect(servesRealtimeGateway('ALL')).toBe(true);
    expect(servesRealtimeGateway('REALTIME')).toBe(true);
    expect(servesRealtimeGateway('PUBLIC_API_REALTIME')).toBe(true);
    expect(servesRealtimeGateway('API')).toBe(false);
    expect(servesRealtimeGateway('WORKER_LIGHT')).toBe(false);
    expect(servesRealtimeGateway('WORKER_HEAVY')).toBe(false);
  });
});
