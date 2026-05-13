/**
 * Authentication Utilities for SCMD Pro
 * Triết lý Think Zero: Giữ logic xác thực tập trung và an toàn.
 */

export const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('scmd_jwt');
  const tenantId = localStorage.getItem('scmd_tenant_id');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  
  // Chỉ thêm header Authorization nếu token hợp lệ và không phải là chuỗi "null"/"undefined"
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Inject tenant context toàn hệ thống
  if (tenantId && tenantId !== 'null' && tenantId !== 'undefined') {
    headers['x-tenant-id'] = tenantId;
  }
  
  return headers;
};

export const setAuthToken = (token: string) => {
  if (token) {
    localStorage.setItem('scmd_jwt', token);
  }
};

export const removeAuthToken = () => {
  localStorage.removeItem('scmd_jwt');
  localStorage.removeItem('scmd_refresh_token');
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('scmd_jwt');
  const role = localStorage.getItem('scmd_user_role');
  return !!(token && token !== 'null' && token !== 'undefined' && role);
};
