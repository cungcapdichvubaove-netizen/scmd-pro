const getTenantId = () => localStorage.getItem('scmd_tenant_id');

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const trimLeadingSlash = (value: string) => value.replace(/^\/+/, '');
const startsWithApiPath = (value: string) => /^\/?api(?:\/|$)/.test(value);
const getConfiguredApiBaseUrl = () => trimTrailingSlash(import.meta.env.VITE_API_URL || '');

export const resolveApiUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;

  const apiBaseUrl = getConfiguredApiBaseUrl();
  if (!apiBaseUrl) return url;

  try {
    const base = new URL(apiBaseUrl);
    if (startsWithApiPath(base.pathname)) {
      return `${base.origin}/${trimLeadingSlash(url)}`;
    }
  } catch {
    // Giữ fallback nối chuỗi cho cấu hình base path tương đối hợp lệ của Vite/proxy.
  }

  return `${apiBaseUrl}/${trimLeadingSlash(url)}`;
};

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
};

const isMutationMethod = (method?: string) => {
  const normalized = (method || 'GET').toUpperCase();
  return !['GET', 'HEAD', 'OPTIONS'].includes(normalized);
};

const clearClientAuthState = () => {
  localStorage.removeItem('scmd_jwt');
  localStorage.removeItem('scmd_refresh_token');
  localStorage.removeItem('scmd_tenant_id');
  localStorage.removeItem('scmd_user_role');
  localStorage.removeItem('scmd_user_profile');
  localStorage.removeItem('scmd_subscription_plan');
};

let isRefreshing = false;
let refreshSubscribers: ((ok: boolean) => void)[] = [];

const subscribeTokenRefresh = (cb: (ok: boolean) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (ok: boolean) => {
  refreshSubscribers.map((cb) => cb(ok));
  refreshSubscribers = [];
};

const buildAuthHeaders = (options: RequestInit) => {
  const tenantId = getTenantId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  if (isMutationMethod(options.method)) {
    const csrfToken = getCookieValue('scmd_csrf');
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
  }

  return headers;
};

export const apiFetch = async <T = any>(
  url: string,
  options: RequestInit & {
    responseType?: 'json' | 'blob';
    suppressErrorToast?: boolean;
    skipAuthRefresh?: boolean;
  } = {},
): Promise<T> => {
  const headers = buildAuthHeaders(options);

  const resolvedUrl = resolveApiUrl(url);

  const res = await fetch(resolvedUrl, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status === 401) {
    const csrfToken = getCookieValue('scmd_csrf');
    if (options.skipAuthRefresh || !csrfToken) {
      clearClientAuthState();
      throw new Error('401 Unauthorized');
    }

    if (!isRefreshing) {
      isRefreshing = true;
      let refreshed = false;

      try {
        const refreshRes = await fetch(resolveApiUrl('/api/v1/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
          headers: buildAuthHeaders({ method: 'POST' }),
          body: JSON.stringify({})
        });

        refreshed = refreshRes.ok;
      } catch (err) {
        console.error('Auto refresh failed', err);
      } finally {
        isRefreshing = false;
        onTokenRefreshed(refreshed);
      }

      if (refreshed) {
        return apiFetch(url, options);
      }
    } else {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((ok) => {
          if (ok) {
            resolve(apiFetch(url, options));
          } else {
            reject(new Error('401 Unauthorized - Token refresh failed'));
          }
        });
      });
    }

    clearClientAuthState();
    throw new Error('401 Unauthorized');
  }

  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    let errorMessage = 'Giao tiếp hệ thống thất bại (API Request Failed)';
    let errorDetails = null;

    if (contentType && contentType.includes('application/json')) {
      const err = await res.json().catch(() => ({}));
      if (err.error && typeof err.error === 'object') {
        errorMessage = err.error.message || errorMessage;
        errorDetails = err.error.details || null;

        if (errorDetails && Array.isArray(errorDetails) && errorDetails.length > 0) {
          const detailMessages = errorDetails.map((d: any) => {
            const field = d.path ? d.path.join('.') : '';
            return field ? `[${field}] ${d.message}` : d.message;
          }).join(', ');
          errorMessage = `${errorMessage} - ${detailMessages}`;
        }
      } else {
        errorMessage = err.error || err.message || errorMessage;
      }
    } else {
      errorMessage = `Lỗi hệ thống ${res.status}: ${res.statusText}`;
    }

    if (!options.suppressErrorToast) {
      import('./toast').then(({ toast }) => {
        toast.error(errorMessage);
      }).catch(() => {});
    }

    const error = new Error(errorMessage) as Error & {
      status?: number;
      statusText?: string;
      details?: unknown;
    };
    error.status = res.status;
    error.statusText = res.statusText;
    error.details = errorDetails;
    throw error;
  }

  if (options.responseType === 'blob') {
    return await res.blob() as T;
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return await res.json();
};

export const authFetchHeaders = (options: RequestInit = {}) => buildAuthHeaders(options);
