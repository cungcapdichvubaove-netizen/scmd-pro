import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, MessageSquare, Save, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../../../lib/api';

export const SettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [settings, setSettings] = useState({
    notifications: {
      email: {
        enabled: false,
        smtpHost: '',
        smtpPort: '',
        smtpUser: '',
        smtpPass: '',
        smtpFrom: ''
      },
      zalo: {
        enabled: true,
        startTime: '00:00',
        endTime: '23:59'
      }
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/tenant/settings');
      if (data.settings?.notifications) {
        setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, ...data.settings.notifications } }));
      }
    } catch (err) {
      console.error('Lỗi tải cài đặt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/tenant/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings })
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Lỗi lưu cài đặt:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="loading loading-spinner text-scmd-primary loading-lg"></div></div>;
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-24 max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white tracking-tight">Cài đặt hệ thống</h1>
        <p className="text-scmd-silver/60">Tùy chỉnh thông báo và kết nối của tenant</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Settings */}
        <motion.div className="bg-scmd-navy border border-white/10 rounded-scmd-xl p-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
            <div className="w-10 h-10 bg-scmd-primary/10 text-scmd-primary rounded-xl flex items-center justify-center">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Máy chủ Email (SMTP)</h2>
              <p className="text-[11px] text-scmd-silver/60">Sử dụng để gửi Report và Cảnh báo qua Email</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer border border-white/10 p-3 rounded-lg bg-scmd-surface/50">
              <input 
                type="checkbox" 
                className="checkbox checkbox-sm checkbox-primary"
                checked={settings.notifications.email.enabled}
                onChange={e => setSettings(s => ({...s, notifications: {...s.notifications, email: {...s.notifications.email, enabled: e.target.checked}}}))}
              />
              <span className="text-sm font-medium text-white">Kích hoạt thông báo Email</span>
            </label>

            {settings.notifications.email.enabled && (
              <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label text-xs text-scmd-silver/60">SMTP Host</label>
                    <input type="text" className="input input-sm input-bordered bg-scmd-surface/50 text-white" placeholder="smtp.gmail.com" 
                      value={settings.notifications.email.smtpHost} 
                      onChange={e => setSettings(s => ({...s, notifications: {...s.notifications, email: {...s.notifications.email, smtpHost: e.target.value}}}))}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label text-xs text-scmd-silver/60">SMTP Port</label>
                    <input type="text" className="input input-sm input-bordered bg-scmd-surface/50 text-white" placeholder="587" 
                      value={settings.notifications.email.smtpPort} 
                      onChange={e => setSettings(s => ({...s, notifications: {...s.notifications, email: {...s.notifications.email, smtpPort: e.target.value}}}))}
                    />
                  </div>
                </div>
                
                <div className="form-control">
                  <label className="label text-xs text-scmd-silver/60">SMTP User</label>
                  <input type="text" className="input input-sm input-bordered bg-scmd-surface/50 text-white" placeholder="admin@domain.com" 
                    value={settings.notifications.email.smtpUser} 
                    onChange={e => setSettings(s => ({...s, notifications: {...s.notifications, email: {...s.notifications.email, smtpUser: e.target.value}}}))}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label text-xs text-scmd-silver/60">SMTP Password / App Password</label>
                  <input type="password" className="input input-sm input-bordered bg-scmd-surface/50 text-white" placeholder="••••••••••••" 
                    value={settings.notifications.email.smtpPass} 
                    onChange={e => setSettings(s => ({...s, notifications: {...s.notifications, email: {...s.notifications.email, smtpPass: e.target.value}}}))}
                  />
                  <span className="text-[10px] text-scmd-alert mt-2 flex gap-1 items-center"><ShieldAlert size={10}/> Password sẽ được lưu trữ cục bộ tại Tenant JSON</span>
                </div>
                
                <div className="form-control">
                  <label className="label text-xs text-scmd-silver/60">Gửi từ (From Email)</label>
                  <input type="email" className="input input-sm input-bordered bg-scmd-surface/50 text-white" placeholder="no-reply@domain.com" 
                    value={settings.notifications.email.smtpFrom} 
                    onChange={e => setSettings(s => ({...s, notifications: {...s.notifications, email: {...s.notifications.email, smtpFrom: e.target.value}}}))}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Zalo Settings */}
        <motion.div className="bg-scmd-navy border border-white/10 rounded-scmd-xl p-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
            <div className="w-10 h-10 bg-[#0068FF]/10 text-[#0068FF] rounded-xl flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Kênh thông báo Zalo</h2>
              <p className="text-[11px] text-scmd-silver/60">Sử dụng Zalo OA nội bộ của SCMD Pro</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer border border-white/10 p-3 rounded-lg bg-scmd-surface/50">
              <input 
                type="checkbox" 
                className="checkbox checkbox-sm checkbox-info"
                checked={settings.notifications.zalo.enabled}
                onChange={e => setSettings(s => ({...s, notifications: {...s.notifications, zalo: {...s.notifications.zalo, enabled: e.target.checked}}}))}
              />
              <span className="text-sm font-medium text-white">Kích hoạt nhận tin Zalo</span>
            </label>

            {settings.notifications.zalo.enabled && (
              <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 bg-[#0068FF]/5 border border-[#0068FF]/20 rounded-lg">
                  <p className="text-xs text-[#0068FF] leading-relaxed">
                    Hệ thống sẽ gửi cảnh báo khẩn cấp và báo cáo tự động qua Zalo cho các số điện thoại được gán quyền Admin / Supervisor trong danh sách Nhân sự.
                  </p>
                </div>
                
                <h3 className="text-xs font-bold text-white mb-2 pt-2">Khung giờ nhận tin nhắn hệ thống</h3>
                <div className="flex gap-4 items-center">
                  <div className="form-control flex-1">
                    <label className="label text-xs text-scmd-silver/60">Giờ bắt đầu</label>
                    <input type="time" className="input input-sm input-bordered bg-scmd-surface/50 text-white" 
                      value={settings.notifications.zalo.startTime} 
                      onChange={e => setSettings(s => ({...s, notifications: {...s.notifications, zalo: {...s.notifications.zalo, startTime: e.target.value}}}))}
                    />
                  </div>
                  <div className="text-scmd-silver/40 pt-6">-</div>
                  <div className="form-control flex-1">
                    <label className="label text-xs text-scmd-silver/60">Giờ kết thúc</label>
                    <input type="time" className="input input-sm input-bordered bg-scmd-surface/50 text-white" 
                      value={settings.notifications.zalo.endTime} 
                      onChange={e => setSettings(s => ({...s, notifications: {...s.notifications, zalo: {...s.notifications.zalo, endTime: e.target.value}}}))}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-scmd-silver/60 mt-1">Lưu ý: Các cảnh báo SOS khẩn cấp (có thương vong, cháy nổ) sẽ <strong>BỎ QUA</strong> khung giờ này và luôn được gửi.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? (
            <div className="loading loading-spinner loading-sm"></div>
          ) : success ? (
            <CheckCircle2 size={18} />
          ) : (
            <Save size={18} />
          )}
          {success ? 'Đã lưu cài đặt' : 'Lưu cài đặt'}
        </button>
      </div>
    </div>
  );
};
