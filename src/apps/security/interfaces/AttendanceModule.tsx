import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, MapPin, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { getAuthHeaders } from '../../common/utils/auth';

export const AttendanceModule: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<{ type: string, time: Date, status?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAttendance = async (type: 'check-in' | 'check-out') => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Trình duyệt của bạn không hỗ trợ GPS.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('/api/security/attendance/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              type
            })
          });
          
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Lỗi hệ thống: ${res.status}`);
          }

          const data = await res.json();
          setLastAction({ 
            type: data.type || type, 
            time: data.timestamp ? new Date(data.timestamp) : new Date(),
            status: data.status || 'Thành công'
          });
        } catch (e: any) {
          console.error(e);
          setError(e.message || 'Không thể kết nối đến máy chủ.');
        } finally {
          setLoading(false);
        }
      }, 
      (err) => {
        console.error(err);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Vui lòng cấp quyền truy cập vị trí (GPS) để chấm công.');
        } else {
          setError('Không thể lấy vị trí hiện tại. Vui lòng thử lại.');
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-8 flex flex-col items-center justify-center min-h-full"
    >
      <div className="text-center space-y-4 w-full">
        <div className="inline-flex items-center justify-center p-4 bg-slate-800/50 rounded-full mb-2 border border-slate-700">
          <Clock className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">
          {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </h1>
        <p className="text-slate-400 font-medium">
          {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <button
          onClick={() => handleAttendance('check-in')}
          disabled={loading}
          className="h-32 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 rounded-2xl text-white flex flex-col items-center justify-center gap-3 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 border border-emerald-500/50"
        >
          {loading ? <Loader2 className="animate-spin w-8 h-8" /> : <LogIn className="w-8 h-8" />}
          <span className="text-sm font-bold uppercase tracking-widest">Vào ca</span>
        </button>

        <button
          onClick={() => handleAttendance('check-out')}
          disabled={loading}
          className="h-32 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:opacity-50 rounded-2xl text-white flex flex-col items-center justify-center gap-3 shadow-lg shadow-slate-900/20 transition-all active:scale-95 border border-slate-700"
        >
          {loading ? <Loader2 className="animate-spin w-8 h-8" /> : <LogOut className="w-8 h-8 text-slate-400" />}
          <span className="text-sm font-bold uppercase tracking-widest text-slate-300">Ra ca</span>
        </button>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400 leading-relaxed">{error}</p>
        </motion.div>
      )}

      {lastAction && !error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-5 bg-slate-800/50 border border-slate-700 rounded-2xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Ghi nhận thành công</p>
              <p className="text-white font-medium">
                {lastAction.type === 'check-in' ? 'Đã vào ca' : 'Đã ra ca'} lúc <span className="font-bold text-blue-400">{lastAction.time.toLocaleTimeString('vi-VN')}</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider mt-auto pt-8">
        <MapPin className="w-4 h-4" />
        <span>Hệ thống sử dụng GPS để xác thực vị trí</span>
      </div>
    </motion.div>
  );
};

