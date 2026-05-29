import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TenantLogin } from '../apps/tenants/interfaces/TenantLogin';
import { useAuth } from '../context/AuthContext';

const resolveRoleHome = (role: string | null | undefined) => {
  if (role === 'super-admin') return '/super-admin/dashboard';
  if (role === 'tenant-admin') return '/admin/dashboard';
  if (role === 'guard') return '/guard/app';
  if (role === 'vendor-commander') return '/vendor-commander/workspace';
  return null;
};

const ensureDeviceSecret = () => {
  if (localStorage.getItem('scmd_device_secret')) return;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const secret = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('scmd_device_secret', `DS_${secret}`);
};

export default function LoginPage() {
  const { login, role, isLoading } = useAuth();
  const navigate = useNavigate();
  // Guard: chỉ navigate khi role được set SAU khi user bấm login,
  // không navigate spurious khi TenantLogin re-render do AuthContext isLoading thay đổi.
  const justLoggedIn = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    // Scenario A: user vừa bấm login → navigate đến dashboard đúng role
    if (justLoggedIn.current && role) {
      const home = resolveRoleHome(role);
      if (home) navigate(home, { replace: true });
      return;
    }

    // Scenario B: user đã có session hợp lệ, vào /login → redirect thẳng về dashboard
    if (!justLoggedIn.current && role) {
      const home = resolveRoleHome(role);
      if (home) navigate(home, { replace: true });
    }
  }, [role, isLoading, navigate]);

  const handleLoginSuccess = (userData: any) => {
    // FIX: Super-admin luôn thuộc 'tenant_system' (SYSTEM_TENANT_ID).
    const resolvedTenantId = userData.tenantId || (userData.role === 'super-admin' ? 'tenant_system' : undefined);
    ensureDeviceSecret();
    justLoggedIn.current = true;
    login({
      role: userData.role,
      tenantId: resolvedTenantId,
      name: userData.fullName || userData.name,
      staffId: userData.staffId || userData.id
    });
    // navigate được xử lý bởi useEffect sau khi role commit vào store.
  };

  return (
    <TenantLogin 
      tenantName="Hệ thống SCMD Security"
      initialTenantCode={new URLSearchParams(window.location.search).get('tenant') || ''}
      onLogin={handleLoginSuccess}
    />
  );
}
