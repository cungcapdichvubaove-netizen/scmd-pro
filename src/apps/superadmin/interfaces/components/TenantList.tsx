import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Loader2,
  Crown,
  Users,
  MapPin,
  KeyRound,
  Zap,
  Search,
  Settings,
  Mail,
  TrendingUp,
  User,
  Phone,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../../lib/utils';
import { useDebounce } from '../../../common/hooks/useDebounce';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: string;
  status: string;
  is_active?: boolean;
  maxEmployees: number;
  staffCount?: number;
  checkpointCount?: number;
  subscriptionPlan?: 'FREE' | 'PRO' | 'ENTERPRISE';
  contactEmail?: string;
  contactPhone?: string;
  ownerName?: string;
  features_enabled: {
    patrol: boolean;
    attendance: boolean;
    ai_analytics: boolean;
  };
}

interface TenantListProps {
  tenants: Tenant[];
  onToggleStatus: (id: string, currentStatus: string) => void;
  onUpdateSubscription: (id: string, plan: 'FREE' | 'PRO' | 'ENTERPRISE') => void;
  onUpdateMaxEmployees: (id: string, count: number) => void;
  onFeatureToggle: (id: string, feature: any, current: boolean) => void;
  onResetPassword: (id: string) => void;
  onDeleteTenant: (id: string) => void;
  isDeleting: string | null;
  setShowOnboarding: (show: boolean) => void;
  updatingSubscriptionId: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

// Helper: normalize subscriptionPlan from either field
function getEffectivePlan(tenant: Tenant): 'FREE' | 'PRO' | 'ENTERPRISE' {
  if (tenant.subscriptionPlan === 'ENTERPRISE') return 'ENTERPRISE';
  if (tenant.subscriptionPlan === 'PRO') return 'PRO';
  if (tenant.plan === 'ENTERPRISE') return 'ENTERPRISE';
  if (tenant.plan === 'PRO') return 'PRO';
  return 'FREE';
}

export const TenantList: React.FC<TenantListProps> = ({ 
  tenants, 
  onToggleStatus, 
  onUpdateSubscription, 
  onUpdateMaxEmployees,
  onFeatureToggle, 
  onResetPassword,
  onDeleteTenant,
  isDeleting,
  setShowOnboarding,
  updatingSubscriptionId,
  onLoadMore,
  hasMore
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'pro'>('all');

  const filteredTenants = tenants.filter(t => {
    const term = debouncedSearchTerm.toLowerCase();
    const effectivePlan = getEffectivePlan(t);
    
    const matchesSearch = (
      (t.name?.toLowerCase().includes(term)) ||
      (t.subdomain?.toLowerCase().includes(term)) ||
      (t.ownerName?.toLowerCase().includes(term)) ||
      (t.contactEmail?.toLowerCase().includes(term)) ||
      (t.contactPhone?.toLowerCase().includes(term)) ||
      (t.status?.toLowerCase().includes(term)) ||
      (t.is_active && 'live'.includes(term)) ||
      (!t.is_active && t.status === 'suspended' && 'suspended'.includes(term))
    );

    const matchesStatus = statusFilter === 'all' || 
                        (statusFilter === 'active' && (t.status === 'active' || t.is_active === true)) ||
                        (statusFilter === 'suspended' && (t.status === 'suspended' || t.status === 'inactive'));

    const matchesPlan = planFilter === 'all' || 
                      (planFilter === 'free' && effectivePlan === 'FREE') ||
                      (planFilter === 'pro' && effectivePlan === 'PRO');

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const totalPro = tenants.filter(tn => getEffectivePlan(tn) === 'PRO').length;
  const totalActive = tenants.filter(tn => tn.status === 'active').length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Executive Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8 px-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-scmd-primary/10 rounded-xl flex items-center justify-center text-scmd-primary border border-scmd-primary/20">
                <Building2 size={24} />
             </div>
             <h3 className="text-4xl font-black text-white tracking-tighter uppercase">{t('entities.tenants')}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-400 font-bold text-xs uppercase tracking-widest pl-1">
             <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-400 font-black">{totalActive}</span>
                <span>Hoạt động</span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                <span className="w-2 h-2 bg-scmd-primary rounded-full" />
                <span className="text-scmd-primary font-black">{totalPro}</span>
                <span>Pro Tier</span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                <Users size={12} className="text-slate-500" />
                <span className="text-white font-black">{tenants.length}</span>
                <span>Tổng bản ghi</span>
             </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           {/* Custom Filter Tabs */}
           <div className="flex flex-col sm:flex-row gap-3">
             <div className="flex bg-slate-800/40 p-1 rounded-2xl border border-white/5 shadow-inner">
                <button 
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    statusFilter === 'all' ? "bg-scmd-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Trạng thái
                </button>
                <button 
                  onClick={() => setStatusFilter('active')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    statusFilter === 'active' ? "bg-emerald-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Live
                </button>
                <button 
                  onClick={() => setStatusFilter('suspended')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    statusFilter === 'suspended' ? "bg-red-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Suspended
                </button>
             </div>
             <div className="flex bg-slate-800/40 p-1 rounded-2xl border border-white/5 shadow-inner">
                <button 
                  onClick={() => setPlanFilter('all')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    planFilter === 'all' ? "bg-scmd-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Gói
                </button>
                <button 
                  onClick={() => setPlanFilter('free')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    planFilter === 'free' ? "bg-slate-700 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Free
                </button>
                <button 
                  onClick={() => setPlanFilter('pro')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    planFilter === 'pro' ? "bg-scmd-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Pro
                </button>
             </div>
           </div>

           {/* Custom Search Box */}
           <div className="relative group max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-scmd-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Tìm kiếm danh tính kỹ thuật..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-14 w-64 bg-slate-800/40 border border-white/5 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-scmd-primary/20 focus:border-scmd-primary/30 transition-all font-bold placeholder:text-slate-600 focus:w-80 shadow-2xl"
              />
           </div>

           <button 
              onClick={() => setShowOnboarding(true)}
              className="h-14 px-8 bg-scmd-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-scmd-primary/90 active:scale-95 transition-all shadow-xl shadow-scmd-primary/20 flex items-center gap-3"
            >
              <Plus size={20} strokeWidth={3} />
              <span className="hidden sm:inline">Tạo không gian mới</span>
            </button>
        </div>
      </div>

      {/* Empty state */}
      {filteredTenants.length === 0 && (
        <div className="text-center py-24 bg-slate-900/30 border border-white/5 rounded-[32px]">
          <Building2 size={48} className="mx-auto mb-4 text-slate-700" />
          <p className="text-slate-500 font-bold text-lg">Chưa có khách hàng nào</p>
          <p className="text-slate-600 text-sm mt-1">Bắt đầu bằng cách thêm khách hàng đầu tiên</p>
          <button
            onClick={() => setShowOnboarding(true)}
            className="mt-6 h-12 px-8 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-2xl font-black text-sm hover:bg-sky-500/20 transition-all"
          >
            + Thêm khách hàng mới
          </button>
        </div>
      )}

      {/* Tenant grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTenants.map((tenant, idx) => (
          <motion.div
            key={tenant.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
          >
            <TenantCard
              tenant={tenant}
              effectivePlan={getEffectivePlan(tenant)}
              onToggleStatus={onToggleStatus}
              onUpdateSubscription={onUpdateSubscription}
              onUpdateMaxEmployees={onUpdateMaxEmployees}
              onFeatureToggle={onFeatureToggle}
              onResetPassword={onResetPassword}
              onDeleteTenant={onDeleteTenant}
              isDeleting={isDeleting === tenant.id}
              isUpdatingSubscription={updatingSubscriptionId === tenant.id}
            />
          </motion.div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onLoadMore}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 hover:border-white/20 transition-all flex items-center gap-2"
          >
            Tải thêm không gian
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Individual Tenant Card ─────────────────────────────────────────────────

interface TenantCardProps {
  tenant: Tenant;
  effectivePlan: 'FREE' | 'PRO' | 'ENTERPRISE';
  onToggleStatus: (id: string, currentStatus: string) => void;
  onUpdateSubscription: (id: string, plan: 'FREE' | 'PRO' | 'ENTERPRISE') => void;
  onUpdateMaxEmployees: (id: string, count: number) => void;
  onFeatureToggle: (id: string, feature: any, current: boolean) => void;
  onResetPassword: (id: string) => void;
  onDeleteTenant: (id: string) => void;
  isDeleting: boolean;
  isUpdatingSubscription: boolean;
}

const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  effectivePlan,
  onToggleStatus,
  onUpdateSubscription,
  onUpdateMaxEmployees,
  onFeatureToggle,
  onResetPassword,
  onDeleteTenant,
  isDeleting,
  isUpdatingSubscription,
}) => {
  const isActive = tenant.status === 'active' || tenant.is_active === true;
  const isEnterprise = effectivePlan === 'ENTERPRISE';
  const isPro = effectivePlan === 'PRO' || isEnterprise;
  
  // Local state for maxEmployees input
  const [maxEmpValue, setMaxEmpValue] = useState(tenant.maxEmployees);
  const [maxEmpSaving, setMaxEmpSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleMaxEmpSave = async () => {
    if (maxEmpValue === tenant.maxEmployees || maxEmpValue < 1) return;
    setMaxEmpSaving(true);
    try {
      await onUpdateMaxEmployees(tenant.id, maxEmpValue);
    } finally {
      setMaxEmpSaving(false);
    }
  };

  const handleSubscriptionToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUpdatingSubscription) return;
    if (isEnterprise) {
      onUpdateSubscription(tenant.id, 'PRO');
    } else {
      onUpdateSubscription(tenant.id, isPro ? 'FREE' : 'PRO');
    }
  };

  return (
    <div 
      className={cn(
        "group h-full bg-scmd-navy/40 backdrop-blur-xl border rounded-[32px] overflow-hidden transition-all duration-500 flex flex-col hover:shadow-2xl hover:shadow-scmd-primary/10 hover:-translate-y-1 relative",
        isActive 
          ? isPro 
            ? "border-scmd-primary/30" 
            : "border-white/5 hover:border-white/20"
          : "border-red-500/20 grayscale-[0.5] opacity-80"
      )}
    >
      {/* Background Accent */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 blur-[80px] rounded-full -z-10 transition-opacity duration-700",
        isPro ? "bg-scmd-primary/10 group-hover:opacity-100" : "bg-sky-500/5 group-hover:opacity-100 opacity-0"
      )} />

      {/* Visual Header */}
      <div className={cn(
        "h-1.5 w-full",
        isPro ? "bg-scmd-primary shadow-[0_0_15px_rgba(37,99,235,0.5)]" : "bg-white/5"
      )} />

      <div className="p-6 flex flex-col flex-1">
        {/* Top Header: Identity & Primary Actions */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
             <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-transform duration-500 group-hover:scale-110",
              isPro 
                ? "bg-scmd-primary/10 border-scmd-primary/20 text-scmd-primary shadow-[0_0_20px_rgba(37,99,235,0.1)]" 
                : "bg-scmd-surface border-white/5 text-scmd-silver/30"
            )}>
              {isPro ? <Crown size={28} /> : <Building2 size={28} />}
            </div>
            <div>
               <h4 className="font-black text-white text-xl leading-snug truncate max-w-[160px] group-hover:text-scmd-primary transition-colors">
                {tenant.name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-[10px] font-bold text-scmd-silver/40 uppercase tracking-widest font-mono">
                  {tenant.subdomain}
                </p>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                  isActive 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                  <span className={cn("w-1 h-1 rounded-full", isActive ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
                  {isActive ? 'Live' : 'Suspended'}
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSubscriptionToggle}
            className={cn(
              "p-3 rounded-2xl border-2 transition-all duration-300 active:scale-90 relative group/sub",
              isPro 
                ? "bg-scmd-primary text-white border-scmd-primary shadow-lg shadow-scmd-primary/20"
                : "bg-white/5 text-scmd-silver/40 border-white/5 hover:border-scmd-silver/20 hover:text-white"
            )}
            title={isPro ? "Downgrade to Free" : "Upgrade to Pro"}
          >
            {isUpdatingSubscription ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isPro ? (
              <Zap size={18} strokeWidth={3} />
            ) : (
              <TrendingUp size={18} strokeWidth={3} />
            )}
            
            {/* Tooltip-like label */}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black py-1 px-2 bg-slate-800 rounded opacity-0 group-hover/sub:opacity-100 transition-opacity">
              {isPro ? 'Hạ cấp FREE' : 'Nâng cấp PRO'}
            </span>
          </button>
        </div>

        {/* Owner Info - Important for SuperAdmin */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6 group/owner hover:bg-white/5 transition-all">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-8 h-8 rounded-xl bg-scmd-surface flex items-center justify-center text-scmd-silver/40 border border-white/5">
                <User size={14} />
             </div>
             <div>
                <p className="text-[9px] font-black text-scmd-silver/20 uppercase tracking-widest">Chủ sở hữu</p>
                <p className="text-xs font-bold text-white/80">{tenant.ownerName || 'Hệ thống tự động'}</p>
             </div>
          </div>
          <div className="grid grid-cols-1 gap-1.5 pl-11">
             <div className="flex items-center gap-2 text-[10px] text-scmd-silver/40 font-medium">
                <Mail size={12} className="shrink-0" />
                <span className="truncate">{tenant.contactEmail || 'N/A'}</span>
             </div>
             <div className="flex items-center gap-2 text-[10px] text-scmd-silver/40 font-medium">
                <Phone size={12} className="shrink-0" />
                <span>{tenant.contactPhone || 'N/A'}</span>
             </div>
          </div>
        </div>

        {/* Bento Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-scmd-primary/5 border border-scmd-primary/10 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-black text-scmd-primary uppercase tracking-[0.2em]">Quân số</span>
              <Users size={14} className="text-scmd-primary/40" />
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-white leading-none tracking-tighter">{tenant.staffCount || 0}</span>
               <div className="flex items-center gap-1">
                  <span className="text-scmd-silver/20 text-sm font-bold">/</span>
                  <input
                    type="number"
                    value={maxEmpValue}
                    onChange={(e) => setMaxEmpValue(parseInt(e.target.value) || 1)}
                    onBlur={handleMaxEmpSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleMaxEmpSave()}
                    className="w-12 bg-white/5 border border-white/10 rounded text-xs font-black text-scmd-primary focus:outline-none focus:border-scmd-primary transition-all px-1 py-0.5 text-center"
                    title="Điều chỉnh giới hạn quân số"
                  />
                  {maxEmpSaving && <Loader2 size={8} className="animate-spin text-scmd-primary" />}
               </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative group/sites">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-black text-scmd-silver/30 uppercase tracking-[0.2em]">Mục tiêu</span>
              <MapPin size={14} className="text-scmd-silver/20" />
            </div>
            <div className="flex items-baseline gap-1">
               <span className="text-3xl font-black text-white leading-none tracking-tighter">{tenant.checkpointCount || 0}</span>
               <span className="text-[10px] font-black text-scmd-silver/20 uppercase tracking-[0.15em]">Sites</span>
            </div>
            {/* Subtle decor */}
            <div className="absolute -bottom-4 -right-4 w-12 h-12 border border-white/5 rounded-full group-hover:scale-150 transition-transform duration-700 opacity-50" />
          </div>
        </div>

        {/* Feature Tags Row */}
        <div className="flex flex-wrap gap-2 mb-8">
           <FeatureTag active={!!tenant.features_enabled?.patrol} label="Patrol" />
           <FeatureTag active={!!tenant.features_enabled?.attendance} label="FaceID" />
           <FeatureTag active={!!tenant.features_enabled?.ai_analytics} label="AI Watch" />
        </div>

        {/* Primary Command Actions */}
        <div className="mt-auto pt-6 border-t border-white/5 grid grid-cols-4 gap-2">
           <button 
             onClick={() => setExpanded(!expanded)}
             className={cn(
               "h-12 rounded-2xl flex items-center justify-center transition-all border",
               expanded 
                ? "bg-white/10 border-white/20 text-white shadow-inner" 
                : "bg-white/5 border-white/5 text-scmd-silver/40 hover:bg-white/10 hover:text-white"
             )}
             title="Thiết lập nâng cao"
           >
             <Settings size={20} className={cn("transition-transform duration-500", expanded && "rotate-45")} />
           </button>

           <button 
              onClick={() => onToggleStatus(tenant.id, tenant.status)}
              className={cn(
                "h-12 rounded-2xl flex items-center justify-center transition-all border group/status",
                isActive 
                  ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white shadow-lg shadow-red-500/10" 
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white shadow-lg shadow-emerald-500/10"
              )}
              title={isActive ? 'Tạm dừng hoạt động' : 'Khôi phục hoạt động'}
            >
              {isActive ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTenant(tenant.id);
              }}
              disabled={isDeleting || tenant.id === 'system'}
              className={cn(
                "h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 transition-all shadow-lg shadow-red-500/10",
                isDeleting ? "opacity-50 cursor-not-allowed" : "hover:bg-red-500 hover:text-white",
                tenant.id === 'system' && "opacity-0 pointer-events-none"
              )}
              title="Xóa vĩnh viễn khách hàng"
            >
              {isDeleting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <TrendingUp size={20} className="opacity-50" />
                </motion.div>
              ) : (
                <Trash2 size={20} />
              )}
            </button>

            <a 
              href={`https://${tenant.subdomain}.scmd.pro`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 bg-scmd-primary/10 border border-scmd-primary/20 rounded-2xl flex items-center justify-center text-scmd-primary hover:bg-scmd-primary hover:text-white transition-all shadow-lg shadow-scmd-primary/10"
              title="Mở cổng thông tin khách hàng"
            >
              <ExternalLink size={20} />
            </a>
        </div>

        {/* Advanced Panel - Slides down */}
        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-6 space-y-4"
            >
               <div className="p-4 bg-slate-900/50 rounded-3xl border border-white/5 ring-1 ring-white/5">
                  <p className="text-[10px] font-black text-scmd-silver/30 uppercase tracking-[0.2em] mb-4 text-center">Feature Controls</p>
                  <div className="grid grid-cols-1 gap-2">
                    <QuickToggle 
                      label="Tuần tra bảo vệ" 
                      active={!!tenant.features_enabled?.patrol} 
                      onClick={() => onFeatureToggle(tenant.id, 'patrol', !!tenant.features_enabled?.patrol)} 
                    />
                    <QuickToggle 
                      label="Chấm công FaceID" 
                      active={!!tenant.features_enabled?.attendance} 
                      onClick={() => onFeatureToggle(tenant.id, 'attendance', !!tenant.features_enabled?.attendance)} 
                    />
                    <QuickToggle 
                      label="AI Watcher Monitor" 
                      active={!!tenant.features_enabled?.ai_analytics} 
                      onClick={() => onFeatureToggle(tenant.id, 'ai_analytics', !!tenant.features_enabled?.ai_analytics)} 
                    />
                  </div>
               </div>

               <button 
                onClick={() => onResetPassword(tenant.id)}
                className="w-full h-14 bg-scmd-surface/50 hover:bg-scmd-surface border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl group/reset"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover/reset:bg-sky-500 group-hover/reset:text-white transition-all">
                  <KeyRound size={16} />
                </div>
                Reset mật quản trị
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const FeatureTag = ({ active, label }: { active: boolean; label: string }) => (
  <div className={cn(
    "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.15em] border transition-all",
    active 
      ? "bg-scmd-primary/10 border-scmd-primary/30 text-scmd-primary shadow-[0_4px_12px_rgba(37,99,235,0.1)]" 
      : "bg-white/5 border-white/5 text-scmd-silver/10"
  )}>
    {label}
  </div>
);

// ─── Shared Helper Components ───────────────────────────────────────────────

const QuickToggle = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={cn(
      "flex items-center justify-between px-3 py-2 rounded-lg border transition-all group/toggle",
      active 
        ? "bg-scmd-primary/5 border-scmd-primary/10" 
        : "bg-white/5 border-white/5"
    )}
  >
    <span className={cn(
      "text-[10px] font-bold uppercase transition-colors",
      active ? "text-scmd-primary" : "text-scmd-silver/40"
    )}>
      {label}
    </span>
    <div className={cn(
      "w-8 h-4 rounded-full relative transition-colors duration-300",
      active ? "bg-scmd-primary" : "bg-white/10"
    )}>
      <div className={cn(
        "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm",
        active ? "left-4.5" : "left-0.5"
      )} />
    </div>
  </button>
);
