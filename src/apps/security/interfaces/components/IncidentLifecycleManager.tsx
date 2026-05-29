import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ShieldAlert, User, CheckCircle2, Grid, List,
  Search, ArrowRight, Camera, 
  Target, MapPin,
  MessageSquare, UserPlus, ShieldCheck, Activity,
  Filter, Calendar, ChevronDown, Clock, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../../../../lib/api';
import { cn } from '../../../../lib/utils';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard';
import { useDebounce } from '../../../common/hooks/useDebounce';
import { DashboardErrorState, DashboardSpinner } from '../../../common/interfaces/components/DashboardUI';
import { EmptyState } from '../../../superadmin/interfaces/components/EmptyState';

interface Incident {
  id: string;
  type: string;
  severity: string;
  description: string;
  status: string;
  vendorId?: string;
  contractId?: string;
  siteId?: string;
  vendor?: { id: string; name: string; riskLevel?: string; status?: string } | null;
  contract?: { id: string; contractCode?: string; contractName?: string; status?: string } | null;
  site?: { id: string; siteName?: string; address?: string; status?: string } | null;
  imageUri?: string;
  location?: any;
  responseDueAt?: string;
  resolutionDueAt?: string;
  responseAcknowledgedAt?: string;
  resolutionSubmittedAt?: string;
  requiredEvidenceTypes?: string[];
  slaBreached?: boolean;
  reportedAt: string;
  investigatingAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolutionNotes?: string;
  resolutionImages: string[];
  assignedToId?: string;
  reporter?: { fullName: string; role: string };
  assignee?: { fullName: string; role: string };
  timeline?: Array<{
    id: string;
    action: string;
    actorId?: string;
    actorRole?: string;
    fromStatus?: string;
    toStatus?: string;
    notes?: string;
    evidenceIds?: string[];
    traceId?: string;
    createdAt: string;
  }>;
  evidences?: Array<{
    id: string;
    kind: string;
    fileUrl?: string;
    uri?: string;
    sourceType?: string;
    status?: string;
    note?: string;
    capturedAt?: string;
    createdAt: string;
  }>;
}

export const IncidentLifecycleManager: React.FC = () => {
  const [searchParams] = useSearchParams();
  const priorityOnly = searchParams.get('priorityOnly') === 'true';
  const focusId = searchParams.get('focusId');
  const focusType = searchParams.get('focusType');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [serverSummary, setServerSummary] = useState<{ total?: number; openCount?: number; criticalCount?: number; slaBreachedCount?: number } | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [pageSize] = useState(50);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [sortBy, setSortBy] = useState<'date' | 'severity'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [assigningTo, setAssigningTo] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [resolutionData, setResolutionData] = useState({ notes: '', images: [] as string[] });
  const [highlightedIncidentId, setHighlightedIncidentId] = useState<string | null>(null);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);

  const statusOf = (incident?: Incident | null) => (incident?.status || '').toUpperCase();
  const statusLabel = (status?: string) => {
    const value = (status || '').toUpperCase();
    if (value === 'REPORTED') return 'Mới';
    if (value === 'ACKNOWLEDGED') return 'Đã tiếp nhận';
    if (value === 'ASSIGNED') return 'Đã giao';
    if (value === 'INVESTIGATING') return 'Đang xử lý';
    if (value === 'WAITING_VENDOR_RESPONSE') return 'Chờ nhà thầu';
    if (value === 'RESOLVED_PENDING_APPROVAL' || value === 'RESOLVED') return 'Chờ nghiệm thu';
    if (value === 'REOPENED') return 'Mở lại';
    if (value === 'ESCALATED') return 'Escalated';
    if (value === 'CLOSED') return 'Đã đóng';
    if (value === 'CANCELLED') return 'Đã hủy';
    return value || 'Không rõ';
  };
  const minutesUntil = (value?: string) => {
    if (!value) return null;
    return Math.round((new Date(value).getTime() - Date.now()) / 60000);
  };
  const statusClass = (status?: string) => {
    const value = (status || '').toUpperCase();
    if (value === 'REPORTED' || value === 'ACKNOWLEDGED') return 'bg-blue-500/5 text-blue-400 border-blue-500/20';
    if (value === 'ASSIGNED' || value === 'INVESTIGATING' || value === 'WAITING_VENDOR_RESPONSE') return 'bg-amber-500/5 text-amber-400 border-amber-500/20';
    if (value === 'RESOLVED_PENDING_APPROVAL' || value === 'RESOLVED') return 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20';
    if (value === 'ESCALATED' || value === 'REOPENED') return 'bg-red-500/5 text-red-400 border-red-500/20';
    return 'bg-scmd-navy text-scmd-silver/40 border-white/5';
  };

  const openIncident = async (incident: Incident) => {
    setSelectedIncident(incident);
    try {
      const detail = await apiFetch<Incident>(`/api/tenant/incidents/${incident.id}`);
      setSelectedIncident(detail);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Reset cursor when sort/filters change
    setCursorHistory([null]);
    setCursor(null);
  }, [filter, severityFilter, assigneeFilter, sortBy, sortOrder, dateFilter, debouncedSearchTerm, priorityOnly]);

  useEffect(() => {
    fetchIncidents();
  }, [cursor, pageSize, filter, severityFilter, assigneeFilter, sortBy, sortOrder, dateFilter, debouncedSearchTerm, priorityOnly]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    setIncidentsError(null);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        sortBy,
        sortOrder
      });

      if (cursor) params.append('cursor', cursor);
      if (filter !== 'all') params.append('status', filter);
      if (priorityOnly) params.append('priorityOnly', 'true');
      if (severityFilter !== 'all') {
        params.append('severity', severityFilter === 'high' ? 'HIGH' : severityFilter.toUpperCase());
      }
      if (assigneeFilter !== 'all') params.append('assigneeId', assigneeFilter);
      if (debouncedSearchTerm.trim()) params.append('search', debouncedSearchTerm.trim());

      if (dateFilter !== 'all') {
        const now = new Date();
        const from = new Date(now);
        if (dateFilter === 'today') from.setHours(0, 0, 0, 0);
        if (dateFilter === 'week') from.setDate(now.getDate() - 7);
        if (dateFilter === 'month') from.setDate(now.getDate() - 30);
        params.append('dateFrom', from.toISOString());
        params.append('dateTo', now.toISOString());
      }
      
      const result = await apiFetch<any>(`/api/tenant/incidents?${params.toString()}`);
      
      if (result && Array.isArray(result.items)) {
        setIncidents(result.items);
        setHasMore(result.hasMore || false);
        setNextCursor(result.nextCursor ?? null);
        setServerSummary(result.summary || null);
      } else {
        setIncidents([]);
      setServerSummary(null);
        setHasMore(false);
        setNextCursor(null);
        setServerSummary(null);
      }
    } catch (err) {
      console.error(err);
      setIncidents([]);
      setServerSummary(null);
      setIncidentsError(err instanceof Error && err.message ? err.message : 'Không thể tải danh sách sự cố. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const result = await apiFetch<any>('/api/tenant/staff?role=supervisor,admin,tenant-admin');
      if (Array.isArray(result)) {
        setStaff(result);
      } else if (result && Array.isArray(result.data)) {
        setStaff(result.data);
      } else {
        setStaff([]);
      }
    } catch (err) {
      console.error(err);
      setStaff([]);
    }
  };

  const mttrMinutes = useMemo(() => {
    const resolved = incidents.filter(i => i.resolvedAt && i.reportedAt);
    if (resolved.length === 0) return 0;
    const totalMinutes = resolved.reduce((acc, i) => {
      const diff = new Date(i.resolvedAt!).getTime() - new Date(i.reportedAt).getTime();
      return acc + (diff / 1000 / 60);
    }, 0);
    return Math.round(totalMinutes / resolved.length);
  }, [incidents]);

  const incidentsLast24h = useMemo(() => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return incidents.filter(i => 
      statusOf(i) === 'CLOSED' && 
      i.closedAt && 
      new Date(i.closedAt) >= twentyFourHoursAgo
    ).length;
  }, [incidents]);

  const handleAssign = async () => {
    if (!selectedIncident || !assigningTo) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/tenant/incidents/${selectedIncident.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ staffId: assigningTo })
      });
      await fetchIncidents();
      setSelectedIncident(null);
      setAssigningTo(''); // Reset dropdown sau khi điều phối thành công
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedIncident) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/tenant/incidents/${selectedIncident.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ 
          status,
          resolutionNotes: resolutionData.notes,
          resolutionImages: resolutionData.images
        })
      });
      await fetchIncidents();
      setSelectedIncident(null);
      setResolutionData({ notes: '', images: [] }); // Reset form biên bản sau khi cập nhật thành công
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectResolution = async () => {
    if (!selectedIncident) return;
    const reopenReason = window.prompt('Lý do mở lại sự cố');
    if (!reopenReason) return;
    const requiredNextAction = window.prompt('Hành động tiếp theo bắt buộc') || reopenReason;
    setSubmitting(true);
    try {
      await apiFetch(`/api/tenant/incidents/${selectedIncident.id}/reject-resolution`, {
        method: 'POST',
        body: JSON.stringify({ reopenReason, requiredNextAction })
      });
      await fetchIncidents();
      setSelectedIncident(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    return incidents
      .filter(i => {
        // Since we now partially filter on server (status), we only filter remaining here
        const matchesSeverity = severityFilter === 'all' || 
                              (severityFilter === 'high' && (i.severity?.toLowerCase() === 'high' || i.severity?.toLowerCase() === 'cao' || i.severity?.toLowerCase() === 'khẩn cấp' || i.severity?.toLowerCase() === 'sos')) ||
                              (severityFilter === 'medium' && (i.severity?.toLowerCase() === 'medium' || i.severity?.toLowerCase() === 'trung bình')) ||
                              (severityFilter === 'low' && (i.severity?.toLowerCase() === 'low' || i.severity?.toLowerCase() === 'thấp'));

        const reportedDate = new Date(i.reportedAt);
        const now = new Date();
        const matchesDate = dateFilter === 'all' || (
          dateFilter === 'today' ? reportedDate.toDateString() === now.toDateString() :
          dateFilter === 'week' ? (now.getTime() - reportedDate.getTime()) <= 7 * 24 * 60 * 60 * 1000 :
          dateFilter === 'month' ? (now.getTime() - reportedDate.getTime()) <= 30 * 24 * 60 * 60 * 1000 : true
        );

        const matchesAssignee = assigneeFilter === 'all' || i.assignedToId === assigneeFilter;
        const q = debouncedSearchTerm.toLowerCase();
        const matchesSearch = !q || i.description.toLowerCase().includes(q) || 
                              i.type.toLowerCase().includes(q) ||
                              (i.reporter?.fullName || '').toLowerCase().includes(q) ||
                              (i.assignee?.fullName || '').toLowerCase().includes(q) ||
                              (i.vendor?.name || '').toLowerCase().includes(q) ||
                              (i.site?.siteName || '').toLowerCase().includes(q) ||
                              (i.contract?.contractCode || '').toLowerCase().includes(q);
        return matchesSeverity && matchesDate && matchesAssignee && matchesSearch;
      });
  }, [incidents, severityFilter, dateFilter, assigneeFilter, debouncedSearchTerm]);

  useEffect(() => {
    if (!focusId || focusType !== 'incident' || loading) return;

    const target = filteredIncidents.find((incident) => incident.id === focusId);
    if (!target) return;

    setHighlightedIncidentId(focusId);
    const element = document.querySelector(`[data-incident-id="${CSS.escape(focusId)}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const timer = window.setTimeout(() => {
      setHighlightedIncidentId((current) => current === focusId ? null : current);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [filteredIncidents, focusId, focusType, loading]);

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="space-y-8 pb-10"
    >
      {/* Header & Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SCMDCard className="p-6 bg-scmd-navy/50 border-scmd-cyber/20">
          <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">MTTR (Trung bình xử lý)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{mttrMinutes}</span>
            <span className="text-xs font-bold text-scmd-cyber uppercase">Phút</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Activity size={12} className="text-emerald-400" />
            <p className="text-[10px] text-scmd-silver/20 font-bold uppercase tracking-wider">Hiệu suất mục tiêu: &lt; 30 Phút</p>
          </div>
        </SCMDCard>
        
        <SCMDCard className="p-6 bg-scmd-navy/50 border-white/5">
          <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">Đang xử lý</p>
          <span className="text-3xl font-black text-amber-400">
            {serverSummary?.openCount ?? incidents.filter(i => !['CLOSED', 'CANCELLED'].includes(statusOf(i))).length}
          </span>
        </SCMDCard>

        <SCMDCard className="p-6 bg-scmd-navy/50 border-white/5">
          <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">Khẩn cấp</p>
          <span className="text-3xl font-black text-red-500">
            {serverSummary?.criticalCount ?? incidents.filter(i => {
              const s = (i.severity || '').toLowerCase();
              return s === 'high' || s === 'cao' || s === 'khẩn cấp' || s === 'critical';
            }).length}
          </span>
        </SCMDCard>

        <SCMDCard className="p-6 bg-scmd-navy/50 border-white/5">
          <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">Hoàn thành (24h)</p>
          <span className="text-3xl font-black text-emerald-400">
            {incidentsLast24h}
          </span>
        </SCMDCard>
      </motion.div>

      {/* Main List & Filters */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="bg-scmd-navy/50 p-6 rounded-[32px] border border-white/5 space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex bg-scmd-navy/50 p-1 rounded-2xl border border-white/5">
                  {['all', 'reported', 'assigned', 'investigating', 'resolved_pending_approval', 'closed'].map(s => (
                    <button
                      key={s}
                      onClick={() => setFilter(s)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap",
                        filter === s ? "bg-scmd-cyber text-scmd-navy shadow-lg shadow-scmd-cyber/20" : "text-scmd-silver/40 hover:text-white"
                      )}
                    >
                      {s === 'all' ? 'Tất cả' : statusLabel(s)}
                    </button>
                  ))}
                </div>

                <div className="flex bg-scmd-navy/50 p-1 rounded-xl border border-white/5">
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      viewMode === 'list' ? "bg-scmd-navy text-scmd-cyber" : "text-scmd-silver/20 hover:text-white"
                    )}
                  >
                    <List size={16} />
                  </button>
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      viewMode === 'grid' ? "bg-scmd-navy text-scmd-cyber" : "text-scmd-silver/20 hover:text-white"
                    )}
                  >
                    <Grid size={16} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-scmd-navy/50 px-4 py-2 rounded-2xl border border-white/5 text-scmd-silver/40 hover:border-scmd-cyber/30 transition-all focus-within:border-scmd-cyber group w-full sm:w-64">
                <Search size={14} className="group-focus-within:text-scmd-cyber" />
                <input 
                  placeholder="Tìm kiếm sự cố..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none text-[11px] font-bold outline-none flex-1 text-white placeholder:text-scmd-silver/20 uppercase tracking-tight"
                />
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-4 border-t border-white/5">
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">
                    <Filter size={10} /> Ưu tiên
                  </div>
                  <div className="flex gap-1">
                    {['all', 'high', 'medium', 'low'].map(sev => (
                      <button
                        key={sev}
                        onClick={() => setSeverityFilter(sev)}
                        className={cn(
                           "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all",
                           severityFilter === sev 
                            ? "bg-scmd-navy border-white/10 text-white" 
                            : "bg-transparent border-white/5 text-scmd-silver/40 hover:border-white/10 hover:text-white"
                        )}
                      >
                        {sev === 'all' ? 'Mọi mức độ' : sev === 'high' ? 'Khẩn' : sev === 'medium' ? 'Thường' : 'Thấp'}
                      </button>
                    ))}
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">
                    <Calendar size={10} /> Thời gian
                  </div>
                  <div className="flex gap-1">
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'today', label: 'Hôm nay' },
                      { id: 'week', label: '7 ngày' },
                      { id: 'month', label: '30 ngày' }
                    ].map(d => (
                      <button
                        key={d.id}
                        onClick={() => setDateFilter(d.id)}
                        className={cn(
                           "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all",
                           dateFilter === d.id 
                            ? "bg-scmd-navy border-white/10 text-white" 
                            : "bg-transparent border-white/5 text-scmd-silver/40 hover:border-white/10 hover:text-white"
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">
                    <User size={10} /> Phụ trách
                  </div>
                  <select 
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="bg-scmd-navy/50 border border-white/5 rounded-lg text-[9px] font-black text-scmd-silver/40 uppercase px-2 py-1.5 outline-none focus:border-white/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">Tất cả nhân sự</option>
                    {Array.isArray(staff) && staff.map(s => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
               </div>

               <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Sắp xếp</span>
                  <div className="flex bg-scmd-navy/30 p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => setSortBy('date')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                        sortBy === 'date' ? "bg-scmd-navy/80 text-white shadow-sm" : "text-scmd-silver/40 hover:text-white"
                      )}
                    >
                      Ngày
                    </button>
                    <button
                      onClick={() => setSortBy('severity')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                        sortBy === 'severity' ? "bg-scmd-navy/80 text-white shadow-sm" : "text-scmd-silver/40 hover:text-white"
                      )}
                    >
                      Mức độ
                    </button>
                  </div>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center justify-center w-8 h-8 bg-scmd-navy/50 border border-white/5 rounded-lg text-scmd-silver/40 hover:text-white hover:border-white/20 transition-all"
                    title={sortOrder === 'desc' ? 'Giảm dần' : 'Tăng dần'}
                  >
                    <ChevronDown size={14} className={cn("transition-transform duration-300", sortOrder === 'asc' && "rotate-180")} />
                  </button>
               </div>
               
               {(filter !== 'all' || severityFilter !== 'all' || assigneeFilter !== 'all' || dateFilter !== 'all' || searchTerm || sortBy !== 'date' || sortOrder !== 'desc') && (
                 <button
                    onClick={() => {
                      setFilter('all');
                      setSeverityFilter('all');
                      setDateFilter('all');
                      setAssigneeFilter('all');
                      setSearchTerm('');
                      setSortBy('date');
                      setSortOrder('desc');
                    }}
                    className="ml-auto text-[9px] font-black text-scmd-cyber uppercase tracking-widest hover:underline decoration-scmd-cyber/30 underline-offset-4"
                 >
                    Đặt lại mặc định
                 </button>
               )}
            </div>
            {/* Pagination Controls (Cursor-based) */}
            {!loading && (incidents.length > 0 || cursorHistory.length > 1) && (
              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <p className="text-[10px] font-bold text-scmd-silver/40 uppercase tracking-widest">
                  Trang <span className="text-white">{cursorHistory.length}</span> 
                  {hasMore && <span className="ml-2 text-scmd-cyber">· Còn dữ liệu tiếp theo</span>}
                </p>
                <div className="flex items-center gap-2">
                   <button 
                     disabled={cursorHistory.length <= 1}
                     onClick={() => {
                        const newHistory = [...cursorHistory];
                        newHistory.pop(); // Remove current cursor
                        const prevCursor = newHistory[newHistory.length - 1];
                        setCursorHistory(newHistory);
                        setCursor(prevCursor ?? null);
                     }}
                     className="p-2 rounded-xl bg-scmd-navy border border-white/5 text-scmd-silver/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                   >
                     <ChevronDown size={14} className="rotate-90" />
                   </button>
                   <div className="px-4 py-2 rounded-xl bg-scmd-navy border border-scmd-cyber/30 text-[10px] font-black text-white uppercase">
                     {cursorHistory.length}
                   </div>
                   <button 
                     disabled={!nextCursor}
                     onClick={() => {
                        setCursorHistory(prev => [...prev, nextCursor]);
                        setCursor(nextCursor);
                     }}
                     className="p-2 rounded-xl bg-scmd-navy border border-white/5 text-scmd-silver/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                   >
                     <ChevronDown size={14} className="-rotate-90" />
                   </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {loading ? (
              <DashboardSpinner message="Đang tải dữ liệu thực tế..." className="p-24 py-24" />
            ) : incidentsError ? (
              <DashboardErrorState
                title="Không thể tải danh sách sự cố"
                description={incidentsError}
                onRetry={fetchIncidents}
                className="py-24"
              />
            ) : filteredIncidents.length === 0 ? (
              <EmptyState
                icon={<ShieldAlert size={40} />}
                title="Không tìm thấy sự cố nào khớp yêu cầu"
                description="Thử điều chỉnh bộ lọc, khoảng thời gian hoặc quay về chế độ xem tất cả sự cố."
                className="rounded-3xl border-dashed bg-scmd-navy/20 py-24"
              />
            ) : (
              <div className="space-y-2">
                {viewMode === 'list' ? (
                  <>
                    {/* Header Row for "Table" look */}
                    <div className="flex items-center px-8 py-3 text-[9px] font-black text-scmd-silver/40 uppercase tracking-widest border-b border-white/5">
                      <div className="w-12 text-center">Ưu tiên</div>
                      <div className="flex-1 ml-6">Thông tin sự cố / Phân loại</div>
                      <div className="w-32">Khu vực / Phân khu</div>
                      <div className="w-28">Người báo</div>
                      <div className="w-28 ml-2">Phụ trách</div>
                      <div className="w-28">Thời gian</div>
                      <div className="w-24 text-center">Trạng thái</div>
                      <div className="w-8"></div>
                    </div>

                    <div className="space-y-2 pt-2">
                      {filteredIncidents.map(incident => {
                        const normSeverity = (incident.severity || '').toLowerCase();
                        const isHigh = normSeverity === 'high' || normSeverity === 'cao' || normSeverity === 'khẩn cấp';
                        const isMedium = normSeverity === 'medium' || normSeverity === 'trung bình';
                        
                        return (
                          <SCMDCard
                            key={incident.id}
                            data-incident-id={incident.id}
                            onClick={() => openIncident(incident)}
                            className={cn(
                              "p-4 cursor-pointer transition-all border-white/5 flex items-center hover:bg-scmd-navy/40 relative group",
                              selectedIncident?.id === incident.id ? "border-scmd-cyber bg-scmd-cyber/5 shadow-huge" : "hover:border-white/20",
                              highlightedIncidentId === incident.id && "border-scmd-primary/70 bg-scmd-primary/10 ring-2 ring-scmd-primary/40 shadow-lg shadow-scmd-primary/15"
                            )}
                          >
                            <div className="w-12 flex justify-center">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                                isHigh ? "bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : 
                                isMedium ? "bg-amber-500/10 text-amber-500" :
                                "bg-scmd-navy text-scmd-silver/40"
                              )}>
                                <ShieldAlert size={18} strokeWidth={isHigh ? 3 : 2} />
                              </div>
                            </div>

                            <div className="flex-1 ml-6 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-tight",
                                  isHigh ? "text-red-400" : "text-white"
                                )}>{incident.type}</span>
                                {incident.imageUri && <Camera size={10} className="text-scmd-cyber opacity-50" />}
                              </div>
                              <p className="text-[10px] text-scmd-silver/40 font-medium truncate pr-4">{incident.description}</p>
                            </div>

                            <div className="w-40 flex flex-col justify-center gap-0.5">
                              <span className="text-[10px] font-black text-scmd-silver/60 uppercase tracking-tight truncate">{incident.site?.siteName || incident.siteId || 'Chưa gán site'}</span>
                              <span className="text-[8px] font-bold text-scmd-silver/30 uppercase tracking-widest truncate">{incident.vendor?.name || incident.vendorId || 'Chưa gán nhà thầu'}</span>
                            </div>

                            <div className="w-28 flex items-center gap-2">
                              <div className={cn(
                                "w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold",
                                incident.reporter ? "bg-scmd-navy text-scmd-silver/40" : "bg-scmd-navy/50 text-scmd-silver/20"
                              )}>
                                 {incident.reporter?.fullName.charAt(0) || '?'}
                              </div>
                              <span className={cn(
                                "text-[10px] font-black truncate uppercase leading-none",
                                incident.reporter ? "text-scmd-silver/40" : "text-scmd-silver/20 "
                              )}>
                                {incident.reporter?.fullName.split(' ').pop() || 'Hệ thống'}
                              </span>
                            </div>

                            <div className="w-28 ml-2 flex items-center gap-2">
                              {incident.assignee ? (
                                <>
                                  <div className="w-5 h-5 rounded-md bg-scmd-cyber/10 flex items-center justify-center text-[8px] font-bold text-scmd-cyber border border-scmd-cyber/20">
                                    {incident.assignee.fullName.charAt(0)}
                                  </div>
                                  <span className="text-[10px] font-black text-scmd-silver/40 truncate uppercase leading-none">
                                    {incident.assignee.fullName.split(' ').pop()}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="w-5 h-5 rounded-md bg-scmd-navy border border-white/5 flex items-center justify-center text-[10px] text-scmd-silver/20">
                                    <UserPlus size={10} />
                                  </div>
                                  <span className="text-[10px] font-bold text-scmd-silver/20 uppercase tracking-tighter">Chờ xử lý</span>
                                </>
                              )}
                            </div>

                            <div className="w-28 flex flex-col justify-center gap-0.5">
                              <span className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-tight">
                                {new Date(incident.reportedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[8px] font-bold text-scmd-silver/20 uppercase tracking-widest">
                                {new Date(incident.reportedAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>

                            <div className="w-24 flex justify-center">
                              <span className={cn(
                                "text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border",
                                statusClass(incident.status)
                              )}>
                                {statusLabel(incident.status)}
                              </span>
                            </div>

                            <div className="w-8 flex justify-end">
                               <ArrowRight size={14} className={cn(
                                 "transition-all",
                                 selectedIncident?.id === incident.id ? "text-scmd-cyber translate-x-1" : "text-scmd-silver/20 group-hover:text-scmd-silver/40 group-hover:translate-x-1"
                               )} />
                            </div>
                          </SCMDCard>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pt-4">
                    {filteredIncidents.map(incident => {
                      const normSeverity = (incident.severity || '').toLowerCase();
                      const isHigh = normSeverity === 'high' || normSeverity === 'cao' || normSeverity === 'khẩn cấp';
                      
                      return (
                        <SCMDCard
                          key={incident.id}
                          data-incident-id={incident.id}
                          onClick={() => openIncident(incident)}
                          className={cn(
                            "p-5 cursor-pointer transition-all border-white/5 hover:bg-scmd-navy/40 relative group flex flex-col gap-4",
                            selectedIncident?.id === incident.id ? "border-scmd-cyber bg-scmd-cyber/5 shadow-huge ring-1 ring-scmd-cyber/50" : "hover:border-white/20",
                            highlightedIncidentId === incident.id && "border-scmd-primary/70 bg-scmd-primary/10 ring-2 ring-scmd-primary/40 shadow-lg shadow-scmd-primary/15"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              isHigh ? "bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-scmd-navy text-scmd-silver/40"
                            )}>
                              <ShieldAlert size={20} strokeWidth={isHigh ? 3 : 2} />
                            </div>
                            <span className={cn(
                              "text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border",
                              statusClass(incident.status)
                            )}>
                              {statusLabel(incident.status)}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className={cn(
                              "text-xs font-black uppercase tracking-tight line-clamp-1",
                              isHigh ? "text-red-400" : "text-white"
                            )}>{incident.type}</h4>
                            <p className="text-[10px] text-scmd-silver/40 font-medium line-clamp-2 min-h-[30px]">{incident.description}</p>
                          </div>

                          <div className="flex items-center gap-4 pt-4 mt-auto border-t border-white/5">
                            <div className="flex-1 flex flex-col gap-0.5">
                              <span className="text-[9px] font-black text-scmd-silver/40 uppercase tracking-tighter">Báo cáo: {incident.reporter?.fullName.split(' ').pop() || 'Hệ thống'}</span>
                              <span className="text-[8px] font-bold text-scmd-silver/20 uppercase">{new Date(incident.reportedAt).toLocaleString('vi-VN')}</span>
                            </div>
                            <div className="flex -space-x-2">
                               <div className="w-6 h-6 rounded-lg bg-scmd-navy border border-white/10 flex items-center justify-center text-[8px] font-bold text-white uppercase ring-2 ring-scmd-navy">
                                 {incident.reporter?.fullName.charAt(0) || '?'}
                               </div>
                               {incident.assignee && (
                                 <div className="w-6 h-6 rounded-lg bg-scmd-cyber border border-white/10 flex items-center justify-center text-[8px] font-bold text-scmd-navy uppercase ring-2 ring-scmd-navy">
                                   {incident.assignee.fullName.charAt(0)}
                                 </div>
                               )}
                            </div>
                          </div>

                          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                             <ArrowRight size={14} className="text-scmd-cyber" />
                          </div>
                        </SCMDCard>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Details / Actions */}
        <div className="w-full lg:w-96 space-y-4">
          <AnimatePresence mode="wait">
            {selectedIncident ? (
              <motion.div
                key={selectedIncident.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-4"
              >
                <SCMDCard className="p-6 bg-scmd-navy border-white/10 shadow-huge overflow-hidden relative rounded-[32px]">
                  <div className="absolute top-0 right-0 p-4">
                     <button onClick={() => setSelectedIncident(null)} className="text-scmd-silver/40 hover:text-white transition-colors"><Target size={18} className="rotate-45" /></button>
                  </div>

                  <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4">Chi tiết sự cố</h3>
                  
                  <div className="space-y-6">
                    {/* Status Tracker */}
                    <div className="relative pb-4 pt-2">
                      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-white/5" />
                      <div className="space-y-6">
                        {[
                          { label: 'Báo cáo', time: selectedIncident.reportedAt, active: true },
                          { label: 'Tiếp nhận', time: selectedIncident.investigatingAt, active: !!selectedIncident.investigatingAt },
                          { label: 'Đã xử lý', time: selectedIncident.resolvedAt, active: !!selectedIncident.resolvedAt },
                          { label: 'Đã đóng', time: selectedIncident.closedAt, active: !!selectedIncident.closedAt }
                        ].map((step, idx) => (
                           <div key={idx} className="relative pl-10">
                            <div className={cn(
                              "absolute left-1 w-4 h-4 rounded-full border-2 border-scmd-navy z-10 transition-colors duration-500",
                              step.active ? "bg-scmd-cyber" : "bg-white/10"
                            )} />
                            <p className={cn("text-[10px] font-black uppercase tracking-widest", step.active ? "text-white" : "text-scmd-silver/20")}>{step.label}</p>
                            {step.time && <p className="text-[10px] text-scmd-silver/40 font-bold">{new Date(step.time).toLocaleString('vi-VN')}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Phản hồi SLA', value: selectedIncident.responseDueAt, done: !!selectedIncident.responseAcknowledgedAt },
                        { label: 'Xử lý SLA', value: selectedIncident.resolutionDueAt, done: ['CLOSED', 'CANCELLED'].includes(statusOf(selectedIncident)) }
                      ].map((item) => {
                        const left = minutesUntil(item.value);
                        const breached = !item.done && left !== null && left < 0;
                        return (
                          <div key={item.label} className={cn(
                            "p-3 rounded-2xl border bg-scmd-navy/50",
                            breached || selectedIncident.slaBreached ? "border-red-500/30 text-red-300" : "border-white/5 text-scmd-silver/40"
                          )}>
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                              <Clock size={12} /> {item.label}
                            </div>
                            <p className="mt-2 text-xs font-black text-white">
                              {item.done ? 'Đạt' : left === null ? 'Chưa gán' : left >= 0 ? `Còn ${left} phút` : `Quá ${Math.abs(left)} phút`}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-4 rounded-2xl border border-white/5 bg-scmd-navy/50">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-scmd-silver/40 mb-2">
                          <MapPin size={12} /> Ngữ cảnh đối soát
                        </div>
                        <div className="space-y-1 text-xs font-bold">
                          <p className="text-white">Site: {selectedIncident.site?.siteName || selectedIncident.siteId || 'Chưa liên kết'}</p>
                          <p className="text-scmd-silver/60">Nhà thầu: {selectedIncident.vendor?.name || selectedIncident.vendorId || 'Chưa liên kết'}</p>
                          <p className="text-scmd-silver/60">Hợp đồng: {selectedIncident.contract?.contractCode || selectedIncident.contract?.contractName || selectedIncident.contractId || 'Chưa liên kết'}</p>
                        </div>
                      </div>
                    </div>

                    {(selectedIncident.timeline?.length || 0) > 0 && (
                      <div className="p-4 bg-scmd-navy/50 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">
                          <Activity size={12} className="text-scmd-cyber" /> Timeline SLA
                        </div>
                        <div className="max-h-56 overflow-y-auto pr-1 space-y-3">
                          {(selectedIncident.timeline || []).map((event) => (
                            <div key={event.id} className="border-l border-scmd-cyber/30 pl-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-black text-white uppercase">{event.action}</p>
                                <span className="text-[8px] font-bold text-scmd-silver/30">
                                  {new Date(event.createdAt).toLocaleString('vi-VN')}
                                </span>
                              </div>
                              <p className="text-[9px] text-scmd-silver/40 font-bold">
                                {event.fromStatus ? `${statusLabel(event.fromStatus)} -> ${statusLabel(event.toStatus)}` : statusLabel(event.toStatus)}
                              </p>
                              {event.notes && <p className="text-[10px] text-scmd-silver/60 mt-1 line-clamp-2">{event.notes}</p>}
                              {event.traceId && <p className="text-[8px] text-scmd-silver/20 font-mono mt-1">trace {event.traceId.slice(0, 12)}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedIncident.evidences?.length || 0) > 0 && (
                      <div className="p-4 bg-scmd-navy/50 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">
                          <FileText size={12} className="text-scmd-cyber" /> Evidence chain
                        </div>
                        {(selectedIncident.evidences || []).map((evidence) => (
                          <div key={evidence.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/5 bg-scmd-navy/60 p-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-white uppercase">{evidence.kind} · {evidence.sourceType || 'INCIDENT'}</p>
                              <p className="text-[9px] text-scmd-silver/40 truncate">{evidence.note || evidence.fileUrl || evidence.uri || evidence.id}</p>
                            </div>
                            <span className={cn(
                              "shrink-0 rounded-lg border px-2 py-1 text-[8px] font-black uppercase",
                              evidence.status === 'ACTIVE' ? "border-emerald-500/20 text-emerald-400" : "border-red-500/20 text-red-400"
                            )}>{evidence.status || 'ACTIVE'}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="p-4 bg-scmd-navy/50 rounded-2xl border border-white/5 space-y-3">
                       <div className="flex items-center gap-2 text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">
                          <MapPin size={12} className="text-scmd-cyber" /> Vị trí xác thực
                       </div>
                       <p className="text-[10px] text-scmd-silver/40 font-bold leading-relaxed">
                         {selectedIncident.site?.address || 'Chưa có địa chỉ site'}
                         <br/>
                         <span className="text-scmd-silver/20">
                           {selectedIncident.location ? `Dữ liệu GPS: ${typeof selectedIncident.location === 'string' ? selectedIncident.location : JSON.stringify(selectedIncident.location)}` : 'Chưa có dữ liệu GPS / checkpoint xác thực'}
                         </span>
                       </p>
                       {selectedIncident.imageUri && (
                         <div className="relative group overflow-hidden rounded-xl mt-2">
                          <img src={selectedIncident.imageUri} className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-scmd-navy/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera size={20} className="text-white" />
                          </div>
                         </div>
                       )}
                    </div>

                    {/* Actions Panel */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                       {['REPORTED', 'ACKNOWLEDGED'].includes(statusOf(selectedIncident)) && (
                         <div className="space-y-4">
                            {statusOf(selectedIncident) === 'REPORTED' && (
                              <SCMDButton
                                onClick={() => handleUpdateStatus('ACKNOWLEDGED')}
                                disabled={submitting}
                                isLoading={submitting}
                                className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl"
                              >
                                {!submitting && <CheckCircle2 size={18} />}
                                TIẾP NHẬN SỰ CỐ
                              </SCMDButton>
                            )}
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-scmd-cyber uppercase tracking-widest block ml-1">Điều phối nhân sự</label>
                              <select 
                                className="w-full h-12 bg-scmd-navy border border-white/5 rounded-2xl px-4 text-[11px] font-black text-white outline-none focus:border-scmd-cyber transition-all appearance-none uppercase tracking-tight"
                                value={assigningTo}
                                onChange={(e) => setAssigningTo(e.target.value)}
                              >
                                <option value="" className="bg-scmd-navy">Chọn cán bộ xử lý...</option>
                                  {Array.isArray(staff) && staff.map(s => (
                                    <option key={s.id} value={s.id} className="bg-scmd-navy">{s.fullName} - {s.role.toUpperCase()}</option>
                                  ))}
                              </select>
                            </div>
                            <SCMDButton 
                              onClick={handleAssign}
                              disabled={!assigningTo || submitting}
                              isLoading={submitting}
                              className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl"
                            >
                               {!submitting && <UserPlus size={18} />}
                               XÁC NHẬN ĐIỀU PHỐI
                            </SCMDButton>
                         </div>
                       )}

                       {['ASSIGNED', 'INVESTIGATING', 'WAITING_VENDOR_RESPONSE', 'ESCALATED', 'REOPENED'].includes(statusOf(selectedIncident)) && (
                         <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-scmd-cyber uppercase tracking-widest block ml-1">Biên bản hiện trường</label>
                              <textarea 
                                className="w-full bg-scmd-navy border border-white/5 rounded-2xl p-4 text-[11px] text-white outline-none min-h-[120px] focus:border-scmd-cyber transition-all placeholder:text-scmd-silver/20"
                                placeholder="Nhập chi tiết phương án xử lý và tình trạng hiện tại..."
                                value={resolutionData.notes}
                                onChange={(e) => setResolutionData({...resolutionData, notes: e.target.value})}
                              />
                            </div>
                            <div className="flex gap-3">
                               <button className="flex-1 h-14 bg-scmd-navy/50 border border-white/5 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black text-scmd-silver/40 uppercase hover:text-white hover:bg-scmd-navy transition-all">
                                  <Camera size={18} /> ẢNH
                               </button>
                               <SCMDButton 
                                onClick={() => handleUpdateStatus('RESOLVED_PENDING_APPROVAL')}
                                disabled={!resolutionData.notes || submitting}
                                isLoading={submitting}
                                className="flex-[2] h-14 bg-emerald-500 hover:bg-emerald-400 text-scmd-navy font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 border-none transition-all active:scale-95"
                               >
                                  {!submitting && <ShieldCheck size={18} />}
                                  BÁO CÁO XONG
                               </SCMDButton>
                            </div>
                         </div>
                       )}

                       {['RESOLVED', 'RESOLVED_PENDING_APPROVAL'].includes(statusOf(selectedIncident)) && (
                         <div className="space-y-4">
                           <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl mb-2">
                              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Ghi chú xử lý:</p>
                              <p className="text-[10px] text-scmd-silver/40 font-medium ">"{selectedIncident.resolutionNotes || 'Không có ghi chú'}"</p>
                           </div>
                           <SCMDButton 
                             onClick={() => handleUpdateStatus('CLOSED')}
                             disabled={submitting}
                             isLoading={submitting}
                             className="w-full h-16 bg-white text-scmd-navy font-black rounded-[24px] flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-95 shadow-2xl"
                           >
                               {!submitting && <CheckCircle2 size={24} />}
                               <div className="text-left">
                                 <p className="text-[12px] leading-tight">NGHIỆM THU</p>
                                 <p className="text-[8px] opacity-60 tracking-widest uppercase">Đóng hồ sơ sự cố</p>
                               </div>
                           </SCMDButton>
                           <button
                             onClick={handleRejectResolution}
                             disabled={submitting}
                             className="w-full h-12 rounded-2xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-300 uppercase tracking-widest hover:bg-red-500/10 disabled:opacity-50"
                           >
                             Reject và mở lại
                           </button>
                         </div>
                       )}
                    </div>
                  </div>
                </SCMDCard>

                {selectedIncident.assignee && (
                   <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-4 p-4 bg-scmd-cyber/5 border border-scmd-cyber/20 rounded-[28px] group"
                   >
                      <div className="w-12 h-12 rounded-2xl bg-scmd-cyber flex items-center justify-center text-scmd-navy shadow-lg shadow-scmd-cyber/20 transition-transform group-hover:rotate-6">
                         <User size={24} strokeWidth={2.5} />
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-scmd-cyber uppercase tracking-[0.2em] leading-tight mb-0.5">Nhân sự phụ trách</p>
                         <p className="text-sm font-black text-white uppercase tracking-tight">{selectedIncident.assignee.fullName}</p>
                         <p className="text-[9px] font-bold text-scmd-silver/40 uppercase">{selectedIncident.assignee.role}</p>
                      </div>
                   </motion.div>
                )}
              </motion.div>
            ) : (
              <div className="h-[500px] flex flex-col items-center justify-center text-scmd-silver/20 bg-scmd-navy/40 rounded-[48px] border-2 border-dashed border-white/5 p-8 text-center">
                 <div className="w-20 h-20 rounded-full bg-scmd-navy/50 flex items-center justify-center mb-6">
                   <MessageSquare size={32} className="opacity-20 animate-pulse" />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-scmd-silver/40 max-w-[200px]">Chọn một bản ghi để bắt đầu phối hợp tác chiến</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
