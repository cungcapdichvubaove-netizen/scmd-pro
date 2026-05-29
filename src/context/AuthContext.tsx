import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuthStore } from "../apps/common/store/useAuthStore";
import { getMe, logoutAPI } from "../services/auth.service";
import { AuthUser } from "../lib/contracts";
import { getSocket, resetSocket } from "../lib/socket";

interface AuthContextType {
  token: string | null;
  role: AuthUser['role'] | null;
  tenantId: string | null;
  subscriptionPlan: 'FREE' | 'PRO' | 'ENTERPRISE' | null;
  user: { name?: string; staffId?: string } | null;
  login: (data: { role: AuthUser['role']; tenantId: string; name?: string; staffId?: string; subscriptionPlan?: 'FREE' | 'PRO' | 'ENTERPRISE' }) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

const hasSessionHint = () => {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((row) => row.startsWith('scmd_csrf='));
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const syncSocketConnection = async () => {
      if (!store.role) {
        resetSocket();
        return;
      }

      const socket = await getSocket();
      if (!cancelled && !socket.connected) {
        socket.connect();
      }
    };

    void syncSocketConnection();

    return () => {
      cancelled = true;
    };
  }, [store.role]);

  const refreshSession = async () => {
    if (!hasSessionHint()) {
      store.clearAuth();
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const data = await getMe();
      if (data.user) {
        store.setAuthUser(
          data.user.role,
          data.user.tenantId,
          null,
          {
            name: data.user.fullName,
            staffId: data.user.staffId || data.user.id
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
    const timer = setInterval(refreshSession, 5 * 60 * 1000) as unknown as NodeJS.Timeout;
    return () => clearInterval(timer);
  }, []);

  const login = (data: { role: AuthUser['role']; tenantId: string; name?: string; staffId?: string; subscriptionPlan?: 'FREE' | 'PRO' | 'ENTERPRISE' }) => {
    store.setAuthUser(data.role, data.tenantId, null, {
      name: data.name,
      staffId: data.staffId
    }, data.subscriptionPlan);
  };

  const logout = () => {
    void logoutAPI().finally(() => store.clearAuth());
  };

  return (
    <AuthContext.Provider value={{
      token: null,
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
