import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Grip, ShieldAlert, Users } from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard';
import { cn } from '../../../../lib/utils';

type ContractOption = {
  id: string;
  contractName?: string;
  contractCode?: string;
  siteName?: string;
  status: string;
};

type StaffOption = {
  id: string;
  fullName: string;
  role: string;
  qualifications?: string[];
  assignedVendorId?: string | null;
  assignedSiteId?: string | null;
  assignedContractId?: string | null;
  status?: string;
};

type ShiftAssignment = {
  id: string;
  staffId: string;
  notes?: string | null;
  metadata?: { warnings?: Array<{ code: string; message: string; blocking: boolean }> };
  staff: StaffOption;
};

type ShiftSchedule = {
  id: string;
  contractId: string;
  contractName: string;
  guardPostId?: string | null;
  guardPostName?: string | null;
  siteId: string;
  date: string;
  shiftType: string;
  shiftLabel: string;
  startTime: string;
  endTime: string;
  positionName: string;
  requiredCount: number;
  assignedCount: number;
  missingCount: number;
  coverageStatus: 'UNDERSTAFFED' | 'FULL';
  assignmentWarnings: Array<{ assignmentId: string; staffId: string; staffName: string; code: string; message: string; blocking: boolean }>;
  assignments: ShiftAssignment[];
  shortageViolation?: { id: string; status: string } | null;
};

const unwrapCollection = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const startOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diff);
  now.setHours(0, 0, 0, 0);
  return now;
};

interface ShiftSchedulerViewProps {
  apiBasePath?: '/api/admin' | '/api/vendor-commander';
}

export function ShiftSchedulerView({ apiBasePath = '/api/admin' }: ShiftSchedulerViewProps) {
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [guards, setGuards] = useState<StaffOption[]>([]);
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [contractId, setContractId] = useState('');
  const [dateFrom, setDateFrom] = useState(() => isoDate(startOfWeek()));
  const [dateTo, setDateTo] = useState(() => {
    const end = startOfWeek();
    end.setDate(end.getDate() + 6);
    return isoDate(end);
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draggingStaffId, setDraggingStaffId] = useState<string | null>(null);

  const activeContracts = useMemo(
    () => contracts.filter((item) => item.status === 'ACTIVE' || item.status === 'DRAFT'),
    [contracts],
  );

  const loadBaseData = async () => {
    const [contractPayload, staffPayload] = await Promise.all([
      apiFetch<any>(`${apiBasePath}/contracts?limit=200`),
      apiFetch<any>('/api/tenant/staff?limit=200&role=guard'),
    ]);

    const nextContracts = unwrapCollection<ContractOption>(contractPayload);
    setContracts(nextContracts);
    setGuards(unwrapCollection<StaffOption>(staffPayload).filter((item) => item.role === 'guard'));

    const firstContract = nextContracts[0];
    if (!contractId && firstContract) {
      setContractId(firstContract.id);
    }
  };

  const loadSchedules = async (nextContractId = contractId) => {
    if (!nextContractId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        contractId: nextContractId,
        dateFrom,
        dateTo,
      });
      const payload = await apiFetch<any>(`${apiBasePath}/shift-schedules?${params.toString()}`);
      setSchedules(Array.isArray(payload) ? payload : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData().catch(console.error);
  }, []);

  useEffect(() => {
    if (!contractId) return;
    loadSchedules().catch(console.error);
  }, [contractId, dateFrom, dateTo]);

  const groupedSchedules = useMemo(() => {
    return schedules.reduce<Record<string, ShiftSchedule[]>>((acc, schedule) => {
      acc[schedule.date] = [...(acc[schedule.date] || []), schedule];
      return acc;
    }, {});
  }, [schedules]);

  const orderedDates = useMemo(() => Object.keys(groupedSchedules).sort(), [groupedSchedules]);

  const handleGenerate = async () => {
    if (!contractId) return;
    setGenerating(true);
    try {
      await apiFetch(`${apiBasePath}/shift-schedules/generate`, {
        method: 'POST',
        body: JSON.stringify({ contractId, dateFrom, dateTo }),
      });
      await loadSchedules(contractId);
    } finally {
      setGenerating(false);
    }
  };

  const handleAssign = async (shiftScheduleId: string, staffId: string) => {
    await apiFetch(`${apiBasePath}/shift-assignments`, {
      method: 'POST',
      body: JSON.stringify({ shiftScheduleId, staffId }),
    });
    await loadSchedules(contractId);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    await apiFetch(`${apiBasePath}/shift-assignments/${assignmentId}`, {
      method: 'DELETE',
    });
    await loadSchedules(contractId);
  };

  return (
    <div className="space-y-6">
      <SCMDCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-white">Shift Scheduler cho Chỉ huy</p>
            <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
              Sinh ca từ ContractShiftRequirement, kéo guard vào chốt/ca và kiểm tra thiếu quân, scope, tiêu chuẩn.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase text-[var(--color-text-muted)]">Hợp đồng</span>
              <select value={contractId} onChange={(e) => setContractId(e.target.value)} className="min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white">
                <option value="">Chọn hợp đồng</option>
                {activeContracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.contractCode || contract.contractName || contract.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase text-[var(--color-text-muted)]">Từ ngày</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white" />
            </label>
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase text-[var(--color-text-muted)]">Đến ngày</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white" />
            </label>
            <SCMDButton onClick={handleGenerate} isLoading={generating} className="min-h-12 !rounded-xl !bg-[#2563EB]">
              Generate ca
            </SCMDButton>
          </div>
        </div>
      </SCMDCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SCMDCard className="p-5">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-[#93C5FD]" />
            <div>
              <p className="text-sm font-black uppercase text-white">Guard Pool</p>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Kéo guard vào card ca trực phù hợp.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {guards.map((guard) => (
              <button
                key={guard.id}
                type="button"
                draggable
                onDragStart={() => setDraggingStaffId(guard.id)}
                onDragEnd={() => setDraggingStaffId(null)}
                className={cn(
                  'w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-[#2563EB]/40 hover:bg-[#2563EB]/5',
                  draggingStaffId === guard.id && 'border-[#2563EB]/60 bg-[#2563EB]/10'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase text-white">{guard.fullName}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-[var(--color-text-muted)]">{guard.assignedContractId || guard.assignedSiteId || 'Scope theo vendor'}</p>
                  </div>
                  <Grip size={16} className="text-[#93C5FD]" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(guard.qualifications || []).slice(0, 3).map((qualification) => (
                    <span key={qualification} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-300">
                      {qualification}
                    </span>
                  ))}
                  {(guard.qualifications || []).length === 0 && (
                    <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase text-amber-300">
                      Chưa khai báo qualification
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </SCMDCard>

        <SCMDCard className="p-5">
          <div className="flex items-center gap-3">
            <CalendarDays size={18} className="text-[#93C5FD]" />
            <div>
              <p className="text-sm font-black uppercase text-white">Calendar View</p>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Mỗi card là một requirement chốt/ca được sinh từ hợp đồng.</p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm font-bold text-[var(--color-text-secondary)]">Đang tải lịch ca...</div>
          ) : orderedDates.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-black uppercase text-white">Chưa có ShiftSchedule</p>
              <p className="mt-2 text-xs font-semibold text-[var(--color-text-secondary)]">Bấm Generate ca để sinh lịch từ ContractShiftRequirement.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <div className="grid min-w-[960px] grid-cols-1 gap-4 lg:grid-cols-3">
                {orderedDates.map((date) => (
                  <div key={date} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black uppercase text-white">{date}</p>
                        <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">{groupedSchedules[date]?.length || 0} ca trực</p>
                      </div>
                      <span className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/10 px-2 py-1 text-[10px] font-black uppercase text-[#93C5FD]">
                        {contracts.find((item) => item.id === contractId)?.contractCode || 'Contract'}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {(groupedSchedules[date] ?? []).map((schedule) => {
                        const scheduleStart = new Date(`${schedule.date}T${schedule.startTime}:00`);
                        const isOverdue = scheduleStart.getTime() < Date.now() && schedule.missingCount > 0;
                        return (
                          <div
                            key={schedule.id}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={async (event) => {
                              event.preventDefault();
                              const staffId = draggingStaffId || event.dataTransfer.getData('text/plain');
                              if (!staffId) return;
                              await handleAssign(schedule.id, staffId);
                              setDraggingStaffId(null);
                            }}
                            className={cn(
                              'rounded-2xl border p-4 transition',
                              schedule.coverageStatus === 'FULL'
                                ? 'border-emerald-500/20 bg-emerald-500/5'
                                : 'border-amber-500/20 bg-amber-500/5'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black uppercase text-white">{schedule.guardPostName || schedule.positionName}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase text-[var(--color-text-muted)]">{schedule.shiftLabel} • {schedule.startTime} - {schedule.endTime}</p>
                              </div>
                              <div className={cn(
                                'rounded-lg px-2 py-1 text-[10px] font-black uppercase',
                                schedule.missingCount > 0 ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'
                              )}>
                                {schedule.assignedCount}/{schedule.requiredCount}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {schedule.missingCount > 0 && (
                                <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase text-amber-300">
                                  Thiếu {schedule.missingCount} người
                                </span>
                              )}
                              {isOverdue && (
                                <span className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase text-red-300">
                                  Quá giờ chưa đủ quân
                                </span>
                              )}
                              {schedule.shortageViolation && (
                                <span className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase text-red-300">
                                  Violation {schedule.shortageViolation.status}
                                </span>
                              )}
                            </div>

                            <div className="mt-4 space-y-2">
                              {schedule.assignments.map((assignment) => (
                                <div key={assignment.id} className="rounded-xl border border-white/10 bg-[#0D1324]/70 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-black text-white">{assignment.staff.fullName}</p>
                                      <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">{(assignment.staff.qualifications || []).join(', ') || 'Chưa có qualification'}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAssignment(assignment.id)}
                                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase text-red-300"
                                    >
                                      Gỡ
                                    </button>
                                  </div>
                                  {(assignment.metadata?.warnings || []).length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {(assignment.metadata?.warnings || []).map((warning) => (
                                        <div key={`${assignment.id}-${warning.code}`} className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-xs font-semibold text-amber-200">
                                          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                                          <span>{warning.message}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {schedule.assignmentWarnings.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {schedule.assignmentWarnings.map((warning) => (
                                  <div key={`${schedule.id}-${warning.assignmentId}-${warning.code}`} className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-xs font-semibold text-amber-200">
                                    <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                                    <span>{warning.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SCMDCard>
      </div>
    </div>
  );
}

export default ShiftSchedulerView;
