import React from 'react';
import { Activity, Shield, User } from 'lucide-react';

interface DashboardHeaderProps {
  user: any;
  role: string | null;
}

function formatRole(role: string | null): string {
  switch (role) {
    case 'tenant-admin':
    case 'TENANT_ADMIN':
      return 'Quản trị tenant';
    case 'vendor-commander':
    case 'VENDOR_COMMANDER':
      return 'Chỉ huy nhà thầu';
    case 'super-admin':
    case 'SUPER_ADMIN':
      return 'Super Admin';
    default:
      return role || 'Người dùng hệ thống';
  }
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, role }) => {
  const now = new Date();
  const timestamp = now.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-white/5 pb-5 animate-in fade-in slide-in-from-top-4 duration-700 lg:gap-6">
      <div className="flex items-start justify-between gap-3 sm:items-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-scmd-primary/15 bg-scmd-primary/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-scmd-primary/90">
          <Shield size={12} /> Điều hành
        </span>

        <div className="flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-sm sm:px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-scmd-primary/15 bg-scmd-primary/10 text-scmd-primary">
            <User size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight text-white">
              {user?.name || 'Administrator'}
            </p>
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-scmd-silver/55">
              {formatRole(role)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Bảng điều hành vận hành
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-scmd-silver/70">
            Theo dõi sự cố, tuần tra, SLA và bằng chứng theo dữ liệu vận hành thực tế.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-scmd-silver/55 sm:self-start lg:self-auto">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.65)]" aria-hidden="true" />
          <Activity size={12} className="text-scmd-primary/80" />
          <span>Live • {timestamp}</span>
        </div>
      </div>
    </header>
  );
};
