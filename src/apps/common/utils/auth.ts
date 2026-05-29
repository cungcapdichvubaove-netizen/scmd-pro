/**
 * Authentication Utilities for SCMD Pro
 * Triết lý Zero Trust: credential nhạy cảm nằm trong httpOnly cookie; frontend chỉ giữ metadata không nhạy cảm.
 */

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
};

export const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
  const tenantId = localStorage.getItem('scmd_tenant_id');
  const csrfToken = getCookieValue('scmd_csrf');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };

  if (tenantId) headers['x-tenant-id'] = tenantId;
  if (csrfToken) headers['x-csrf-token'] = csrfToken;

  delete headers.Authorization;
  delete headers.authorization;

  return headers;
};

export const setAuthToken = (_token?: string | null) => {
  // Deprecated: không persist JWT vào localStorage. Server phát hành httpOnly cookie sau login.
  localStorage.removeItem('scmd_jwt');
  localStorage.removeItem('scmd_refresh_token');
};

export const removeAuthToken = () => {
  localStorage.removeItem('scmd_jwt');
  localStorage.removeItem('scmd_refresh_token');
};

export const isAuthenticated = () => {
  const role = localStorage.getItem('scmd_user_role');
  return !!role;
};
