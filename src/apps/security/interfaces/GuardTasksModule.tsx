import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Calendar,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string | null;
  createdAt: string;
}

export const GuardTasksModule: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('PENDING');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchTasks();
  }, []);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Assuming the backend filters tasks by the current logged-in user
      const data = await apiFetch<Task[]>('/api/tenant/tasks');
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'IN_PROGRESS' | 'COMPLETED') => {
    setUpdatingId(id);
    try {
      await apiFetch(`/api/tenant/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      // Update local state
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Error updating task status', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return task.status !== 'COMPLETED';
    return task.status === 'COMPLETED';
  });

  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'COMPLETED') return false;
    return new Date(task.dueDate) < new Date();
  };

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const pagedTasks = filteredTasks.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-scmd-primary" size={32} />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Đang tải danh sách công việc...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-6 pb-20"
    >
      <header className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter ">DANH SÁCH CÔNG VIỆC</h1>
          <p className="text-scmd-silver/60 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
            Quản lý và thực hiện nhiệm vụ được giao
          </p>
        </div>
        <div className="w-12 h-12 rounded-scmd-md bg-scmd-primary/10 flex items-center justify-center text-scmd-primary border border-scmd-primary/20 shadow-scmd-lg">
          <ClipboardList size={24} />
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex bg-scmd-slate/50 p-1.5 rounded-scmd-lg border border-white/5 shadow-2xl backdrop-blur-md">
        {(['PENDING', 'COMPLETED', 'ALL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 py-3 px-2 rounded-scmd-md text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
              filter === f ? "bg-scmd-primary text-white shadow-xl shadow-scmd-primary/20" : "text-slate-500 hover:text-slate-300 opacity-60"
            )}
          >
            {f === 'PENDING' ? 'Cần làm' : f === 'COMPLETED' ? 'Đã xong' : 'Tất cả'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {pagedTasks.length > 0 ? (
          pagedTasks.map((task) => (
            <SCMDCard 
              key={task.id}
              className={cn(
                "p-5 border-2 transition-all duration-500 rounded-scmd-xl overflow-hidden relative group",
                task.status === 'COMPLETED' ? "border-emerald-500/10 bg-emerald-500/5 opacity-70" : 
                isTaskOverdue(task) ? "border-scmd-error/30 bg-scmd-error/5" :
                "border-white/5 bg-scmd-slate/40 hover:border-scmd-primary/30"
              )}
            >
              {isTaskOverdue(task) && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-scmd-error text-white text-[8px] font-black uppercase tracking-widest rounded-bl-scmd-md z-10 animate-pulse">
                  QUÁ HẠN
                </div>
              )}
              <div className="flex gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-scmd-md flex items-center justify-center shrink-0 border transition-all duration-500",
                  task.status === 'COMPLETED' 
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500" 
                    : task.priority === 'HIGH'
                    ? "bg-scmd-error/20 border-scmd-error/30 text-scmd-error animate-pulse"
                    : "bg-scmd-navy border-white/5 text-slate-500 shadow-inner"
                )}>
                  {task.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : <Clock size={24} className={task.priority === 'HIGH' ? "animate-spin-slow" : ""} />}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className={cn(
                      "font-black text-lg transition-all duration-500 leading-tight uppercase  tracking-tighter",
                      task.status === 'COMPLETED' ? "text-slate-600 line-through" : "text-white group-hover:text-scmd-primary"
                    )}>
                      {task.title}
                    </h3>
                    <div className={cn(
                      "px-2 py-0.5 rounded-scmd-sm text-[8px] font-black uppercase tracking-widest",
                      task.priority === 'HIGH' ? "bg-scmd-error/10 text-scmd-error border border-scmd-error/20" :
                      task.priority === 'MEDIUM' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                      "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                    )}>
                      {task.priority}
                    </div>
                  </div>
                  
                  {task.description && (
                    <p className="text-xs text-slate-400 font-medium line-clamp-2  opacity-80 leading-relaxed uppercase text-[10px]">
                      "{task.description}"
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 pt-3 border-t border-white/5 mt-2">
                    <div className={cn(
                      "flex items-center gap-1.5 transition-all",
                      isTaskOverdue(task) ? "text-scmd-error animate-pulse" : "grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100"
                    )}>
                      <Calendar size={12} className={cn("text-scmd-primary", isTaskOverdue(task) && "text-scmd-error")} />
                      Hạn: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '---'}
                    </div>
                  </div>
                </div>
              </div>

              {task.status !== 'COMPLETED' && (
                <div className="flex gap-3 mt-6">
                  {task.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                      disabled={updatingId === task.id}
                      className="flex-1 py-4 bg-scmd-navy hover:bg-slate-800 text-white rounded-scmd-md text-[9px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 flex items-center justify-center gap-2 group/btn active:scale-95"
                    >
                      {updatingId === task.id ? <Loader2 className="animate-spin" size={14} /> : <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />}
                      Bắt đầu làm
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                    disabled={updatingId === task.id}
                    className="flex-[2] py-4 bg-scmd-primary text-white hover:scale-[1.02] active:scale-95 rounded-scmd-md text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-scmd-primary/20 flex items-center justify-center gap-2 hover:bg-scmd-accent"
                  >
                    {updatingId === task.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                    Xác nhận hoàn tất
                  </button>
                </div>
              )}
            </SCMDCard>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-900 rounded-[32px] flex items-center justify-center text-slate-800 border border-slate-800">
              <ClipboardList size={40} />
            </div>
            <div>
              <h3 className="text-white font-black uppercase ">Không có công việc</h3>
              <p className="text-slate-500 text-xs font-medium max-w-xs mt-1">
                Hiện tại bạn không có công việc nào trong danh sách này.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4 bg-scmd-slate/30 rounded-scmd-lg border border-white/5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-10 h-10 flex items-center justify-center rounded-scmd-md bg-white/5 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/5"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-scmd-primary leading-none uppercase tracking-widest">TRANG {page}</span>
            <span className="text-[10px] font-black text-slate-500 leading-none">/</span>
            <span className="text-[10px] font-black text-slate-500 leading-none uppercase tracking-widest">{totalPages}</span>
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-10 h-10 flex items-center justify-center rounded-scmd-md bg-white/5 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/5"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </motion.div>
  );
};
