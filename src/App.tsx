import React, { useState, useEffect } from 'react';
import { SecurityDashboard } from './apps/security/interfaces/SecurityDashboard';
import { SuperAdminDashboard } from './apps/tenants/interfaces/SuperAdminDashboard';
import { TenantAdminDashboard } from './apps/security/interfaces/TenantAdminDashboard';
import { AdminBenchmarkRecorder } from './apps/security/interfaces/AdminBenchmarkRecorder';
import { TrialRegistration } from './apps/tenants/interfaces/TrialRegistration';
import { LandingPage } from './components/LandingPage';
import { AuthCallback } from './components/AuthCallback';
import { TenantLogin } from './apps/tenants/interfaces/TenantLogin';
import { WorkspaceFinder } from './apps/tenants/interfaces/WorkspaceFinder';
import { NewsPage } from './components/NewsPage';
import { NewsDetail } from './components/NewsDetail';
import { cn } from './lib/utils';

type Role = 'guard' | 'tenant_admin' | 'super_admin' | null;

export default function App() {
  const [view, setView] = useState<'landing' | 'workspace-finder' | 'tenant-login' | 'guard' | 'admin' | 'tenant-admin' | 'auth-callback' | 'admin-benchmark' | 'trial-registration' | 'super-admin-login' | 'news' | 'news-detail'>('landing');
  const [tenantName, setTenantName] = useState('SCMD Security');
  const [selectedNewsSlug, setSelectedNewsSlug] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role>(null);
  const [userInfo, setUserInfo] = useState<{name: string, staffId: string} | null>(null);

  useEffect(() => {
    // Chuẩn hóa path: xóa dấu gạch chéo cuối để so sánh chính xác
    const path = window.location.pathname.replace(/\/$/, '') || '/';

    // [PHẦN 1: NHẬN DIỆN TÊN MIỀN & LANDING PAGE]
    const hostname = window.location.hostname;
    const isMainDomain = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'scmd.vn' || hostname.includes('run.app');
    
    // Giả lập Session Persistence - Chuẩn hóa role từ localStorage
    const rawSavedRole = localStorage.getItem('scmd_user_role');
    const savedRole = (rawSavedRole ? rawSavedRole.toLowerCase().replace('-', '_') : null) as Role;
    
    const savedToken = localStorage.getItem('scmd_jwt');
    
    // Khôi phục thông tin người dùng từ storage
    const savedName = localStorage.getItem('scmd_user_name');
    const savedStaffId = localStorage.getItem('scmd_staff_id');
    if (savedName && savedStaffId) {
      setUserInfo({ name: savedName, staffId: savedStaffId });
    }

    if (path === '/auth/callback') {
      setView('auth-callback');
      return;
    }
    
    if (path === '/register') {
      setView('trial-registration');
      return;
    }

    // Hỗ trợ cả /super-admin/login và alias /admin cho thuận tiện
    if (path === '/super-admin/login' || path === '/admin') {
      setView('super-admin-login');
      return;
    }

    if (path === '/news') {
      setView('news');
      return;
    }

    if (path.startsWith('/news/')) {
      const slug = path.split('/news/')[1];
      if (slug) {
        setSelectedNewsSlug(slug);
        setView('news-detail');
        return;
      }
    }

    // Hỗ trợ path /:tenant/login
    const pathParts = path.split('/').filter(Boolean);
    if (pathParts.length === 2 && pathParts[1] === 'login' && pathParts[0] !== 'super-admin') {
      const tenantSlug = pathParts[0];
      setTenantName(`Tenant: ${tenantSlug.toUpperCase()}`);
      // Lưu tạm slug vào localStorage để TenantLogin có thể lấy được
      localStorage.setItem('scmd_current_tenant_slug', tenantSlug);
      setView('tenant-login');
      return;
    }

    // Kiểm tra role hợp lệ trước khi thực hiện định tuyến tự động
    if (savedRole && savedToken && ['guard', 'tenant_admin', 'super_admin'].includes(savedRole)) {
      // Đã đăng nhập -> Kiểm tra path để giữ view đúng
      if (path.startsWith('/admin/dashboard')) {
        setView('tenant-admin');
      } else if (path.startsWith('/super-admin/dashboard')) {
        if (savedRole !== 'super_admin') {
          // Không phải super-admin -> Redirect về landing hoặc login
          setView('landing');
          window.history.replaceState(null, '', '/');
        } else {
          setView('admin');
        }
      } else if (path.startsWith('/guard/app')) {
        setView('guard');
      } else if (path.startsWith('/admin/benchmark')) {
        setView('admin-benchmark');
      } else {
        handleSmartRouting(savedRole, undefined, { name: savedName, staffId: savedStaffId });
      }
    } else {
      // Chưa đăng nhập
      if (isMainDomain && (path === '/' || path === '')) {
        setView('landing');
      } else if (!isMainDomain) {
        // Lấy tên tenant từ subdomain (giả lập)
        const subdomain = hostname.split('.')[0];
        setTenantName(`Tenant: ${subdomain.toUpperCase()}`);
        setView('tenant-login');
      }
    }
  }, []);

  // [PHẦN 2 & 3: MIDDLEWARE ĐIỀU HƯỚNG TỰ ĐỘNG & FALLBACK LOGIC]
  const handleSmartRouting = (rawRole: any, redirectUrl?: string, user?: any) => {
    // Chuẩn hóa role: lowercase và chuyển 'super-admin' thành 'super_admin'
    const role = (typeof rawRole === 'string' ? rawRole.toLowerCase().replace('-', '_') : rawRole) as Role;
    
    setUserRole(role);
    localStorage.setItem('scmd_user_role', role || '');

    if (user) {
      localStorage.setItem('scmd_user_name', user.name || '');
      localStorage.setItem('scmd_staff_id', user.staffId || user.id || '');
      setUserInfo({ name: user.name, staffId: user.staffId || user.id });
    }
    
    // Nếu có URL điều hướng từ server, ưu tiên sử dụng
    if (redirectUrl) {
      window.history.replaceState(null, '', redirectUrl);
      if (role === 'super_admin') {
        setView('admin');
      } else if (role === 'tenant_admin') {
        setView('tenant-admin');
      } else if (role === 'guard') {
        setView('guard');
      }
      return;
    }
    
    // Tự động chuyển hướng dựa trên vai trò
    if (role === 'super_admin') {
      setView('admin'); // /super-admin/dashboard/
      window.history.replaceState(null, '', '/super-admin/dashboard/');
    } else if (role === 'tenant_admin') {
      setView('tenant-admin'); // /admin/dashboard/
      window.history.replaceState(null, '', '/admin/dashboard/');
    } else if (role === 'guard') {
      setView('guard'); // /guard/app/
      window.history.replaceState(null, '', '/guard/app/');
    } else {
      // Fallback nếu role không hợp lệ
      localStorage.removeItem('scmd_user_role');
      localStorage.removeItem('scmd_user_name');
      localStorage.removeItem('scmd_staff_id');
      setView('landing');
      window.history.replaceState(null, '', '/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('scmd_user_role');
    localStorage.removeItem('scmd_jwt');
    localStorage.removeItem('scmd_user_name');
    localStorage.removeItem('scmd_staff_id');
    setUserRole(null);
    const hostname = window.location.hostname;
    const isMainDomain = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'scmd.vn' || hostname.includes('run.app');
    
    if (isMainDomain) {
      setView('landing');
      window.history.replaceState(null, '', '/');
    } else {
      setView('tenant-login');
      window.history.replaceState(null, '', '/login');
    }
  };

  return (
    <div className="min-h-screen relative bg-slate-950">
      {view === 'landing' && (
        <LandingPage 
          onLogin={() => {
            console.log('LandingPage onLogin clicked');
            setView('workspace-finder');
          }} 
          onTrial={() => {
            setView('trial-registration');
            window.history.pushState(null, '', '/register');
          }}
          onNews={() => {
            setView('news');
            window.history.pushState(null, '', '/news');
          }}
        />
      )}

      {view === 'news' && (
        <NewsPage 
          onBack={() => {
            setView('landing');
            window.history.pushState(null, '', '/');
          }}
          onArticleClick={(slug) => {
            setSelectedNewsSlug(slug);
            setView('news-detail');
            window.history.pushState(null, '', `/news/${slug}`);
          }}
        />
      )}

      {view === 'news-detail' && selectedNewsSlug && (
        <NewsDetail 
          slug={selectedNewsSlug}
          onBack={() => {
            setView('news');
            window.history.pushState(null, '', '/news');
          }}
        />
      )}

      {view === 'trial-registration' && (
        <TrialRegistration 
          onBack={() => {
            setView('landing');
            window.history.pushState(null, '', '/');
          }}
          onSuccess={(subdomain) => {
            setTenantName(`Tenant: ${subdomain.toUpperCase()}`);
            setView('tenant-login');
            window.history.replaceState(null, '', `/${subdomain}/login`);
          }}
        />
      )}

      {view === 'workspace-finder' && (
        <WorkspaceFinder 
          onFind={(subdomain) => {
            console.log('Workspace found:', subdomain);
            // Giả lập Redirect sang Subdomain
            setTenantName(`Tenant: ${subdomain.toUpperCase()}`);
            setView('tenant-login');
            window.history.replaceState(null, '', `/${subdomain}/login`);
          }}
          onBack={() => setView('landing')}
        />
      )}

      {view === 'tenant-login' && (
        <TenantLogin 
          tenantName={tenantName} 
          onLogin={(role, url, user) => handleSmartRouting(role, url, user)} 
        />
      )}

      {view === 'auth-callback' && (
        <AuthCallback onComplete={(tenant, user) => {
          console.log('Authenticated for tenant:', tenant.name);
          handleSmartRouting(user.role, undefined, user);
        }} />
      )}

      {view === 'super-admin-login' && (
        <TenantLogin 
          tenantName="SCMD Global NOC" 
          onLogin={(role, url, user) => handleSmartRouting(role, url, user)} 
        />
      )}

      {view === 'guard' && (
        <div className="max-w-md mx-auto h-screen shadow-2xl overflow-hidden bg-slate-900 relative">
          <SecurityDashboard user={userInfo} />
          <button onClick={handleLogout} className="absolute top-4 right-4 z-50 px-3 py-1 bg-red-500/20 text-red-500 text-[10px] font-bold rounded-full">Đăng xuất</button>
        </div>
      )}
      
      {view === 'admin' && (
        <div className="h-screen overflow-hidden relative">
          <SuperAdminDashboard />
          <button onClick={handleLogout} className="absolute top-4 right-4 z-50 px-3 py-1 bg-red-500/20 text-red-500 text-[10px] font-bold rounded-full">Đăng xuất</button>
        </div>
      )}
      
      {view === 'tenant-admin' && (
        <div className="h-screen overflow-hidden relative">
          <TenantAdminDashboard />
          <button onClick={handleLogout} className="absolute top-4 right-4 z-50 px-3 py-1 bg-red-500/20 text-red-500 text-[10px] font-bold rounded-full">Đăng xuất</button>
        </div>
      )}

      {view === 'admin-benchmark' && (
        <div className="max-w-md mx-auto h-screen shadow-2xl overflow-hidden bg-slate-900 relative">
          <AdminBenchmarkRecorder />
          <button onClick={() => setView('tenant-admin')} className="absolute top-4 right-4 z-50 px-3 py-1 bg-slate-700 text-slate-300 text-[10px] font-bold rounded-full">Quay lại</button>
        </div>
      )}

      {/* View Switcher for Demo (Simulating Subdomain/Domain access) */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 bg-slate-900/80 backdrop-blur p-4 rounded-2xl border border-slate-800">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Giả lập Truy cập</p>
        <button 
          onClick={() => {
            localStorage.removeItem('scmd_user_role');
            localStorage.removeItem('scmd_jwt');
            setView('landing');
            window.history.replaceState(null, '', '/');
          }}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
        >
          Truy cập Domain Chính (scmd.vn)
        </button>
        <button 
          onClick={() => {
            localStorage.removeItem('scmd_user_role');
            localStorage.removeItem('scmd_jwt');
            setTenantName('Vincom Center');
            setView('tenant-login');
            window.history.replaceState(null, '', '/vincom/login');
          }}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-scmd-cyber/20 text-scmd-cyber hover:bg-scmd-cyber/30 transition-all"
        >
          Truy cập Subdomain (vincom.scmd.vn)
        </button>
        <button 
          onClick={() => {
            localStorage.removeItem('scmd_user_role');
            localStorage.removeItem('scmd_jwt');
            setView('super-admin-login');
            window.history.replaceState(null, '', '/super-admin/login');
          }}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all"
        >
          Truy cập Super Admin (scmd.vn/admin)
        </button>
        <button 
          onClick={() => {
            setView('admin-benchmark');
          }}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-all"
        >
          Thiết lập thực địa (Admin Learning)
        </button>
      </div>
    </div>
  );
}
