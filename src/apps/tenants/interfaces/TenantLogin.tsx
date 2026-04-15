import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, Building2 } from 'lucide-react';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDInput } from '../../common/interfaces/components/SCMDInput';
import { setAuthToken } from '../../common/utils/auth';

interface TenantLoginProps {
  tenantName: string;
  onLogin: (role: string, redirectUrl?: string, user?: any) => void;
}

export const TenantLogin: React.FC<TenantLoginProps> = ({ tenantName, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Lấy tenantId/slug từ URL hoặc localStorage
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const tenantSlug = pathParts.length >= 2 && pathParts[pathParts.length - 1] === 'login' 
      ? pathParts[0] 
      : localStorage.getItem('scmd_current_tenant_slug');

    // Chuẩn hóa tenantId: nếu là 'super-admin' thì dùng 'system'
    const resolvedTenantHeader = tenantSlug === 'super-admin' ? 'system' : (tenantSlug || '');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': resolvedTenantHeader
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        setAuthToken(data.access_token);
        // Sử dụng role và URL điều hướng trực tiếp từ server trả về
        onLogin(data.user.role, data.redirect_url, data.user);
      } else {
        alert(data.detail || "Sai tài khoản hoặc mật khẩu.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert("Lỗi kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-scmd-navy/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-scmd-cyber/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-scmd-slate border border-slate-800 shadow-2xl mb-6">
            <Building2 size={40} className="text-scmd-cyber" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">{tenantName}</h1>
          <p className="text-slate-400 font-medium">Hệ thống Quản lý An ninh SCMD</p>
        </div>

        <div className="bg-scmd-slate/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[32px] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Tài khoản
              </label>
              <SCMDInput 
                type="text" 
                placeholder="Tên đăng nhập" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-600"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Mật khẩu
              </label>
              <SCMDInput 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-600"
              />
            </div>

            <SCMDButton 
              type="submit" 
              className="w-full h-14 text-base shadow-lg shadow-scmd-cyber/20"
              isLoading={isLoading}
            >
              Đăng nhập hệ thống <ArrowRight size={20} className="ml-2" />
            </SCMDButton>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
              <Shield size={12} />
              Được bảo vệ bởi SCMD Security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
