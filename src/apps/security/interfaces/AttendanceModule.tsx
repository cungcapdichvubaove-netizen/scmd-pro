import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, MapPin, Clock, LogIn, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { apiFetch } from '../../../lib/api';

export const AttendanceModule: React.FC = () => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);

  useEffect(() => {
    // Determine the current state - in a real app, this should fetch today's attendance record
    const fetchAttendanceStatus = async () => {
      try {
        const data = await apiFetch<any[]>('/api/tenant/attendance/me');
        if (Array.isArray(data) && data.length > 0) {
          const activeSession = data.find(d => d.type === 'CHECK_IN' && !d.checkOutAt);
          if (activeSession) {
            setIsCheckedIn(true);
            setLastCheckIn(new Date(activeSession.createdAt));
          }
        }
      } catch (err) {
        console.error('Failed to fetch attendance status');
      }
    };
    fetchAttendanceStatus();
  }, []);

  const getLocation = (): Promise<{ lat: number; lon: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Trình duyệt không hỗ trợ Geolocation'));
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
        (err) => reject(err)
      );
    });
  };

  const handleAction = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    setIsSubmitting(true);
    let loc = location;
    try {
      if (!loc) {
        loc = await getLocation();
        setLocation(loc);
      }
      
      await apiFetch(`/api/tenant/attendance/${type.toLowerCase().replace('_', '-')}`, {
        method: 'POST',
        body: JSON.stringify({
          location: loc,
          notes: ''
        }),
      });

      setIsCheckedIn(type === 'CHECK_IN');
      if (type === 'CHECK_IN') setLastCheckIn(new Date());

      setMessage({ text: type === 'CHECK_IN' ? 'Check-in thành công!' : 'Check-out thành công!', type: 'success' });
    } catch (err: any) {
      if (err.message === 'ALREADY_CHECKED_IN') {
        setMessage({ text: 'Bạn đã check-in rồi!', type: 'error' });
      } else {
        setMessage({ text: err.message || `Lỗi khi ${type === 'CHECK_IN' ? 'Check-in' : 'Check-out'}`, type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 pb-32 space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Chấm Công</h2>
        <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-bold">Xác thực ca làm việc</p>
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-2xl flex items-center gap-3 text-sm font-bold",
          message.type === 'success' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
        )}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {isCheckedIn && (
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500 animate-pulse" />
        )}
        
        <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800/50">
          <div className="flex items-center gap-3">
            <Clock className="text-blue-400" size={24} />
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Giờ hiện tại</p>
              <p className="text-xl font-black text-white">{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Trạng thái</p>
            <p className={cn("text-sm font-black uppercase", isCheckedIn ? "text-emerald-400" : "text-slate-400")}>
              {isCheckedIn ? "Trong ca làm" : "Chưa vào ca"}
            </p>
          </div>
        </div>

        {isCheckedIn && lastCheckIn && (
          <div className="text-sm font-medium text-slate-400 text-center">
            Bạn đã check-in lúc <span className="text-white font-bold">{lastCheckIn.toLocaleTimeString('vi-VN')}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            disabled={isSubmitting || isCheckedIn}
            onClick={() => handleAction('CHECK_IN')}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3",
              !isCheckedIn && !isSubmitting
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-slate-950 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed"
            )}
          >
            <LogIn size={32} />
            <span className="font-black text-sm uppercase tracking-wider">Vào ca (Check In)</span>
          </button>

          <button
            disabled={isSubmitting || !isCheckedIn}
            onClick={() => handleAction('CHECK_OUT')}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3",
              isCheckedIn && !isSubmitting
                ? "bg-red-500/10 border-red-500 text-red-400 hover:bg-red-500/20"
                : "bg-slate-950 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed"
            )}
          >
            <LogOut size={32} />
            <span className="font-black text-sm uppercase tracking-wider">Ra ca (Check Out)</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-around text-slate-500">
          <div className="flex flex-col items-center text-center gap-1 group">
            <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center group-hover:text-amber-400 transition-colors">
              <MapPin size={18} />
            </div>
            <span className="text-[10px] font-black uppercase">Vị trí</span>
          </div>
          <div className="flex flex-col items-center text-center gap-1 group">
            <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center group-hover:text-blue-400 transition-colors">
              <Camera size={18} />
            </div>
            <span className="text-[10px] font-black uppercase">Khuôn mặt</span>
          </div>
          <div className="flex flex-col items-center text-center gap-1 group">
            <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center group-hover:text-emerald-400 transition-colors">
              <CheckCircle2 size={18} />
            </div>
            <span className="text-[10px] font-black uppercase">Đồng phục</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
