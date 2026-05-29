import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { SCMDSuspense } from "../apps/common/interfaces/components/SCMDSuspense";

const LandingPage = lazy(() => import("../components/landing/LandingPage").then((m) => ({ default: m.LandingPage })));
const SecurityDashboard = lazy(() => import("../apps/security/interfaces/SecurityDashboard").then((m) => ({ default: m.SecurityDashboard })));
const SuperAdminDashboard = lazy(() => import("../apps/superadmin/interfaces/SuperAdminDashboard").then((m) => ({ default: m.SuperAdminDashboard })));
const TenantAdminDashboard = lazy(() => import("../apps/security/interfaces/TenantAdminDashboard").then((m) => ({ default: m.TenantAdminDashboard })));
const VendorCommanderWorkspace = lazy(() => import("../apps/security/interfaces/VendorCommanderWorkspace").then((m) => ({ default: m.VendorCommanderWorkspace })));
const LoginPage = lazy(() => import("../pages/Login"));
const TrialRegistration = lazy(() => import("../apps/tenants/interfaces/TrialRegistration").then((m) => ({ default: m.TrialRegistration })));
const NewsPage = lazy(() => import("../components/NewsPage").then((m) => ({ default: m.NewsPage })));
const NewsDetail = lazy(() => import("../components/NewsDetail").then((m) => ({ default: m.NewsDetail })));
const TaskManager = lazy(() => import("../apps/tasks/TaskManager").then((m) => ({ default: m.TaskManager })));
const IncidentPrintView = lazy(() => import("../apps/security/interfaces/IncidentPrintView").then((m) => ({ default: m.IncidentPrintView })));
const WatcherPrintView = lazy(() => import("../apps/security/interfaces/WatcherPrintView").then((m) => ({ default: m.WatcherPrintView })));
const HelpPage = lazy(() => import("../components/help/HelpPage").then((m) => ({ default: m.HelpPage })));
const ContactPage = lazy(() => import("../pages/contact/ContactPage").then((m) => ({ default: m.ContactPage })));
const PublicArticlePage = lazy(() => import("../components/landing/PublicArticlePage").then((m) => ({ default: m.PublicArticlePage })));

export default function AppRouter() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const LogoutButton = () => (
    <button
      onClick={() => {
        logout();
        navigate("/");
      }}
      className="absolute right-4 top-4 z-50 rounded-full bg-red-500/20 px-3 py-1 text-[10px] font-bold text-red-500"
    >
      Đăng xuất
    </button>
  );

  return (
    <Suspense fallback={<SCMDSuspense message="Khởi tạo hệ thống SCMD PRO..." />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/workspace" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/register"
          element={
            <TrialRegistration
              onBack={() => navigate("/")}
              onSuccess={(subdomain) => navigate(`/login?tenant=${subdomain}`)}
            />
          }
        />

        <Route
          path="/news"
          element={
            <NewsPage
              onBack={() => navigate("/")}
              onArticleClick={(slug) => navigate(`/news/${slug}`)}
            />
          }
        />

        <Route
          path="/news/:slug"
          element={<NewsDetail onBack={() => navigate("/news")} />}
        />

        <Route path="/help" element={<HelpPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/articles/:slug" element={<PublicArticlePage />} />
        <Route path="/status" element={<Navigate to="/articles/trang-thai-he-thong" replace />} />
        <Route path="/privacy" element={<Navigate to="/articles/chinh-sach-bao-mat" replace />} />
        <Route path="/terms" element={<Navigate to="/articles/dieu-khoan-dich-vu" replace />} />
        <Route path="/print/incident/:id" element={<IncidentPrintView />} />
        <Route path="/print/watcher" element={<WatcherPrintView />} />
        <Route path="/super-admin/login" element={<LoginPage />} />

        <Route
          path="/super-admin/*"
          element={
            <ProtectedRoute allowedRoles={["super-admin"]}>
              <div className="relative h-screen overflow-hidden">
                <LogoutButton />
                <Routes>
                  <Route path="dashboard" element={<SuperAdminDashboard />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["tenant-admin"]}>
              <div className="relative h-screen overflow-hidden">
                <Routes>
                  <Route path="dashboard" element={<TenantAdminDashboard />} />
                  <Route path=":tab" element={<TenantAdminDashboard />} />
                  <Route path="tasks/legacy" element={<TaskManager />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendor-commander/*"
          element={
            <ProtectedRoute allowedRoles={["vendor-commander"]}>
              <div className="relative h-screen overflow-hidden">
                <LogoutButton />
                <Routes>
                  <Route path="workspace" element={<VendorCommanderWorkspace />} />
                  <Route path="*" element={<Navigate to="workspace" replace />} />
                </Routes>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/guard/*"
          element={
            <ProtectedRoute allowedRoles={["guard"]}>
              <div className="relative mx-auto h-screen max-w-md overflow-hidden bg-slate-900 shadow-2xl">
                <LogoutButton />
                <Routes>
                  <Route path="app" element={<SecurityDashboard />} />
                  <Route path="*" element={<Navigate to="app" replace />} />
                </Routes>
              </div>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
