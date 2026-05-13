import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuthStore } from "../apps/common/store/useAuthStore";
import { getMe } from "../services/auth.service";
import { AuthUser } from "../lib/contracts";
import { getSocket } from "../lib/socket";

interface AuthContextType {
  token: string | null;
  role: AuthUser['role'] | null;
  tenantId: string | null;
  subscriptionPlan: 'FREE' | 'PRO' | 'ENTERPRISE' | null;
  user: { name?: string; staffId?: string } | null;
  login: (data: { token: string; role: AuthUser['role']; tenantId: string; name?: string; staffId?: string; subscriptionPlan?: 'FREE' | 'PRO' | 'ENTERPRISE' }) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  // Real-time Auth Integration: Manage socket connection based on token state
  useEffect(() => {
    const socket = getSocket(store.token);
    
    if (store.token) {
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  }, [store.token]);

  const refreshSession = async () => {
    // FIX [BUG-5]: refreshSession() được gọi lại sau mỗi lần login (do useEffect[store.token]).
    // Nếu KHÔNG set isLoading=true trước khi gọi getMe(), ProtectedRoute sẽ render ngay
    // với isLoading=false + token=OK + role=null (store chưa update) → vào nhánh
    // "role not in allowedRoles" → Navigate to="/" (landing page) trước khi getMe hoàn thành.
    //
    // Fix: luôn set isLoading=true khi bắt đầu bất kỳ session refresh nào,
    // dù có token hay không, để ProtectedRoute chờ spinner cho đến khi state ổn định.
    setIsLoading(true);

    if (store.token) {
      try {
        const data = await getMe();
        if (data.user) {
          store.setAuthUser(
            data.user.role, 
            data.user.tenantId, 
            store.token, 
            { 
              name: data.user.fullName, 
              staffId: data.user.id 
            },
            (data.tenant?.subscriptionPlan != null && data.tenant.subscriptionPlan !== '') 
              ? (data.tenant.subscriptionPlan as 'FREE' | 'PRO' | 'ENTERPRISE') 
              : (data.tenant?.plan === 'ENTERPRISE' ? 'ENTERPRISE' : (data.tenant?.plan === 'PRO' ? 'PRO' : 'FREE'))
          );
        } else {
          store.clearAuth();
        }
      } catch (err: any) {
        const isAuthError = err.message?.includes('Unauthorized') || 
                          err.message?.includes('expired') || 
                          err.message?.includes('401');

        if (isAuthError) {
           store.clearAuth();
        } else {
           console.error("Session verification failed:", err);
        }
      }
    }
    // always resolve loading — whether token existed or not
    setIsLoading(false);
  };

  useEffect(() => {
    refreshSession();
    const parseJwt = (token: string) => {
      try {
        const payload = token.split('.')[1];
        if (!payload) return null;
        return JSON.parse(atob(payload));
      } catch (e) {
        return null;
      }
    };

    let timer: NodeJS.Timeout;
    if (store.token) {
      const decoded = parseJwt(store.token as string);
      if (decoded && decoded.exp) {
        const REFRESH_THRESHOLD = 2 * 60 * 1000;
        const msUntilExp = (decoded.exp * 1000) - Date.now();
        const nextRefresh = msUntilExp - REFRESH_THRESHOLD;
        if (nextRefresh > 0) {
          timer = setTimeout(refreshSession, nextRefresh);
        } else {
           // Already expired or close to
           refreshSession();
        }
      } else {
        // Fallback
        timer = setInterval(refreshSession, 5 * 60 * 1000) as unknown as NodeJS.Timeout;
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [store.token]);

  const login = (data: { token: string; role: AuthUser['role']; tenantId: string; name?: string; staffId?: string; subscriptionPlan?: 'FREE' | 'PRO' | 'ENTERPRISE' }) => {
    store.setAuthUser(data.role, data.tenantId, data.token, { 
      name: data.name, 
      staffId: data.staffId 
    }, data.subscriptionPlan);
  };

  const logout = () => {
    store.clearAuth();
  };

  return (
    <AuthContext.Provider value={{ 
      token: store.token, 
      role: store.role, 
      tenantId: store.tenantId,
      subscriptionPlan: store.subscriptionPlan,
      user: store.user,
      login, 
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);