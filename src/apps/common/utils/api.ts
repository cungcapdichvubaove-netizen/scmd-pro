import { getAuthHeaders } from './auth';

/**
 * API Utilities for SCMD Pro
 * Triết lý Think Zero: Đơn giản hóa việc gọi API và xử lý lỗi tập trung.
 */

export async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = getAuthHeaders(options.headers as Record<string, string>);
  
  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `API Error: ${response.status}`);
  }

  return response.json();
}
