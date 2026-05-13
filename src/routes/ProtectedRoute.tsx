import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { role, token, isLoading } = useAuth();
  const location = useLocation();

  // FIX [BUG-6a]: Xóa console.log debug không có điều kiện — lộ role/token ra DevTools production.
  if (process.env.NODE_ENV !== 'production') {
    console.log('[ProtectedRoute Debug]', {
      path: location.pathname,
      isLoading,
      hasToken: !!token,
      role,
      allowedRoles,
    });
  }

  // Luôn ưu tiên spinner khi đang verify session.
  // FIX [BUG-5 dep]: Nhờ AuthContext đã set isLoading=true trước getMe(),
  // block này đảm bảo không có race condition "role=null + token=OK -> Navigate sai".
  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col justify-center items-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-scmd-cyber border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-scmd-cyber font-mono animate-pulse">Verifying Session Security...</div>
      </div>
    );
  }

  if (!token) {
    // Redirect to login, preserve current location de sau login quay lai dung trang
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role || '')) {
    // Role khong khop -- redirect ve dung dashboard theo role thuc te
    if (role === 'super-admin') return <Navigate to="/super-admin/dashboard" replace />;
    if (role === 'tenant-admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'guard') return <Navigate to="/guard/app" replace />;

    // FIX [BUG-6b]: Fallback truoc la Navigate to="/" (landing page) -- gay nham lan khi
    // role=null do race condition, user thay trang chu thay vi man hinh login.
    // Fix: luon redirect ve /login, preserve location de user login lai dung cach.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
