import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  FileText,
  TrendingUp,
  AlertTriangle,
  Target,
  Edit,
  Trash2,
  Phone,
  Mail,
  User,
  Briefcase,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../../lib/utils';
import { getAuthHeaders } from '../../../common/utils/auth';
import { Vendor, Contract, ComplianceScore } from '../../../../server/domain/entities';
import { VendorEvaluationReport } from './VendorEvaluationReport';
import { VendorModal } from './VendorModal';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard';
import { useDebounce } from '../../../common/hooks/useDebounce';

export const VendorContractManagement: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [complianceScores, setComplianceScores] = useState<ComplianceScore[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'vendors' | 'contracts' | 'performance'>('vendors');
  const [searchTerm, setSearchTerm] = useState('');
  const [evaluatingVendorId, setEvaluatingVendorId] = useState<string | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredVendors = vendors.filter(v => 
    v.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    v.contact_person?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    v.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const filteredContracts = contracts.filter(c => {
    const vendor = vendors.find(v => v.id === c.vendorId);
    return c.site_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
           c.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
           (vendor?.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
  });

  const filteredScores = complianceScores.filter(s => {
    const contract = contracts.find(c => c.id === s.contractId);
    const vendor = vendors.find(v => v.id === s.vendorId);
    return (contract?.site_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
           (vendor?.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
           s.month?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
  });

  // Vendor Modal State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    try {
      const [vRes, cRes, sRes] = await Promise.all([
        fetch('/api/admin/vendors', { headers: getAuthHeaders() }),
        fetch('/api/admin/contracts', { headers: getAuthHeaders() }),
        fetch('/api/admin/compliance-scores', { headers: getAuthHeaders() })
      ]);

      if (vRes.ok && cRes.ok && sRes.ok) {
        const [vData, cData, sData] = await Promise.all([vRes.json(), cRes.json(), sRes.json()]);
        setVendors(vData);
        setContracts(cData);
        setComplianceScores(sData);
      }
    } catch (err) {
      console.error("Error loading vendor data:", err);
    }
  };

  const handleSaveVendor = async (vendorData: Partial<Vendor>) => {
    try {
      const isEdit = !!editingVendor;
      const url = isEdit ? `/api/admin/vendors/${editingVendor.id}` : '/api/admin/vendors';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vendorData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save vendor');
      }

      await loadData();
    } catch (err) {
      throw err;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'suspended': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'terminated': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 scmd-glass p-8 rounded-[32px]">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-[var(--color-primary)]/10 rounded-3xl flex items-center justify-center text-[var(--color-primary)] border border-[var(--color-primary)]/20 rotate-3 shadow-lg shadow-[var(--color-primary)]/5">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-white uppercase">Quản lý Nhà thầu & SLA</h2>
            <p className="text-[var(--color-text-secondary)] mt-1 font-medium opacity-80 underline underline-offset-4 decoration-[var(--color-primary)]/30">Hệ thống giám sát chất lượng dựa trên dữ liệu & bằng chứng số.</p>
          </div>
        </div>
        <div className="flex bg-[var(--color-bg)]/50 p-1.5 rounded-2xl border border-[var(--color-border)]/20 self-end md:self-auto">
          {(['vendors', 'contracts', 'performance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeSubTab === tab 
                  ? "bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20" 
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              )}
            >
              {tab === 'vendors' ? 'Nhà thầu' : tab === 'contracts' ? 'Hợp đồng & SLA' : 'Xếp hạng & Đối soát'}
            </button>
          ))}
        </div>
      </header>

      {/* Stats Overview for Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Tổng nhà thầu', value: Array.isArray(vendors) ? vendors.length : 0, icon: Building2, color: 'text-[var(--color-primary)]' },
          { label: 'Hợp đồng hiệu lực', value: Array.isArray(contracts) ? contracts.filter(c => c.status === 'active').length : 0, icon: FileText, color: 'text-[var(--color-success)]' },
          { label: 'SLA Compliance 🟢', value: '96.2%', icon: TrendingUp, color: 'text-[var(--color-primary)]' },
          { label: 'Vi phạm tháng này', value: '04', icon: AlertTriangle, color: 'text-[var(--color-warning)]' },
        ].map((stat, i) => (
          <SCMDCard key={i} className="p-6 hover:translate-y-[-2px]">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5", stat.color)}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-white">{stat.value}</p>
              </div>
            </div>
          </SCMDCard>
        ))}
      </div>

      <SCMDCard className="!p-0 !rounded-[32px] overflow-hidden">
        <div className="p-8 border-b border-[var(--color-border)]/20 bg-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
            <input 
              type="text" 
              placeholder="Tra cứu nhà thầu, mã hợp đồng..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-[var(--color-bg)]/50 border border-[var(--color-border)]/20 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 text-white placeholder:text-[var(--color-text-muted)] font-bold"
            />
          </div>
          <SCMDButton 
            onClick={() => {
              if (activeSubTab === 'vendors') {
                setEditingVendor(null);
                setIsVendorModalOpen(true);
              }
            }}
            className="w-full md:w-auto px-8 py-4 !bg-[var(--color-primary)] !rounded-2xl shadow-2xl shadow-[var(--color-primary)]/20">
            <Plus size={20} />
            {activeSubTab === 'vendors' ? 'Đăng ký Nhà thầu' : 'Khởi tạo Contract/SLA'}
          </SCMDButton>
        </div>

        <div className="p-8">
          {activeSubTab === 'vendors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredVendors.map((vendor) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={vendor.id} 
                  className="group bg-[var(--color-surface)]/40 border border-[var(--color-border)]/20 rounded-[40px] p-8 shadow-2xl hover:border-[var(--color-primary)]/30 transition-all flex flex-col relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 blur-3xl rounded-full" />
                  
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-16 h-16 bg-white/5 rounded-[24px] flex items-center justify-center text-[var(--color-text-muted)] group-hover:scale-110 group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-all duration-500 border border-white/5 shadow-inner">
                      <Briefcase size={28} />
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => {
                           setEditingVendor(vendor);
                           setIsVendorModalOpen(true);
                         }}
                         className="p-2 text-[var(--color-text-muted)] hover:text-white bg-[var(--color-bg)] border border-[var(--color-border)]/20 rounded-xl transition-all"
                       >
                         <Edit size={14} />
                       </button>
                       <span className={cn(
                         "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                         getStatusColor(vendor.status)
                       )}>
                         {vendor.status}
                       </span>
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-white mb-2 leading-tight tracking-tight group-hover:text-[var(--color-primary)] transition-colors uppercase">{vendor.name}</h3>
                  <div className="space-y-4 mb-8 text-[var(--color-text-secondary)]">
                    <div className="flex items-center gap-3">
                      <User size={14} className="text-[var(--color-primary)]" />
                      <span className="text-xs font-bold leading-none">{vendor.contact_person}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={14} className="text-[var(--color-primary)]/70" />
                      <span className="text-xs font-bold leading-none">{vendor.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={14} className="text-[var(--color-success)]" />
                      <span className="text-xs font-bold leading-none">{vendor.phone}</span>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-3xl p-6 border border-white/5 mt-auto">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Performance Score</p>
                        <p className={cn(
                          "text-3xl font-black",
                          vendor.score >= 90 ? "text-[var(--color-success)]" : vendor.score >= 80 ? "text-[var(--color-primary)]" : "text-[var(--color-warning)]"
                        )}>{vendor.score}/100</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Contracts</p>
                        <p className="text-xl font-black text-white">{vendor.total_contracts}</p>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-[var(--color-bg)] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${vendor.score}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={cn(
                          "h-full rounded-full shadow-[0_0_12px_rgba(37,99,235,0.3)]",
                          vendor.score >= 90 ? "bg-[var(--color-success)]" : vendor.score >= 80 ? "bg-[var(--color-primary)]" : "bg-[var(--color-warning)]"
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button className="py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-[var(--color-text-muted)] hover:text-white uppercase tracking-widest transition-all">
                      Hợp đồng (5)
                    </button>
                    <button 
                      onClick={() => setEvaluatingVendorId(vendor.id)}
                      className="py-3.5 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 rounded-2xl text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <BarChart3 size={14} /> Xếp hạng
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeSubTab === 'contracts' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-[0.2em] border-b border-[var(--color-border)]/20">
                    <th className="pb-6 font-black pl-4">Hợp đồng / Mục tiêu</th>
                    <th className="pb-6 font-black">Vendor</th>
                    <th className="pb-6 font-black">Thời hạn</th>
                    <th className="pb-6 font-black">SLA Parameters</th>
                    <th className="pb-6 font-black">SLA Compliance</th>
                    <th className="pb-6 font-black">Giá trị (VND)</th>
                    <th className="pb-6 font-black text-right pr-4">Quản lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/10">
                  {filteredContracts.map((contract) => {
                    const latestScore = Array.isArray(complianceScores) 
                      ? complianceScores
                          .filter(s => s.contractId === contract.id)
                          .sort((a, b) => b.month.localeCompare(a.month))[0]
                      : null;
                    
                    const score = latestScore?.total_score || 0;
                    const statusColor = score >= 95 ? 'text-[var(--color-success)]' : score >= 85 ? 'text-[var(--color-primary)]' : 'text-[var(--color-warning)]';
                    const barColor = score >= 95 ? 'bg-[var(--color-success)]' : score >= 85 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-warning)]';

                    return (
                      <tr key={contract.id} className="group hover:bg-white/5 transition-all duration-300">
                        <td className="py-8 pl-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[var(--color-bg)] rounded-2xl flex items-center justify-center text-[var(--color-text-muted)] border border-white/5 group-hover:scale-110 group-hover:border-[var(--color-primary)]/20 transition-all">
                              <Target size={20} />
                            </div>
                            <div>
                              <p className="font-black text-white text-lg tracking-tight group-hover:text-[var(--color-primary)] transition-colors uppercase">{contract.site_name}</p>
                              <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest leading-none mt-1 group-hover:text-[var(--color-text-secondary)]">ID: {contract.id} • {contract.guard_count_per_shift} guard/ca</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-8">
                          <span className="font-black text-[var(--color-text-secondary)] text-sm">{Array.isArray(vendors) ? vendors.find(v => v.id === contract.vendorId)?.name : ''}</span>
                        </td>
                        <td className="py-8">
                          <div className="space-y-1">
                            <p className="text-xs font-black text-white">{new Date(contract.start_date || contract.startDate).toLocaleDateString()}</p>
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Đến: {new Date(contract.end_date || contract.endDate).toLocaleDateString()}</p>
                          </div>
                        </td>
                        <td className="py-8">
                          <div className="flex flex-wrap gap-2 max-w-[280px]">
                            <span className="px-3 py-1 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10 rounded-lg text-[9px] font-black text-[var(--color-primary)] uppercase tracking-tighter">Patrol: {contract.sla_config.patrol_frequency_minutes}m</span>
                            <span className="px-3 py-1 bg-[var(--color-success)]/5 border border-[var(--color-success)]/10 rounded-lg text-[9px] font-black text-[var(--color-success)] uppercase tracking-tighter">KPI: &gt;{contract.sla_config.min_patrol_compliance}%</span>
                          </div>
                        </td>
                        <td className="py-8">
                          <div className="w-40 space-y-3">
                            <div className="flex justify-between items-end">
                              <span className={cn("text-lg font-black tracking-tighter", statusColor)}>{score}%</span>
                              <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{latestScore?.month || 'No Data'}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${score}%` }}
                                className={cn("h-full rounded-full", barColor)}
                              />
                            </div>
                            <p className="text-[8px] font-bold text-[var(--color-text-muted)]/60 uppercase tracking-widest">Compliance Level: {score >= 90 ? 'High' : score >= 75 ? 'Optimal' : 'Risk'}</p>
                          </div>
                        </td>
                        <td className="py-8">
                        <p className="text-sm font-black text-white">{contract.value.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">TỔNG GIÁ TRỊ</p>
                      </td>
                      <td className="py-8 text-right pr-4">
                        <div className="flex justify-end gap-3">
                          <button className="p-3 bg-white/5 hover:bg-[var(--color-primary)]/20 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] rounded-xl transition-all border border-white/5">
                            <Edit size={16} />
                          </button>
                          <button className="p-3 bg-white/5 hover:bg-[var(--color-error)]/20 text-[var(--color-text-muted)] hover:text-[var(--color-error)] rounded-xl transition-all border border-white/5">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          )}

          {activeSubTab === 'performance' && (
            <div className="space-y-12">
              <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10 p-8 rounded-[40px] flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-[var(--color-primary)] text-white rounded-[28px] flex items-center justify-center shadow-2xl shadow-[var(--color-primary)]/20">
                    <TrendingUp size={40} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase">Phân tích Hiệu suất Nhà thầu</h3>
                    <p className="text-[var(--color-text-secondary)] font-medium max-w-xl">Hệ thống AI tự động đối soát bằng chứng số (GPS, Image Audit, Timeline) để xếp hạng nhà thầu chính xác nhất.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                   <div className="text-center px-8 border-r border-white/5 last:border-0">
                      <p className="text-4xl font-black text-[var(--color-primary)]">A+</p>
                      <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-1">Average Grade</p>
                   </div>
                   <div className="text-center px-8 border-r border-white/5 last:border-0">
                      <p className="text-4xl font-black text-[var(--color-success)]">98%</p>
                      <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-1">On-time Patrol</p>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredScores.map((score) => {
                  const contract = Array.isArray(contracts) ? contracts.find(c => c.id === score.contractId) : null;
                  const vendor = Array.isArray(vendors) ? vendors.find(v => v.id === score.vendorId) : null;
                  
                  return (
                    <div key={score.id} className="bg-[var(--color-surface)]/40 border border-[var(--color-border)]/20 rounded-[48px] p-10 shadow-2xl relative group overflow-hidden">
                      <div className="absolute top-0 right-0 p-8">
                         <div className="w-16 h-16 rounded-[20px] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-black text-[var(--color-text-muted)] leading-none mb-1 uppercase">Grade</span>
                            <span className="text-xl font-black text-[var(--color-primary)] leading-none uppercase">A</span>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-10">
                        <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-2xl">
                          <span className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest">{score.month}</span>
                        </div>
                        <h4 className="text-2xl font-black text-white truncate max-w-[250px] uppercase tracking-tighter">{contract?.site_name}</h4>
                      </div>

                      <div className="grid grid-cols-3 gap-8 mb-10">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] leading-none mb-1">Patrol Compliance</p>
                          <div className="flex items-end gap-2">
                             <p className="text-3xl font-black text-white">{score.patrol_rate}%</p>
                             <span className="text-[10px] font-bold text-[var(--color-success)] pb-1.5">+2.1%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${score.patrol_rate}%` }} />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] leading-none mb-1">Incident Speed</p>
                          <div className="flex items-end gap-2">
                             <p className="text-3xl font-black text-white">{score.incident_rate}%</p>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--color-success)] rounded-full" style={{ width: `${score.incident_rate}%` }} />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] leading-none mb-1">Discipline</p>
                          <div className="flex items-end gap-2">
                             <p className="text-3xl font-black text-white">{score.discipline_rate}%</p>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${score.discipline_rate}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 mb-8">
                         <div className="flex items-center gap-3">
                            <AlertTriangle size={18} className={score.violations_count > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-text-muted)]"} />
                            <span className="text-sm font-black text-white uppercase tracking-tight">Detect: {score.violations_count} Lỗi</span>
                         </div>
                         <div className="flex items-center gap-4">
                           {score.violations_count > 0 && contract && (
                             <div className="px-4 py-2 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl text-[var(--color-error)] text-[10px] font-black uppercase">
                                Penalty: -{(score.violations_count * (contract.sla_config.penalty_per_violation || 0)).toLocaleString()} VND
                             </div>
                           )}
                           {score.total_score >= (contract?.sla_config.bonus_kpi_target || 100) && (
                             <div className="px-4 py-2 bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-xl text-[var(--color-success)] text-[10px] font-black uppercase">
                                Bonus: +5.0M VND
                             </div>
                           )}
                           <SCMDButton variant="ghost" size="sm" className="!rounded-xl !text-[9px]">
                               Audit Timeline
                           </SCMDButton>
                         </div>
                      </div>

                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]">
                               <Briefcase size={14} />
                            </div>
                            <span className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest">{vendor?.name}</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <p className="text-xs font-black text-[var(--color-text-muted)]/60 uppercase tracking-widest">SLA Compliance: <span className="text-[var(--color-success)]">{score.total_score}%</span></p>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SCMDCard>

      {evaluatingVendorId && (
        <VendorEvaluationReport 
          vendorId={evaluatingVendorId} 
          onClose={() => setEvaluatingVendorId(null)} 
        />
      )}

      <VendorModal 
        isOpen={isVendorModalOpen}
        onClose={() => {
          setIsVendorModalOpen(false);
          setEditingVendor(null);
        }}
        onSave={handleSaveVendor}
        vendor={editingVendor}
      />
    </div>
  );
};
