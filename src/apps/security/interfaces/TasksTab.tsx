import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ListTodo, ShieldAlert, Search, 
  User, Calendar, Clock, CheckCircle2, MessageSquare, 
  Paperclip, Send, ChevronRight, X,
  Plus, Trash2, UserPlus
} from "lucide-react";
import { apiFetch } from "../../../lib/api";
import { cn } from "../../../lib/utils";
import {
  DashboardMetricCard,
  DashboardMetricGrid,
  DashboardPageHeader,
  DashboardToolbarRow,
  dashboardInputClass,
  dashboardSelectClass,
} from "../../common/interfaces/components/DashboardUI";
import { 
  opsTableClass, opsThClass, opsTdClass, opsRowClass, 
  OpsStatusBadge, OpsIconButton 
} from "./components/OpsTableSystem";
import { SCMDButton } from "../../common/interfaces/components/SCMDButton";

interface TasksTabProps {
  embedded?: boolean;
}

type TaskRecord = {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "REVIEW";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assignee?: { id: string; fullName: string; avatar?: string };
  dueDate: string;
  origin?: { type: string; id: string; label: string };
  createdAt: string;
};

export const TasksTab: React.FC<TasksTabProps> = ({ embedded = false }) => {
  const [taskRows, setTaskRows] = useState<TaskRecord[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<any>("/api/tenant/tasks?limit=200")
      .then((result) => {
        if (!active) return;
        const data = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : [];
        setTaskRows(data);
      })
      .catch(() => {
        if (active) setTaskRows([]);
      })
      .finally(() => setLoading(false));
    return () => { active = false; };
  }, []);

  const metrics = useMemo(() => {
    const now = new Date().getTime();
    const open = taskRows.filter(t => t.status !== "DONE").length;
    const overdue = taskRows.filter(t => t.status !== "DONE" && new Date(t.dueDate).getTime() < now).length;
    const unassigned = taskRows.filter(t => !t.assignee).length;
    const dueToday = taskRows.filter(t => t.status !== "DONE" && new Date(t.dueDate).toDateString() === new Date().toDateString()).length;
    return { open, overdue, unassigned, dueToday };
  }, [taskRows]);

  const openTaskDetail = (task: TaskRecord) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskRecord["status"]) => {
    const previousRows = [...taskRows];
    // Optimistic Update: Cập nhật UI ngay lập tức
    setTaskRows(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await apiFetch(`/api/tenant/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      // Rollback nếu có lỗi
      setTaskRows(previousRows);
    }
  };

  const isOverdue = (date: string) => new Date(date).getTime() < new Date().getTime();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {/* Khu vực 1: Top Bar - Unified Filter */}
      {!embedded && (
        <DashboardPageHeader
          title="Quản lý Nhiệm vụ"
          eyebrow="Task Operations"
          description="Phân công và giám sát đầu việc phát sinh từ sự cố hiện trường và đối soát SLA."
          actions={
            <SCMDButton className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20">
              <Plus size={16} /> <span className="ml-2 font-black uppercase tracking-widest text-[11px]">Tạo nhiệm vụ</span>
            </SCMDButton>
          }
        />
      )}

      <DashboardToolbarRow>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input placeholder="Tìm tên hoặc mã nhiệm vụ..." className={cn(dashboardInputClass, "pl-9")} />
          </div>
          <select className={cn(dashboardSelectClass, "w-40")}>
            <option value="all">Mọi trạng thái</option>
            <option value="TODO">Việc cần làm</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="REVIEW">Chờ duyệt</option>
          </select>
          <select className={cn(dashboardSelectClass, "w-40")}>
            <option value="all">Độ ưu tiên</option>
            <option value="CRITICAL">Nguy cấp</option>
            <option value="HIGH">Cao</option>
          </select>
          <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
             <input type="date" className={cn(dashboardInputClass, "pl-9 w-40")} />
          </div>
        </div>
      </DashboardToolbarRow>

      {/* Khu vực 2: Actionable KPIs */}
      <DashboardMetricGrid className="md:grid-cols-4">
        <DashboardMetricCard 
          label="Quá hạn" 
          value={metrics.overdue} 
          tone={metrics.overdue > 0 ? "danger" : "default"} 
          icon={<ShieldAlert size={18} />} 
        />
        <DashboardMetricCard 
          label="Hạn hôm nay" 
          value={metrics.dueToday} 
          tone={metrics.dueToday > 0 ? "warning" : "default"} 
          icon={<Clock size={18} />} 
        />
        <DashboardMetricCard 
          label="Chưa phân công" 
          value={metrics.unassigned} 
          tone="primary" 
          icon={<User size={18} />} 
        />
        <DashboardMetricCard 
          label="Đang mở" 
          value={metrics.open} 
          icon={<ListTodo size={18} />} 
        />
      </DashboardMetricGrid>

      {/* Khu vực 3: Main Data Table */}
      <section className="rounded-2xl border border-white/5 bg-slate-900/20 overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className={cn(opsTableClass, "w-full")}>
            <thead className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md">
              <tr>
                <th className={cn(opsThClass, "w-10")}>
                  <input 
                    type="checkbox" 
                    className="rounded border-white/10 bg-slate-950" 
                    onChange={(e) => setSelectedIds(e.target.checked ? taskRows.map(t => t.id) : [])}
                  />
                </th>
                <th className={opsThClass}>Mức độ</th>
                <th className={opsThClass}>Nhiệm vụ</th>
                <th className={opsThClass}>Phụ trách</th>
                <th className={opsThClass}>Hạn chót</th>
                <th className={opsThClass}>Trạng thái</th>
                <th className={cn(opsThClass, "text-right")}>Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {taskRows.map(task => (
                <tr key={task.id} className={cn(opsRowClass, "cursor-pointer group")} onClick={() => openTaskDetail(task)}>
                  <td className={opsTdClass} onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(task.id)} 
                      onChange={() => setSelectedIds(prev => prev.includes(task.id) ? prev.filter(i => i !== task.id) : [...prev, task.id])}
                      className="rounded border-white/10 bg-slate-950" 
                    />
                  </td>
                  <td className={opsTdClass}><OpsStatusBadge value={task.priority} /></td>
                  <td className={opsTdClass}>
                    <div className="flex items-center gap-2">
                      {isOverdue(task.dueDate) && task.status !== "DONE" && <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />}
                      <span className="font-bold text-slate-200">{task.title}</span>
                    </div>
                    {task.origin && <p className="text-[10px] text-slate-500 uppercase mt-0.5 tracking-wider">{task.origin.label}</p>}
                  </td>
                  <td className={opsTdClass} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 hover:bg-white/5 p-1 rounded-lg transition-colors cursor-default">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white border border-white/10">
                        {task.assignee?.fullName.charAt(0) || <User size={12}/>}
                      </div>
                      <span className="text-[12px] font-medium text-slate-300">{task.assignee?.fullName || "Chưa giao"}</span>
                    </div>
                  </td>
                  <td className={cn(opsTdClass, "font-mono text-[11px]", isOverdue(task.dueDate) && task.status !== "DONE" ? "text-red-400 font-bold" : "text-slate-400")}>
                    {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                  </td>
                  <td className={opsTdClass} onClick={(e) => e.stopPropagation()}>
                     {/* Inline Editing Status */}
                     <select 
                        className="bg-transparent border-none text-[11px] font-black uppercase text-blue-400 cursor-pointer focus:ring-0 p-0"
                        value={task.status}
                        onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as any)}
                      >
                        <option value="TODO">Cần làm</option>
                        <option value="IN_PROGRESS">Đang làm</option>
                        <option value="REVIEW">Đợi duyệt</option>
                        <option value="DONE">Xong</option>
                     </select>
                  </td>
                  <td className={cn(opsTdClass, "text-right")}>
                    <OpsIconButton label="Chi tiết" onClick={() => openTaskDetail(task)}><ChevronRight size={14} /></OpsIconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-blue-600 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-blue-400">
              <span className="text-white text-xs font-black uppercase tracking-widest">{selectedIds.length} việc đã chọn</span>
              <div className="flex gap-2 border-l border-white/20 pl-6">
                <button className="flex items-center gap-2 text-white text-[11px] font-black uppercase hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all"><UserPlus size={14}/> Giao việc</button>
                <button className="flex items-center gap-2 text-white text-[11px] font-black uppercase hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all"><CheckCircle2 size={14}/> Hoàn tất</button>
                <button className="flex items-center gap-2 text-red-100 text-[11px] font-black uppercase hover:bg-red-500 px-3 py-1.5 rounded-lg transition-all"><Trash2 size={14}/> Xóa</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Right-side Detail Drawer (Master-Detail Flow) */}
      <AnimatePresence>
        {isDrawerOpen && selectedTask && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) setIsDrawerOpen(false);
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="relative flex h-full w-full sm:max-w-2xl flex-col bg-scmd-navy border-l border-white/10 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 p-6 shrink-0">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                    <OpsStatusBadge value={selectedTask.priority} /> {selectedTask.title}
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Mã định danh: #{selectedTask.id.slice(0,8)}</p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-all"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                 <div className="p-8 space-y-10">
                    {/* Section: Core Info */}
                    <section className="space-y-6">
                       <div className="grid grid-cols-2 gap-8">
                          <div>
                             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Hạn hoàn thành</p>
                             <div className={cn("flex items-center gap-2 text-sm font-bold", isOverdue(selectedTask.dueDate) ? "text-red-400" : "text-white")}>
                                <Calendar size={16}/> {new Date(selectedTask.dueDate).toLocaleDateString('vi-VN')}
                             </div>
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Người phụ trách</p>
                             <div className="flex items-center gap-2 text-sm font-bold text-white">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">{selectedTask.assignee?.fullName.charAt(0)}</div>
                                {selectedTask.assignee?.fullName || "Chưa giao"}
                             </div>
                          </div>
                       </div>

                       <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Mô tả nhiệm vụ</p>
                          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-slate-300 leading-relaxed">
                             {selectedTask.description || "Không có mô tả chi tiết."}
                          </div>
                       </div>
                    </section>

                    {/* Section: Activity Stream */}
                    <section className="space-y-4">
                       <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <MessageSquare size={14}/> Luồng hoạt động & Thảo luận
                       </h3>
                       <div className="space-y-4 border-l-2 border-white/5 ml-2 pl-6">
                          <div className="relative">
                             <div className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-scmd-navy" />
                             <p className="text-[11px] font-bold text-slate-300">Hệ thống <span className="font-normal text-slate-500 ml-2">đã tạo nhiệm vụ từ Sự cố #INC-8291</span></p>
                             <p className="text-[10px] text-slate-600 mt-0.5">14:20 - 20/05/2024</p>
                          </div>
                          <div className="relative">
                             <div className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-slate-700 ring-4 ring-scmd-navy" />
                             <p className="text-[11px] font-bold text-white">Trần Văn Tùng <span className="font-normal text-slate-400 ml-2">đã đính kèm báo cáo hiện trường.</span></p>
                             <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5 w-fit">
                                <Paperclip size={12} className="text-slate-500"/>
                                <span className="text-[10px] text-blue-400 font-bold">bien_ban_ban_giao.pdf</span>
                             </div>
                             <p className="text-[10px] text-slate-600 mt-1">15:45 - 20/05/2024</p>
                          </div>
                       </div>
                    </section>
                 </div>
              </div>

              {/* Drawer Footer - Chat Input */}
              <div className="p-6 bg-slate-900/50 border-t border-white/10 flex gap-3">
                 <input className="flex-1 h-12 bg-slate-950 border border-white/10 rounded-xl px-4 text-sm text-white focus:border-blue-500 outline-none" placeholder="Nhập tin nhắn hoặc chỉ thị..." />
                 <SCMDButton className="h-12 w-12 rounded-xl p-0 flex items-center justify-center bg-blue-600"><Send size={18}/></SCMDButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
