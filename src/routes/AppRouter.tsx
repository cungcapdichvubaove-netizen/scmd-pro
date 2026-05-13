import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { SCMDSuspense } from '../apps/common/interfaces/components/SCMDSuspense';

// Lazy load route-level components
const LandingPage = lazy(() => import('../components/LandingPage').then(m => ({ default: m.LandingPage })));
const SecurityDashboard = lazy(() => import('../apps/security/interfaces/SecurityDashboard').then(m => ({ default: m.SecurityDashboard })));
const SuperAdminDashboard = lazy(() => import('../apps/superadmin/interfaces/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const TenantAdminDashboard = lazy(() => import('../apps/security/interfaces/TenantAdminDashboard').then(m => ({ default: m.TenantAdminDashboard })));
const LoginPage = lazy(() => import('../pages/Login'));
const TrialRegistration = lazy(() => import('../apps/tenants/interfaces/TrialRegistration').then(m => ({ default: m.TrialRegistration })));
const WorkspaceFinder = lazy(() => import('../apps/tenants/interfaces/WorkspaceFinder').then(m => ({ default: m.WorkspaceFinder })));
const NewsPage = lazy(() => import('../components/NewsPage').then(m => ({ default: m.NewsPage })));
const NewsDetail = lazy(() => import('../components/NewsDetail').then(m => ({ default: m.NewsDetail })));
const TaskManager = lazy(() => import('../apps/tasks/TaskManager').then(m => ({ default: m.TaskManager })));
const IncidentPrintView = lazy(() => import('../apps/security/interfaces/IncidentPrintView').then(m => ({ default: m.IncidentPrintView })));
const WatcherPrintView = lazy(() => import('../apps/security/interfaces/WatcherPrintView').then(m => ({ default: m.WatcherPrintView })));

export default function AppRouter() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const LogoutButton = () => (
    <button 
      onClick={() => { logout(); navigate('/'); }} 
      className="absolute top-4 right-4 z-50 px-3 py-1 bg-red-500/20 text-red-500 text-[10px] font-bold rounded-full"
    >
      Đăng xuất
    </button>
  );

  return (
    <Suspense fallback={<SCMDSuspense message="Khởi tạo hệ thống SCMD PRO..." />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage 
          onLogin={() => navigate('/workspace')} 
          onTrial={() => navigate('/register')}
          onNews={() => navigate('/news')}
        />} />
        
        <Route path="/workspace" element={<WorkspaceFinder 
          onFind={(subdomain) => navigate(`/login?tenant=${subdomain}`)}
          onBack={() => navigate('/')}
        />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<TrialRegistration 
          onBack={() => navigate('/')}
          onSuccess={(subdomain) => navigate(`/login?tenant=${subdomain}`)}
        />} />

        <Route path="/news" element={<NewsPage 
          onBack={() => navigate('/')}
          onArticleClick={(slug) => navigate(`/news/${slug}`)}
        />} />
        
        <Route path="/news/:slug" element={<NewsDetail 
          onBack={() => navigate('/news')}
        />} />

        <Route path="/print/incident/:id" element={<IncidentPrintView />} />
        <Route path="/print/watcher" element={<WatcherPrintView />} />

        {/* Global Admin Flow */}
        <Route path="/super-admin/login" element={<LoginPage />} />

        {/* Protected Routes - Platform Admin */}
        <Route path="/super-admin/*" element={
          <ProtectedRoute allowedRoles={['super-admin']}>
            <div className="h-screen overflow-hidden relative">
              <LogoutButton />
              <Routes>
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </div>
          </ProtectedRoute>
        } />

        {/* Protected Routes - Tenant Admin */}
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['tenant-admin']}>
            <div className="h-screen overflow-hidden relative">
              <LogoutButton />
              <Routes>
                <Route path="dashboard" element={<TenantAdminDashboard />} />
                <Route path="tasks" element={<TaskManager />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </div>
          </ProtectedRoute>
        } />

        {/* Protected Routes - Guard / Staff */}
        <Route path="/guard/*" element={
          <ProtectedRoute allowedRoles={['guard']}>
            <div className="max-w-md mx-auto h-screen shadow-2xl overflow-hidden bg-slate-900 relative">
              <LogoutButton />
              <Routes>
                <Route path="app" element={<SecurityDashboard />} />
                <Route path="*" element={<Navigate to="app" replace />} />
              </Routes>
            </div>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
