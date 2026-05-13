import { apiFetch } from "../lib/api";
import { LoginRequest, LoginResponse } from "../lib/contracts";

export const loginAPI = async (payload: LoginRequest): Promise<LoginResponse> => {
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }

  return data as LoginResponse;
};

export const getMe = async () => {
    // FIX [BUG-4]: Dùng /api/v1/me thay vì /api/me để nhất quán với primary API base path.
    // Trước đây hoạt động nhờ double-mount bug (#3). Sau khi fix #3, /api/me vẫn resolve qua
    // compat alias nhưng explicit /api/v1/me là SSOT và tránh phụ thuộc vào alias behavior.
    return await apiFetch('/api/v1/me');
};

export const refreshTokenAPI = async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Token refresh failed");
  }

  return data;
};
