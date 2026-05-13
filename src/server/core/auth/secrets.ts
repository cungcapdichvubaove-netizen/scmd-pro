/**
 * FIX [SECURITY]: Centralized secret management.
 * Fail-fast nếu thiếu JWT secrets trong môi trường Production.
 * Ngăn hệ thống chạy với fallback key yếu — nếu quên set ENV, server sẽ crash
 * ngay khi khởi động thay vì âm thầm dùng key không an toàn.
 */
export const getSecret = (key: string): string => {
  const val = process.env[key];
  if (!val && process.env.NODE_ENV === 'production') {
    throw new Error(`CRITICAL: Missing required environment variable "${key}". Server cannot start safely.`);
  }
  // Dev/test fallback — KHÔNG an toàn cho production.
  // Sử dụng chuỗi ngẫu nhiên cố định cho dev để tránh invalidate token mỗi khi restart.
  // Đảm bảo JwtAuthProvider và AuthService dùng chung fallback này.
  return val || `scmd_pro_fallback_secret_random_v2_2026_dev_fixed`;
};

export const JWT_SECRET = getSecret('JWT_SECRET');
export const INTERNAL_API_SECRET = getSecret('INTERNAL_API_SECRET');
export const DEVICE_SECRET = getSecret('DEVICE_SECRET');
