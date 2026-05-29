import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import {
  Mail,
  MessageSquare,
  Save,
  Clock,
  MapPin,
  ChevronRight,
  BellRing,
  Building2,
  Loader2,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiFetch } from "../../../lib/api";
import { SCMDButton } from "../../common/interfaces/components/SCMDButton";
import {
  DashboardErrorState,
  DashboardSpinner,
  dashboardInputClass,
} from "../../common/interfaces/components/DashboardUI";
import { cn } from "../../../lib/utils";

const settingsFieldLabelClass =
  "mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-scmd-silver/45";

/** 
 * ToggleSwitch Component cho chuẩn Enterprise 
 */
const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex cursor-pointer items-center justify-between py-2 group">
    <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{label}</span>
    <div className="relative inline-flex items-center" onClick={() => onChange(!checked)}>
      <div className={cn(
        "h-6 w-11 rounded-full transition-colors duration-200 ease-in-out",
        checked ? "bg-blue-600" : "bg-slate-700"
      )} />
      <div className={cn(
        "absolute left-1 h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-in-out",
        checked ? "translate-x-5" : "translate-x-0"
      )} />
    </div>
  </label>
);

/**
 * Divider cho Form Sections
 */
const SectionDivider = () => <div className="my-10 h-px w-full bg-gradient-to-r from-white/10 to-transparent" />;

type TabId = "notifications" | "operations" | "organization";

export const SettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("notifications");
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [settings, setSettings] = useState({
    notifications: {
      email: {
        enabled: false,
        smtpHost: "",
        smtpPort: "",
        smtpUser: "",
        smtpPass: "",
        smtpFrom: "",
      },
      zalo: {
        enabled: true,
        startTime: "00:00",
        endTime: "23:59",
      },
    },
    operations: {
      timezone: "Asia/Ho_Chi_Minh",
      defaultSlaMinutes: "30",
      gpsToleranceMeters: "100",
      missingGuardThresholdMinutes: "10",
      shiftPattern: "12h",
      roleApprovalMode: "tenant-admin",
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const validateField = (name: string, value: any) => {
    let errorMsg = "";
    if (name === "smtpFrom" || name === "smtpUser") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) errorMsg = "Định dạng email không hợp lệ";
    }
    if (name === "defaultSlaMinutes" || name === "gpsToleranceMeters" || name === "missingGuardThresholdMinutes") {
      if (value === "" || isNaN(value) || Number(value) < 0) {
        errorMsg = "Vui lòng nhập một số dương";
      }
    }
    setErrors(prev => ({
      ...prev,
      [name]: errorMsg
    }));
  };

  const isDirty = useMemo(() => {
    if (!originalSettings) return false;
    // So sánh sâu đơn giản qua stringify để kiểm tra thay đổi
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/tenant/settings");
      if (data.settings) {
        setSettings((prev) => ({
          ...prev,
          ...data.settings,
          notifications: {
            ...prev.notifications,
            ...(data.settings.notifications ?? {}),
          },
          operations: {
            ...prev.operations,
            ...(data.settings.operations ?? {}),
          },
        }));
        setOriginalSettings(data.settings);
      }
    } catch (err) {
      console.error("Lỗi tải cài đặt:", err);
      setError("Không thể tải cài đặt tenant. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (Object.values(errors).some(msg => msg !== "")) return;
    setSaving(true);
    try {
      await apiFetch("/api/tenant/settings", {
        method: "PUT",
        body: JSON.stringify({ settings }),
      });
      setSuccess(true);
      setOriginalSettings(settings);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Lỗi lưu cài đặt:", err);
      setError(
        "Không thể lưu cài đặt. Vui lòng kiểm tra lại thông tin và thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <DashboardSpinner message="Đang tải cài đặt tenant..." fullHeight />;
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] gap-12 animate-in fade-in duration-500">
      {/* Cột trái: Settings Navigation */}
      <aside className="w-64 shrink-0 space-y-1 pt-4">
        <h2 className="px-4 pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Hệ thống</h2>
        {[
          { id: "notifications", label: "Thông báo", icon: BellRing, desc: "Email, Zalo & SMS" },
          { id: "operations", label: "SLA & Ca trực", icon: Clock, desc: "Ngưỡng vận hành" },
          { id: "organization", label: "Phân quyền", icon: Building2, desc: "Tenant & RBAC" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabId)}
            className={cn(
              "group flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all",
              activeTab === item.id 
                ? "bg-blue-600/10 text-blue-400 ring-1 ring-blue-500/20" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} className={cn(activeTab === item.id ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
              <div className="text-left">
                <p className="text-sm font-bold">{item.label}</p>
                <p className="text-[10px] opacity-50">{item.desc}</p>
              </div>
            </div>
            {activeTab === item.id && <ChevronRight size={14} />}
          </button>
        ))}
      </aside>

      {/* Cột phải: Settings Form Area */}
      <main className="relative flex-1 rounded-3xl border border-white/5 bg-slate-900/20 p-8 lg:p-12 shadow-2xl">
        {/* Sticky Action Header */}
        <div className="sticky top-0 z-20 -mx-8 -mt-12 mb-12 flex items-center justify-between border-b border-white/5 bg-slate-950/80 px-8 py-6 backdrop-blur-xl rounded-t-3xl">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">
              {activeTab === "notifications" ? "Cấu hình Thông báo" : activeTab === "operations" ? "SLA & Vận hành" : "Phân quyền & Tổ chức"}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {isDirty 
                ? "Bạn có thay đổi chưa lưu • Nhấn nút bên phải để cập nhật" 
                : "Cấu hình hiện tại đã được đồng bộ với hệ thống."}
            </p>
          </div>
          <SCMDButton 
            onClick={handleSave} 
            disabled={saving || !isDirty || Object.values(errors).some(msg => msg !== "")} 
            className={cn(
              "h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all",
              isDirty && !Object.values(errors).some(msg => msg !== "")
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
            )}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : success ? <Check size={16} /> : <Save size={16} />}
            <span className="ml-2">{success ? "Đã cập nhật" : "Lưu thay đổi"}</span>
          </SCMDButton>
        </div>

        {error && <DashboardErrorState title="Lỗi kết nối" description={error} onRetry={fetchSettings} className="mb-8" />}

        {/* Dynamic Forms Area */}
        <div className="max-w-3xl space-y-12">
          {activeTab === "notifications" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              <section>
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center"><Mail size={16}/></div>
                   <h3 className="text-sm font-black uppercase text-slate-300">Máy chủ Email (SMTP)</h3>
                </div>
                <div className="grid gap-6">
                  <ToggleSwitch 
                    label="Kích hoạt thông báo Email" 
                    checked={settings.notifications.email.enabled} 
                    onChange={(v) => setSettings(s => ({ ...s, notifications: { ...s.notifications, email: { ...s.notifications.email, enabled: v } } }))} 
                  />
                  {settings.notifications.email.enabled && (
                    <div className="grid grid-cols-2 gap-4 pt-4 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1.5">
                        <label className={settingsFieldLabelClass}>SMTP Host</label>
                        <input 
                          className={dashboardInputClass} 
                          value={settings.notifications.email.smtpHost} 
                          onChange={(e) => setSettings(s => ({ ...s, notifications: { ...s.notifications, email: { ...s.notifications.email, smtpHost: e.target.value } } }))} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={settingsFieldLabelClass}>Cổng Port</label>
                        <input 
                          className={dashboardInputClass} 
                          value={settings.notifications.email.smtpPort} 
                          onChange={(e) => setSettings(s => ({ ...s, notifications: { ...s.notifications, email: { ...s.notifications.email, smtpPort: e.target.value } } }))} 
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className={settingsFieldLabelClass}>Tài khoản (User)</label>
                        <input 
                          className={cn(dashboardInputClass, errors.smtpUser && "border-red-500/50 focus:border-red-500")} 
                          value={settings.notifications.email.smtpUser} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setSettings(s => ({ ...s, notifications: { ...s.notifications, email: { ...s.notifications.email, smtpUser: val } } }));
                            validateField("smtpUser", val);
                          }} 
                        />
                        {errors.smtpUser && <p className="text-[10px] font-bold text-red-400 uppercase">{errors.smtpUser}</p>}
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className={settingsFieldLabelClass}>Mật khẩu SMTP</label>
                        <div className="relative">
                          <input 
                            type={showSmtpPass ? "text" : "password"} 
                            className={dashboardInputClass} 
                            value={settings.notifications.email.smtpPass} 
                            onChange={(e) => setSettings(s => ({ ...s, notifications: { ...s.notifications, email: { ...s.notifications.email, smtpPass: e.target.value } } }))} 
                          />
                          <button 
                            type="button"
                            onClick={() => setShowSmtpPass(!showSmtpPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          >
                            {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <SectionDivider />

              <section>
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><MessageSquare size={16}/></div>
                   <h3 className="text-sm font-black uppercase text-slate-300">Kênh thông báo Zalo</h3>
                </div>
                <div className="grid gap-6">
                  <ToggleSwitch 
                    label="Kích hoạt nhận tin Zalo OA" 
                    checked={settings.notifications.zalo.enabled} 
                    onChange={(v) => setSettings(s => ({ ...s, notifications: { ...s.notifications, zalo: { ...s.notifications.zalo, enabled: v } } }))} 
                  />
                  <div className="p-4 rounded-xl bg-blue-600/5 border border-blue-500/10 text-[11px] text-blue-300/80 leading-relaxed italic">
                    Zalo OA nội bộ của SCMD Pro dùng để đẩy cảnh báo khẩn cấp SOS và vi phạm ca trực đến Supervisor hằng ngày.
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === "operations" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
               <section>
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center"><Clock size={16}/></div>
                   <h3 className="text-sm font-black uppercase text-slate-300">Chỉ số SLA mặc định</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                   <div className="space-y-1.5">
                      <label className={settingsFieldLabelClass}>SLA xử lý sự cố</label>
                      <input 
                        type="number" 
                        className={cn(dashboardInputClass, errors.defaultSlaMinutes && "border-red-500/50")} 
                        value={settings.operations.defaultSlaMinutes} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(s => ({ ...s, operations: { ...s.operations, defaultSlaMinutes: val } }));
                          validateField("defaultSlaMinutes", val);
                        }} 
                      />
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Đơn vị: Phút</p>
                      {errors.defaultSlaMinutes && <p className="text-[10px] font-bold text-red-400 uppercase">{errors.defaultSlaMinutes}</p>}
                   </div>
                   <div className="space-y-1.5">
                      <label className={settingsFieldLabelClass}>Ngưỡng thiếu quân</label>
                      <input 
                        type="number" 
                        className={dashboardInputClass} 
                        value={settings.operations.missingGuardThresholdMinutes} 
                        onChange={(e) => setSettings(s => ({ ...s, operations: { ...s.operations, missingGuardThresholdMinutes: e.target.value } }))} 
                      />
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Đơn vị: Phút</p>
                   </div>
                </div>
              </section>

              <SectionDivider />

              <section>
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center"><MapPin size={16}/></div>
                   <h3 className="text-sm font-black uppercase text-slate-300">Địa chính & GPS</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                   <div className="space-y-1.5">
                      <label className={settingsFieldLabelClass}>Sai số GPS tối đa</label>
                      <input 
                        type="number" 
                        className={cn(dashboardInputClass, errors.gpsToleranceMeters && "border-red-500/50")} 
                        value={settings.operations.gpsToleranceMeters} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(s => ({ ...s, operations: { ...s.operations, gpsToleranceMeters: val } }));
                          validateField("gpsToleranceMeters", val);
                        }} 
                      />
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Đơn vị: Mét (m)</p>
                      {errors.gpsToleranceMeters && <p className="text-[10px] font-bold text-red-400 uppercase">{errors.gpsToleranceMeters}</p>}
                   </div>
                   <div className="space-y-1.5">
                      <label className={settingsFieldLabelClass}>Mẫu ca vận hành</label>
                      <select className={dashboardInputClass} value={settings.operations.shiftPattern} onChange={(e) => setSettings((s) => ({ ...s, operations: { ...s.operations, shiftPattern: e.target.value } }))}>
                        <option value="8h">Ca 8 giờ (3 Kíp)</option>
                        <option value="12h">Ca 12 giờ (2 Kíp)</option>
                        <option value="24h">Ca 24 giờ</option>
                      </select>
                   </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === "organization" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
               <section>
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center"><Building2 size={16}/></div>
                   <h3 className="text-sm font-black uppercase text-slate-300">Thông tin Tenant</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                   <div className="space-y-1.5"><label className={settingsFieldLabelClass}>Múi giờ hệ thống</label><input className={dashboardInputClass} value={settings.operations.timezone} onChange={(e) => setSettings(s => ({ ...s, operations: { ...s.operations, timezone: e.target.value } }))} /></div>
                   <div className="space-y-1.5">
                      <label className={settingsFieldLabelClass}>Quyền duyệt ngoại lệ</label>
                      <select className={dashboardInputClass} value={settings.operations.roleApprovalMode} onChange={(e) => setSettings((s) => ({ ...s, operations: { ...s.operations, roleApprovalMode: e.target.value } }))}>
                        <option value="tenant-admin">Chỉ Tenant Admin</option>
                        <option value="security-manager">Security Manager trở lên</option>
                        <option value="supervisor">Supervisor trở lên</option>
                      </select>
                   </div>
                </div>
              </section>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};
