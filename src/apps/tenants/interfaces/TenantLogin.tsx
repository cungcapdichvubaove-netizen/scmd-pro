import React, { useState, useEffect } from 'react';
import { Shield, ArrowRight, AlertTriangle, ShieldCheck, Building2 } from 'lucide-react';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDInput } from '../../common/interfaces/components/SCMDInput';
import { SCMDLogo } from '../../common/interfaces/components/SCMDLogo';
import { loginAPI } from '../../../services/auth.service';
import ReCAPTCHA from 'react-google-recaptcha';

interface TenantLoginProps {
  tenantName: string;
  initialTenantCode?: string;
  onLogin: (user: any) => void;
}

export const TenantLogin: React.FC<TenantLoginProps> = ({ tenantName, initialTenantCode = '', onLogin }) => {
  const [tenantCode, setTenantCode] = useState(initialTenantCode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captcha, setCaptcha] = useState({ id: '', num1: 0, num2: 0 });
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const fetchCaptcha = async () => {
    try {
      const res = await fetch('/api/v1/auth/captcha');
      if (!res.ok) {
        throw new Error(`Failed to fetch captcha: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setCaptcha({ id: data.captchaId, num1: data.num1, num2: data.num2 });
      setCaptchaAnswer('');
    } catch (err: any) {
      console.error("Failed to fetch captcha error:", err.message || err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tenantCode.trim()) {
      setError('Vui lòng nhập mã doanh nghiệp. Ví dụ: ktcsecurity');
      return;
    }
    
    let effectiveTenantCode = tenantCode.trim().toLowerCase();
    if (effectiveTenantCode === 'admin') {
      effectiveTenantCode = 'system';
    }

    if (!captchaAnswer) {
      setError('Vui lòng nhập mã bảo mật.');
      fetchCaptcha();
      return;
    }

    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (recaptchaSiteKey && !recaptchaToken) {
      setError('Vui lòng xác thực reCAPTCHA.');
      return;
    }

    setIsLoading(true);
    
    try {
      const data = await loginAPI({ 
        tenantCode: effectiveTenantCode,
        username, 
        password,
        captchaId: captcha.id,
        captchaAnswer: captchaAnswer,
        recaptchaToken: recaptchaToken || undefined
      });

      localStorage.removeItem('scmd_jwt');
      localStorage.removeItem('scmd_refresh_token');
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
      fetchCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-header)] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-header)]/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-primary)]/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center justify-center mb-10">
          <SCMDLogo variant="dark" size="lg" className="mb-6 flex-col gap-6" />
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">{tenantName}</h1>
          <p className="text-[var(--color-text-muted)] font-medium text-center">Đăng nhập workspace giám sát dịch vụ bảo vệ</p>
        </div>

        <div className="bg-[var(--color-surface)]/5 backdrop-blur-xl border border-[var(--color-border)]/10 p-8 rounded-[var(--radius-xl)] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-[var(--radius-md)] p-4 flex items-start gap-3">
                <AlertTriangle className="text-[var(--color-danger)] shrink-0 mt-0.5" size={18} />
                <p className="text-sm font-medium text-red-200">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em] mb-3 ml-1">
                Workspace / Mã doanh nghiệp
              </label>
              <SCMDInput 
                type="text" 
                placeholder="Ví dụ: ktcsecurity"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
                className={`bg-[var(--color-surface)]/5 border-[var(--color-border)]/20 text-white placeholder:text-[var(--color-text-muted)] font-mono ${!tenantCode ? 'border-amber-500/50' : ''}`}
              />
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-1.5 ml-1 flex items-center gap-1.5">
                <Building2 size={12} /> Nhập workspace cùng tài khoản và mật khẩu trong một bước. Nếu workspace sai, dữ liệu đăng nhập vẫn được giữ nguyên để sửa lại.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em] mb-3 ml-1">
                Tài khoản đăng nhập
              </label>
              <SCMDInput 
                type="text" 
                placeholder="Ví dụ: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-[var(--color-surface)]/5 border-[var(--color-border)]/20 text-white placeholder:text-[var(--color-text-muted)]"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em] mb-3 ml-1">
                Mật khẩu
              </label>
              <SCMDInput 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[var(--color-surface)]/5 border-[var(--color-border)]/20 text-white placeholder:text-[var(--color-text-muted)]"
              />
            </div>

            <div className="bg-[var(--color-surface)]/5 rounded-[var(--radius-lg)] p-4 border border-[var(--color-border)]/20">
              <label className="flex items-center gap-2 text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em] mb-3 ml-1">
                <ShieldCheck size={14} className="text-[var(--color-primary-accent)]" />
                Xác thực bảo mật
              </label>
              <div className="flex items-center gap-4">
                <div className="font-mono text-xl font-black text-white bg-[var(--color-surface)]/10 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)]/20">
                  {captcha.num1} + {captcha.num2} = ?
                </div>
                <SCMDInput 
                  type="number" 
                  placeholder="Nhập kết quả" 
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  required
                  className="bg-[var(--color-surface)]/5 border-[var(--color-border)]/20 text-white placeholder:text-[var(--color-text-muted)] text-center text-lg font-bold w-full"
                />
              </div>
            </div>

            {import.meta.env.VITE_RECAPTCHA_SITE_KEY && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                  onChange={(token) => setRecaptchaToken(token)}
                  theme="dark"
                />
              </div>
            )}

            <SCMDButton
              type="submit"
              className="w-full h-14 text-base shadow-lg shadow-[var(--color-primary)]/20 mt-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold rounded-[var(--radius-sm)] transition-[var(--transition-base)] uppercase"
              isLoading={isLoading}
            >
              Đăng nhập workspace <ArrowRight size={20} className="ml-2" />
            </SCMDButton>
          </form>

          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 p-4 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-primary-accent)]">
              Demo nhanh
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              Workspace: <span className="font-mono font-black">vinhomes</span>
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              Tài khoản: <span className="font-mono font-black">admin_vinhomes</span>
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              Mật khẩu: <span className="font-mono font-black">Demo@2025!</span>
            </p>
            <p className="mt-2 text-[11px] text-[var(--color-text-secondary)]">
              Workspace `ktcsecurity` / user `admin` chỉ hợp lệ khi môi trường đã chạy seed `ktc-ocb`.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--color-border)]/10 text-center">
            <p className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest flex items-center justify-center gap-2">
              <Shield size={12} />
              Được bảo vệ bởi SCMD Security + Anti-DDoS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
