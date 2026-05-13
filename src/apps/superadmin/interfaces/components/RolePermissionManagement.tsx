import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Save, 
  RefreshCw, 
  ChevronRight, 
  Lock, 
  Info,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { getAuthHeaders } from '../../../common/utils/auth';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard';
import { UserRole } from '../../../../server/core/architecture/types';
import { useDebounce } from '../../../common/hooks/useDebounce';

interface RolePermissionMap {
  [role: string]: string[];
}

export const RolePermissionManagement: React.FC = () => {
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const roles = [
    UserRole.SUPER_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.TECHNICIAN,
    UserRole.GUARD
  ];

  // Map permissions to human-readable labels and categories
  const permissionMetadata: Record<string, { label: string; category: string; description: string }> = {
    'staff:read': { label: 'Xem nhân sự', category: 'Nhân sự', description: 'Cho phép xem danh sách và thông tin chi tiết nhân viên.' },
    'staff:write': { label: 'Quản lý nhân sự', category: 'Nhân sự', description: 'Cho phép thêm, sửa, xóa và kỷ luật nhân viên.' },
    'checkpoint:read': { label: 'Xem điểm tuần tra', category: 'Tuần tra', description: 'Cho phép xem danh sách các điểm checkpoint.' },
    'checkpoint:write': { label: 'Quản lý điểm tuần tra', category: 'Tuần tra', description: 'Cho phép thiết lập và cấu hình benchmark cho checkpoint.' },
    'log:read': { label: 'Xem nhật ký', category: 'Dữ liệu', description: 'Cho phép xem lịch sử tuần tra, trực ban và sự cố.' },
    'log:write': { label: 'Ghi nhật ký', category: 'Dữ liệu', description: 'Cho phép thực hiện quét QR và báo cáo sự cố.' },
    'report:generate': { label: 'Xuất báo cáo', category: 'Dữ liệu', description: 'Cho phép tạo và tải các báo cáo PDF/Excel.' },
    'tenant:manage': { label: 'Quản lý Tenant', category: 'Hệ thống', description: 'Quản lý cấu hình doanh nghiệp (Chỉ SuperAdmin).' },
    'system:manage': { label: 'Quản lý Hệ thống', category: 'Hệ thống', description: 'Cấu hình toàn cục hệ thống (Chỉ SuperAdmin).' },
    'task:read': { label: 'Xem công việc', category: 'Công việc', description: 'Cho phép xem danh sách nhiệm vụ được giao.' },
    'task:write': { label: 'Quản lý công việc', category: 'Công việc', description: 'Cho phép tạo và điều phối nhiệm vụ.' },
    'vendor:read': { label: 'Xem nhà thầu', category: 'Đối tác', description: 'Xem thông tin nhà thầu bảo vệ.' },
    'vendor:write': { label: 'Quản lý nhà thầu', category: 'Đối tác', description: 'Quản lý hợp đồng và đánh giá nhà thầu.' },
    'billing:read': { label: 'Xem thanh toán', category: 'Tài chính', description: 'Xem lịch sử thanh toán và hóa đơn.' },
    'billing:write': { label: 'Xử lý thanh toán', category: 'Tài chính', description: 'Xác nhận thanh toán và nâng cấp gói.' },
  };

  const allPermissions = Object.keys(permissionMetadata);
  const categories = ['all', ...Array.from(new Set(Object.values(permissionMetadata).map(m => m.category)))];

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/sys-manage/permissions', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setRolePermissions(data);
      }
    } catch (err) {
      console.error('Failed to fetch permissions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleToggle = (role: string, permission: string) => {
    if (role === UserRole.SUPER_ADMIN) return; // SuperAdmin is immutable UI-wise for safety

    setRolePermissions(prev => {
      if (!prev) return prev;
      const currentPerms = prev[role] || [];
      const newPerms = currentPerms.includes(permission)
        ? currentPerms.filter(p => p !== permission)
        : [...currentPerms, permission];
      
      return {
        ...prev,
        [role]: newPerms
      };
    });
  };

  const handleSave = async () => {
    if (!rolePermissions) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/sys-manage/permissions', {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissions: rolePermissions })
      });

      if (res.ok) {
        alert('Đã cập nhật cấu hình phân quyền thành công! Hệ thống sẽ áp dụng sau tối đa 30 giây.');
      } else {
        alert('Lỗi khi cập nhật phân quyền.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const filteredPermissions = allPermissions.filter(p => {
    const meta = permissionMetadata[p];
    if (!meta) return false;
    const matchesSearch = meta.label.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                          p.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || meta.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="text-scmd-cyber animate-spin" size={40} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Đang nạp ma trận quyền hạn...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-2 py-0.5 bg-scmd-cyber/10 border border-scmd-cyber/20 rounded text-[10px] font-black text-scmd-cyber uppercase tracking-widest flex items-center gap-1.5">
              <Shield size={10} />
              RBAC Control
            </div>
            <p className="text-xs text-slate-500 font-medium">Cấu hình chi tiết ma trận quyền lợi</p>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase">Quản lý Quyền hạn</h2>
          <p className="text-slate-400 mt-2 font-medium max-w-2xl">
            Thiết lập các quyền truy cập tài nguyên cho từng vai trò trong hệ thống. Thay đổi sẽ ảnh hưởng đến khả năng thao tác của người dùng trên toàn bộ nền tảng.
          </p>
        </div>
        <div className="flex gap-3">
          <SCMDButton 
            variant="ghost" 
            onClick={fetchPermissions}
            className="gap-2"
          >
            <RefreshCw size={18} /> Khôi phục
          </SCMDButton>
          <SCMDButton 
            onClick={handleSave}
            isLoading={saving}
            className="gap-2 !bg-emerald-600 hover:!bg-emerald-500 shadow-xl shadow-emerald-900/20 shadow-[var(--shadow-lg)]"
          >
            <Save size={18} /> Lưu thay đổi
          </SCMDButton>
        </div>
      </header>

      {/* Constraints Notice */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-4 items-center">
        <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
          <Info size={20} />
        </div>
        <div className="text-xs">
          <p className="text-amber-500 font-black uppercase mb-1">Quy tắc bảo mật hệ thống</p>
          <p className="text-slate-400 font-medium leading-relaxed">
            Vai trò <span className="text-white font-bold">SUPER_ADMIN</span> được bảo vệ bởi lớp "Hardened Core", luôn sở hữu toàn bộ quyền hạn và không thể chỉnh sửa từ giao diện để tránh rủi ro tự khóa (Self-lockout).
          </p>
        </div>
      </div>

      <SCMDCard className="overflow-hidden border border-white/5">
        <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
             <div className="relative w-full md:w-80">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
               <input 
                 type="text" 
                 placeholder="Tìm kiếm quyền hạn..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm focus:border-scmd-cyber outline-none transition-all"
               />
             </div>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto no-scrollbar">
            <Filter size={16} className="text-slate-500 shrink-0" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  filterCategory === cat 
                    ? "bg-scmd-cyber text-slate-950" 
                    : "bg-white/5 text-slate-500 hover:text-white"
                )}
              >
                {cat === 'all' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border-t border-white/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950">
                <th className="p-6 border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-80">
                  Quyền hạn (Resource Action)
                </th>
                {roles.map(role => (
                  <th key={role} className="p-6 border-b border-white/5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                        {role.replace('-', ' ')}
                      </span>
                      {role === UserRole.SUPER_ADMIN && <Lock size={12} className="text-slate-600" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPermissions.map(perm => (
                <tr key={perm} className="hover:bg-white/5 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 w-2 h-2 rounded-full bg-scmd-cyber shadow-[0_0_8px_rgba(31,234,255,0.3)]" />
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-scmd-cyber transition-colors">{permissionMetadata[perm]?.label}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{perm}</p>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity">
                          {permissionMetadata[perm]?.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  {roles.map(role => {
                    const isChecked = rolePermissions?.[role]?.includes(perm) || role === UserRole.SUPER_ADMIN;
                    const isImmutable = role === UserRole.SUPER_ADMIN;

                    return (
                      <td key={role} className="p-6 text-center">
                        <button
                          onClick={() => handleToggle(role, perm)}
                          disabled={isImmutable}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all border",
                            isChecked 
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                              : "bg-slate-950/50 text-slate-700 border-white/5 hover:border-white/20",
                            isImmutable && "cursor-not-allowed opacity-60"
                          )}
                        >
                          {isChecked ? <CheckCircle2 size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPermissions.length === 0 && (
          <div className="p-20 text-center text-slate-600">
             <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
             <p className="font-bold uppercase tracking-widest text-xs">Không tìm thấy quyền hạn phù hợp</p>
          </div>
        )}
      </SCMDCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SCMDCard className="p-6 bg-blue-500/5 border-blue-500/20">
           <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Info size={16} /> Mecha-Audit Log
           </h4>
           <div className="space-y-3">
             <p className="text-xs text-slate-400 leading-relaxed">
               Mọi thay đổi trong ma trận này sẽ được hệ thống tự động ghi nhật ký (Audit Log) kèm theo thông tin Trace IP và UserAgent của người quản trị thực hiện.
             </p>
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <ChevronRight size={12} /> Resource: system/permissions
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <ChevronRight size={12} /> Action: SUPERADMIN_UPDATE_PERMISSIONS
             </div>
           </div>
        </SCMDCard>

        <SCMDCard className="p-6 bg-scmd-cyber/5 border-scmd-cyber/20">
           <h4 className="text-xs font-black text-scmd-cyber uppercase tracking-widest mb-4 flex items-center gap-2">
             <Shield size={16} /> Zero Trust Propagation
           </h4>
           <p className="text-xs text-slate-400 leading-relaxed">
             Khi bạn nhấn "Lưu thay đổi", cấu hình sẽ được cập nhật vào PostgreSQL. Các App Server sẽ tự động làm mới bộ nhớ đệm (Cache Invalidation) trong vòng 30 giây để áp dụng quyền hạn mới trên toàn hệ thống.
           </p>
        </SCMDCard>
      </div>
    </div>
  );
};
