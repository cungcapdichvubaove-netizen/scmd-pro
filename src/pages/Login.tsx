import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TenantLogin } from '../apps/tenants/interfaces/TenantLogin';
import { useAuth } from '../context/AuthContext';

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
      if (role === 'super-admin') navigate('/super-admin/dashboard', { replace: true });
      else if (role === 'tenant-admin') navigate('/admin/dashboard', { replace: true });
      else if (role === 'guard') navigate('/guard/app', { replace: true });
      return;
    }

    // Scenario B: user đã có session hợp lệ, vào /login → redirect thẳng về dashboard
    if (!justLoggedIn.current && role) {
      if (role === 'super-admin') navigate('/super-admin/dashboard', { replace: true });
      else if (role === 'tenant-admin') navigate('/admin/dashboard', { replace: true });
      else if (role === 'guard') navigate('/guard/app', { replace: true });
    }
  }, [role, isLoading]);

  const handleLoginSuccess = (userData: any) => {
    // FIX: Super-admin luôn thuộc 'tenant_system' (SYSTEM_TENANT_ID).
    const resolvedTenantId = userData.tenantId || (userData.role === 'super-admin' ? 'tenant_system' : undefined);
    justLoggedIn.current = true;
    login({
      token: userData.token,
      role: userData.role,
      tenantId: resolvedTenantId,
      name: userData.fullName || userData.name,
      staffId: userData.id
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
