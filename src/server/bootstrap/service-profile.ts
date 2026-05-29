const PUBLIC_HTTP_SERVICE_TYPES = new Set(['ALL', 'API', 'HTTP', 'WEB', 'PUBLIC_API', 'PUBLIC_API_REALTIME']);
const REALTIME_SERVICE_TYPES = new Set(['ALL', 'REALTIME', 'API_REALTIME', 'PUBLIC_API_REALTIME']);

export function normalizeServiceType(serviceType: string | undefined) {
  return (serviceType || 'ALL').trim().toUpperCase();
}

export function servesPublicHttpApi(serviceType: string | undefined) {
  return PUBLIC_HTTP_SERVICE_TYPES.has(normalizeServiceType(serviceType));
}

export function servesRealtimeGateway(serviceType: string | undefined) {
  return REALTIME_SERVICE_TYPES.has(normalizeServiceType(serviceType));
}
