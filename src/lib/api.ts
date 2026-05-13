const getAuthToken = () => localStorage.getItem('scmd_jwt');
const getRefreshToken = () => localStorage.getItem('scmd_refresh_token');
const getTenantId = () => localStorage.getItem('scmd_tenant_id');

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string | null) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

export const apiFetch = async <T = any>(url: string, options: RequestInit & { responseType?: 'json' | 'blob' } = {}): Promise<T> => {
  const token = getAuthToken();
  const tenantId = getTenantId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Inject tenant context toàn hệ thống (System-wide tenant context injection)
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    const refreshToken = getRefreshToken();
    
    if (refreshToken && !isRefreshing) {
      isRefreshing = true;
      let newToken: string | null = null;
      
      try {
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('scmd_jwt', data.token);
          if (data.refreshToken) {
            localStorage.setItem('scmd_refresh_token', data.refreshToken);
          }
          newToken = data.token;
        }
      } catch (err) {
        console.error("Auto refresh failed", err);
      } finally {
        isRefreshing = false;
        onTokenRefreshed(newToken);
      }

      if (newToken) {
        // Retry the original request
        return apiFetch(url, options);
      }
    } else if (isRefreshing) {
      // If refresh is already in progress, wait for it
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (newToken) {
            const updatedOptions = {
              ...options,
              headers: {
                ...((options.headers as Record<string, string>) || {}),
                'Authorization': `Bearer ${newToken}`
              }
            };
            resolve(apiFetch(url, updatedOptions));
          } else {
            reject(new Error("401 Unauthorized - Token refresh failed"));
          }
        });
      });
    }

    // Basic handle: token expired or invalid and refresh failed
    localStorage.removeItem('scmd_jwt');
    localStorage.removeItem('scmd_refresh_token');
    localStorage.removeItem('scmd_tenant_id');
    localStorage.removeItem('scmd_user_role');
    localStorage.removeItem('scmd_user_profile');
    
    throw new Error("401 Unauthorized");
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
          // Xử lý thông báo Zod error thân thiện với người dùng
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
      // If HTML or text, just use status text
      errorMessage = `Lỗi hệ thống ${res.status}: ${res.statusText}`;
    }

    // You can optionally show a toast here if configured, or pass the details down.
    import('react-hot-toast').then(({ default: toast }) => {
       toast.error(errorMessage);
    }).catch(() => {});

    // Attach more details to the error object so the calling code can inspect it.
    const finalError = new Error(errorMessage) as any;
    finalError.details = errorDetails;
    finalError.status = res.status;
    
    throw finalError;
  }

  if (options.responseType === 'blob') {
    return res.blob() as any;
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  
  return res.text() as any;
};
