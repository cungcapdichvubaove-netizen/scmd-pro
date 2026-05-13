import React from 'react';
import { 
  UserPlus, 
  Edit3, 
  X, 
  Hash, 
  Lock, 
  ShieldCheck, 
  Check, 
  Loader2,
  AlertTriangle,
  ArrowUpCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { Staff } from '../types';
import { 
  INPUT_CLS, 
  LABEL_CLS, 
  getDisplayName 
} from '../StaffTab.utils.js';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard.js';
import { StaffReputationBadge } from './StaffReputationBadge.js';

interface StaffFormProps {
  editingStaff: Staff | null;
  newStaff: any;
  isSubmitting: boolean;
  setNewStaff: React.Dispatch<React.SetStateAction<any>>;
  cancelEditingStaff: () => void;
  handleAddStaff: (e: React.FormEvent) => void;
  tenantInfo?: any;
  staffCount?: number;
}

export const StaffForm: React.FC<StaffFormProps> = ({
  editingStaff,
  newStaff,
  isSubmitting,
  setNewStaff,
  cancelEditingStaff,
  handleAddStaff,
  tenantInfo,
  staffCount = 0,
}) => {
  const maxEmployees = tenantInfo?.maxEmployees || 5;
  const isLimitReached = !editingStaff && staffCount >= maxEmployees;

  const addWorkHistory = () => {
    const history = Array.isArray(newStaff.workHistory) ? newStaff.workHistory : [];
    setNewStaff({
      ...newStaff,
      workHistory: [
        ...history,
        { id: Math.random().toString(36).substr(2, 9), company: '', position: '', startDate: '', endDate: '', description: '' }
      ]
    });
  };

  const removeWorkHistory = (id: string) => {
    setNewStaff({
      ...newStaff,
      workHistory: newStaff.workHistory.filter((w: any) => w.id !== id)
    });
  };

  const updateWorkHistory = (id: string, field: string, value: string) => {
    setNewStaff({
      ...newStaff,
      workHistory: newStaff.workHistory.map((w: any) => w.id === id ? { ...w, [field]: value } : w)
    });
  };

  return (
    <SCMDCard className="p-6 bg-scmd-surface border border-white/5 rounded-2xl shadow-xl">
      {/* Form header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              editingStaff
                ? 'bg-scmd-primary/20 text-scmd-primary border border-scmd-primary/20'
                : isLimitReached 
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
            )}
          >
            {editingStaff ? <Edit3 size={16} /> : <UserPlus size={16} />}
          </div>
          <div>
            <h3 id="staff-form-header" className="text-base font-black text-white uppercase tracking-tight">
              {editingStaff ? 'Cập nhật hồ sơ' : 'Thêm nhân viên'}
            </h3>
            {editingStaff ? (
              <p className="text-[10px] text-scmd-primary font-black uppercase tracking-widest mt-0.5">
                Đang sửa: {getDisplayName(editingStaff)}
              </p>
            ) : (
              <p className="text-[10px] text-scmd-silver/40 font-black uppercase tracking-widest mt-0.5">
                QUY MÔ: {staffCount}/{maxEmployees} NHÂN SỰ
              </p>
            )}
          </div>
        </div>
        {editingStaff && (
          <button
            onClick={cancelEditingStaff}
            className="flex items-center gap-1 text-[10px] font-black text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
          >
            <X size={12} /> Hủy
          </button>
        )}
      </div>

      {isLimitReached && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
          <div className="flex items-center gap-3 text-amber-400">
            <AlertTriangle size={16} />
            <span className="text-[11px] font-black uppercase tracking-tight">Đã đạt giới hạn nhân sự</span>
          </div>
          <p className="text-[10px] font-bold text-amber-400/60 leading-relaxed uppercase">
            Hệ thống gói FREE/TRIAL giới hạn tối đa {maxEmployees} nhân viên.
            Vui lòng nâng cấp lên gói PRO để mở rộng quy mô không giới hạn.
          </p>
          <button 
            type="button"
            className="w-full h-10 mt-2 bg-amber-500 hover:bg-amber-400 text-scmd-navy font-black text-[10px] uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <ArrowUpCircle size={14} /> Nâng cấp ngay
          </button>
        </div>
      )}

      <form onSubmit={handleAddStaff} className="space-y-4">
        {/* Họ tên */}
        <div>
          <label className={LABEL_CLS}>Họ và tên đầy đủ</label>
          <input
            type="text"
            required
            disabled={isLimitReached}
            value={newStaff.fullName}
            onChange={(e) =>
              setNewStaff({ ...newStaff, fullName: e.target.value })
            }
            className={cn(INPUT_CLS, isLimitReached && "opacity-50 cursor-not-allowed")}
            placeholder="Nguyễn Văn A"
          />
        </div>

        {/* StaffID + Username */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>
              <Hash size={9} className="inline mr-1" />
              Mã nhân viên
            </label>
            <input
              type="text"
              required
              disabled={isLimitReached}
              value={newStaff.staffId}
              onChange={(e) => setNewStaff({ ...newStaff, staffId: e.target.value })}
              className={cn(INPUT_CLS, 'font-mono', isLimitReached && "opacity-50 cursor-not-allowed")}
              placeholder="NV001"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Tên đăng nhập</label>
            <input
              type="text"
              required
              disabled={isLimitReached}
              value={newStaff.username}
              onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
              className={cn(INPUT_CLS, isLimitReached && "opacity-50 cursor-not-allowed")}
              placeholder="username"
            />
          </div>
        </div>

        {/* Password & Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>
              <Lock size={9} className="inline mr-1" />
              Mật khẩu {editingStaff && <span className="normal-case text-scmd-silver/20">(để trống)</span>}
            </label>
            <input
              type="password"
              required={!editingStaff}
              disabled={isLimitReached}
              value={newStaff.password}
              onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
              className={cn(INPUT_CLS, isLimitReached && "opacity-50 cursor-not-allowed")}
              placeholder={editingStaff ? 'Giữ nguyên' : '••••••••'}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Địa chỉ Email</label>
            <input
              type="email"
              required
              disabled={isLimitReached}
              value={newStaff.email || ''}
              onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              className={cn(INPUT_CLS, isLimitReached && "opacity-50 cursor-not-allowed")}
              placeholder="email@scmdpro.com"
            />
          </div>
        </div>

        {/* Role */}
        <div>
          <label className={LABEL_CLS}>Vai trò</label>
          <select
            value={newStaff.role}
            disabled={isLimitReached}
            onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
            className={cn(INPUT_CLS, 'appearance-none cursor-pointer', isLimitReached && "opacity-50 cursor-not-allowed")}
          >
            <option value="guard">Nhân viên bảo vệ</option>
            <option value="supervisor">Giám sát</option>
            <option value="tenant-admin">Quản trị viên</option>
            <option value="technician">Kỹ thuật viên</option>
          </select>
        </div>

        {/* Bằng cấp + Chứng chỉ */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Bằng cấp</label>
            <textarea
              disabled={isLimitReached}
              value={newStaff.qualifications}
              onChange={(e) => setNewStaff({ ...newStaff, qualifications: e.target.value })}
              className={cn(INPUT_CLS, 'h-20 resize-none text-xs', isLimitReached && "opacity-50 cursor-not-allowed")}
              placeholder="Đại học, cao đẳng..."
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Chứng chỉ</label>
            <textarea
              disabled={isLimitReached}
              value={newStaff.certificates}
              onChange={(e) => setNewStaff({ ...newStaff, certificates: e.target.value })}
              className={cn(INPUT_CLS, 'h-20 resize-none text-xs', isLimitReached && "opacity-50 cursor-not-allowed")}
              placeholder="PCCC, võ thuật..."
            />
          </div>
        </div>

        {/* Khen thưởng + Kỷ luật */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Khen thưởng</label>
            <textarea
              disabled={isLimitReached}
              value={newStaff.rewards}
              onChange={(e) => setNewStaff({ ...newStaff, rewards: e.target.value })}
              className={cn(INPUT_CLS, 'h-16 resize-none text-xs', isLimitReached && "opacity-50 cursor-not-allowed")}
              placeholder="Thành tích nổi bật..."
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Kỷ luật</label>
            <textarea
              disabled={isLimitReached}
              value={newStaff.disciplines}
              onChange={(e) => setNewStaff({ ...newStaff, disciplines: e.target.value })}
              className={cn(INPUT_CLS, 'h-16 resize-none text-xs', isLimitReached && "opacity-50 cursor-not-allowed")}
              placeholder="Vi phạm (nếu có)..."
            />
          </div>
        </div>

        {/* Lịch sử công việc */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={cn(LABEL_CLS, "mb-0")}>Lịch sử công việc</label>
            <button
              type="button"
              onClick={addWorkHistory}
              disabled={isLimitReached}
              className="flex items-center gap-1.5 px-2 py-1 bg-scmd-primary/10 hover:bg-scmd-primary/20 text-scmd-primary rounded-lg text-[9px] font-black uppercase transition-all"
            >
              <Plus size={12} /> Thêm kinh nghiệm
            </button>
          </div>
          
          <div className="space-y-3">
            {Array.isArray(newStaff.workHistory) && newStaff.workHistory.map((work: any) => (
              <div key={work.id} className="p-3 bg-scmd-navy/50 rounded-xl border border-white/5 space-y-2 relative group">
                <button
                  type="button"
                  onClick={() => removeWorkHistory(work.id)}
                  className="absolute top-2 right-2 p-1 text-scmd-silver/20 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Công ty"
                    value={work.company}
                    onChange={(e) => updateWorkHistory(work.id, 'company', e.target.value)}
                    className={cn(INPUT_CLS, "text-[11px] h-9")}
                  />
                  <input
                    type="text"
                    placeholder="Vị trí"
                    value={work.position}
                    onChange={(e) => updateWorkHistory(work.id, 'position', e.target.value)}
                    className={cn(INPUT_CLS, "text-[11px] h-9")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Từ ngày (VD: 01/2020)"
                    value={work.startDate}
                    onChange={(e) => updateWorkHistory(work.id, 'startDate', e.target.value)}
                    className={cn(INPUT_CLS, "text-[11px] h-9 font-mono")}
                  />
                  <input
                    type="text"
                    placeholder="Đến ngày (VD: 12/2022)"
                    value={work.endDate}
                    onChange={(e) => updateWorkHistory(work.id, 'endDate', e.target.value)}
                    className={cn(INPUT_CLS, "text-[11px] h-9 font-mono")}
                  />
                </div>
                <textarea
                  placeholder="Mô tả ngắn gọn kinh nghiệm..."
                  value={work.description}
                  onChange={(e) => updateWorkHistory(work.id, 'description', e.target.value)}
                  className={cn(INPUT_CLS, "text-[11px] h-14 resize-none")}
                />
              </div>
            ))}
            {(!newStaff.workHistory || newStaff.workHistory.length === 0) && (
              <div className="p-4 bg-scmd-navy/20 rounded-xl border border-white/5 border-dashed text-center">
                <p className="text-[10px] font-bold text-scmd-silver/20 uppercase tracking-widest">Chưa có lịch sử công tác</p>
              </div>
            )}
          </div>
        </div>

        {/* Pháp lý & Chứng chỉ hành nghề */}
        <div className="p-4 bg-scmd-navy/50 rounded-xl border border-white/5 space-y-3 shadow-inner">
          <p className="flex items-center gap-2 text-[10px] font-black text-scmd-silver/60 uppercase tracking-[0.18em]">
            <ShieldCheck size={12} className="text-scmd-primary" />
            Pháp lý & Hành nghề
          </p>
          <div>
            <label className={LABEL_CLS}>Số CMND / CCCD</label>
            <input
              type="text"
              disabled={isLimitReached}
              value={newStaff.credentials?.idNumber || ''}
              onChange={(e) =>
                setNewStaff({
                  ...newStaff,
                  credentials: { ...(newStaff.credentials || {}), idNumber: e.target.value },
                })
              }
              className={cn(INPUT_CLS, isLimitReached && "opacity-50 cursor-not-allowed")}
              placeholder="012345678901"
            />
            <StaffReputationBadge idNumber={newStaff.credentials?.idNumber || ''} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Số chứng chỉ</label>
              <input
                type="text"
                disabled={isLimitReached}
                value={newStaff.credentials.licenseNumber}
                onChange={(e) =>
                  setNewStaff({
                    ...newStaff,
                    credentials: { ...newStaff.credentials, licenseNumber: e.target.value },
                  })
                }
                className={cn(INPUT_CLS, isLimitReached && "opacity-50 cursor-not-allowed")}
                placeholder="Số thẻ..."
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Ngày hết hạn</label>
              <input
                type="date"
                disabled={isLimitReached}
                value={newStaff.credentials.expiryDate}
                onChange={(e) =>
                  setNewStaff({
                    ...newStaff,
                    credentials: { ...newStaff.credentials, expiryDate: e.target.value },
                  })
                }
                className={cn(INPUT_CLS, isLimitReached && "opacity-50 cursor-not-allowed")}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || isLimitReached}
          className={cn(
            'w-full h-12 flex items-center justify-center gap-2 font-black text-sm rounded-xl transition-all',
            editingStaff
              ? 'bg-[var(--color-primary)] hover:bg-[#1d4ed8] text-white shadow-lg shadow-[var(--color-primary)]/25'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25',
            (isSubmitting || isLimitReached) && 'opacity-60 cursor-not-allowed',
          )}
        >
          {isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : editingStaff ? (
            <Check size={18} />
          ) : (
            <UserPlus size={18} />
          )}
          {editingStaff ? 'Lưu thay đổi' : 'Thêm nhân viên'}
        </button>
      </form>
    </SCMDCard>
  );
};
