import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { setAuthToken } from '../apps/common/utils/auth';

export const AuthCallback = ({ onComplete }: { onComplete: (tenant: any, user: any) => void }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const exchangeToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        setStatus('error');
        setError('Không tìm thấy mã xác thực (Token).');
        return;
      }

      try {
        const response = await fetch('/api/auth/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(`Auth Error: ${response.status}`, text.substring(0, 100));
          throw new Error(`Auth Error: ${response.status}`);
        }

        const data = await response.json();

        if (response.ok) {
          // 1. Save JWT to localStorage
          setAuthToken(data.access_token);
          
          // 2. Set Cookie for cross-subdomain (Mocked for demo)
          // In real production: document.cookie = `scmd_session=${data.access_token}; domain=.scmd.vn; path=/; Secure; SameSite=Lax`;
          document.cookie = `scmd_session=${data.access_token}; path=/;`;

          setStatus('success');
          
          // Redirect after a short delay to show success state
          setTimeout(() => {
            onComplete(data.tenant, data.user);
          }, 1500);
        } else {
          setStatus('error');
          setError(data.detail || 'Xác thực thất bại.');
        }
      } catch (err) {
        setStatus('error');
        setError('Lỗi kết nối đến hệ thống xác thực.');
      }
    };

    exchangeToken();
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl"
      >
        {status === 'loading' && (
          <div className="space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="w-20 h-20 text-blue-500 animate-spin relative z-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Đang xác thực...</h2>
              <p className="text-slate-400">Vui lòng chờ trong giây lát để hệ thống thiết lập phiên làm việc.</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-12 h-12 text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Xác thực thành công!</h2>
              <p className="text-slate-400">Đang đưa bạn đến Dashboard quản trị...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Lỗi xác thực</h2>
              <p className="text-red-400 font-medium">{error}</p>
            </div>
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
            >
              Quay lại trang chủ
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
