import { apiFetch, resolveApiUrl } from "../lib/api";
import { LoginRequest, LoginResponse } from "../lib/contracts";

export const loginAPI = async (payload: LoginRequest): Promise<LoginResponse> => {
  const res = await fetch(resolveApiUrl("/api/v1/auth/login"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Đăng nhập thất bại");
  }

  return data as LoginResponse;
};

export const getMe = async () => {
  return await apiFetch('/api/v1/me', {
    skipAuthRefresh: true,
    suppressErrorToast: true,
  });
};

export const refreshTokenAPI = async (): Promise<{ refreshed: boolean }> => {
  return await apiFetch('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

export const logoutAPI = async (): Promise<void> => {
  await apiFetch('/api/v1/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
    suppressErrorToast: true,
  }).catch(() => undefined);
};
