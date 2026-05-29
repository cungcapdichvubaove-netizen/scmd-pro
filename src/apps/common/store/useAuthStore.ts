import { create } from 'zustand';
import { AuthUser } from '../../../lib/contracts';
import { resetSocket } from '../../../lib/socket';

interface AuthState {
  tenantId: string | null;
  role: AuthUser['role'] | null;
  token: string | null;
  subscriptionPlan: 'FREE' | 'PRO' | 'ENTERPRISE' | null;
  user: { name?: string; staffId?: string } | null;
  setAuthUser: (role: AuthUser['role'] | null, tenantId?: string, token?: string | null, user?: { name?: string; staffId?: string }, subscriptionPlan?: 'FREE' | 'PRO' | 'ENTERPRISE') => void;
  clearAuth: () => void;
}

const safeLocalStorage = {
  getItem: (key: string) => {
    try { return typeof window !== 'undefined' ? localStorage.getItem(key) : null; }
    catch { return null; }
  },
  setItem: (key: string, value: string) => {
    try { if (typeof window !== 'undefined') localStorage.setItem(key, value); }
    catch {}
  },
  removeItem: (key: string) => {
    try { if (typeof window !== 'undefined') localStorage.removeItem(key); }
    catch {}
  }
};

safeLocalStorage.removeItem('scmd_jwt');
safeLocalStorage.removeItem('scmd_refresh_token');

export const useAuthStore = create<AuthState>((set) => ({
  tenantId: safeLocalStorage.getItem('scmd_tenant_id'),
  role: (safeLocalStorage.getItem('scmd_user_role') as any) || null,
  token: null,
  subscriptionPlan: (safeLocalStorage.getItem('scmd_subscription_plan') as any) || null,
  user: JSON.parse(safeLocalStorage.getItem('scmd_user_profile') || 'null'),
  setAuthUser: (role, tenantId, _token, user, subscriptionPlan) => {
    if (role) safeLocalStorage.setItem('scmd_user_role', role);
    else safeLocalStorage.removeItem('scmd_user_role');

    if (tenantId) safeLocalStorage.setItem('scmd_tenant_id', tenantId);
    else safeLocalStorage.removeItem('scmd_tenant_id');

    safeLocalStorage.removeItem('scmd_jwt');
    safeLocalStorage.removeItem('scmd_refresh_token');

    if (user) safeLocalStorage.setItem('scmd_user_profile', JSON.stringify(user));
    else safeLocalStorage.removeItem('scmd_user_profile');

    if (subscriptionPlan) safeLocalStorage.setItem('scmd_subscription_plan', subscriptionPlan);
    else if (role === 'super-admin') safeLocalStorage.setItem('scmd_subscription_plan', 'PRO');

    set({
      role,
      tenantId: tenantId || null,
      token: null,
      user: user || null,
      subscriptionPlan: subscriptionPlan || (role === 'super-admin' ? 'PRO' : (safeLocalStorage.getItem('scmd_subscription_plan') as any) || 'FREE')
    });
  },
  clearAuth: () => {
    safeLocalStorage.removeItem('scmd_user_role');
    safeLocalStorage.removeItem('scmd_tenant_id');
    safeLocalStorage.removeItem('scmd_jwt');
    safeLocalStorage.removeItem('scmd_refresh_token');
    safeLocalStorage.removeItem('scmd_user_profile');
    safeLocalStorage.removeItem('scmd_subscription_plan');
    resetSocket();
    set({ role: null, tenantId: null, token: null, user: null, subscriptionPlan: null });
  }
}));
