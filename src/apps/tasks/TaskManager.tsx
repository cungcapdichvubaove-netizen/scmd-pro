import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User as UserIcon,
  Search,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  X,
  ClipboardList
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { SCMDCard } from '../common/interfaces/components/SCMDCard';
import { SCMDButton } from '../common/interfaces/components/SCMDButton';
import { SCMDInput } from '../common/interfaces/components/SCMDInput';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string | null;
  assigneeId: string | null;
  createdAt: string;
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'PENDING',
    priority: 'MEDIUM',
    dueDate: '',
    assigneeId: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const data = await apiFetch<any>('/api/tenant/staff');
      if (Array.isArray(data)) {
        setStaffList(data);
      } else if (data && Array.isArray(data.data)) {
        setStaffList(data.data);
      } else {
        setStaffList([]);
      }
    } catch (error) {
      console.error('Error fetching staff', error);
      setStaffList([]);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Task[]>('/api/tenant/tasks');
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (task?: Task) => {
    if (task) {
      const t = task as Task;
      setEditingTask(t);
      setFormData({
        title: t.title || '',
        description: t.description || '',
        status: t.status || 'PENDING',
        priority: t.priority || 'MEDIUM',
        dueDate: t.dueDate ? (String(t.dueDate).split('T')[0] || '') : '',
        assigneeId: t.assigneeId || '',
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        status: 'PENDING',
        priority: 'MEDIUM',
        dueDate: '',
        assigneeId: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      };

      if (editingTask) {
        await apiFetch(`/api/tenant/tasks/${editingTask.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/tenant/tasks', { method: 'POST', body: JSON.stringify(payload) });
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (error) {
      console.error('Error saving task', error);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Bạn có chắc muốn xoá công việc "${title}"?`)) {
      try {
        await apiFetch(`/api/tenant/tasks/${id}`, { method: 'DELETE' });
        fetchTasks();
      } catch (error) {
        console.error('Error deleting task', error);
      }
    }
  };

  const sortedTasks = useMemo(() => {
    const filtered = tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'priority') {
        const priorityScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        comparison = priorityScore[a.priority] - priorityScore[b.priority];
      } else if (sortBy === 'dueDate') {
        if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [tasks, searchQuery, statusFilter, sortBy, sortOrder]);

  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'COMPLETED') return false;
    return new Date(task.dueDate) < new Date();
  };

  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
  const pagedTasks = useMemo(() => {
    return sortedTasks.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [sortedTasks, page]);

  // Reset page when filter or sort changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-scmd-navy/80 p-8 rounded-scmd-xl border border-white/5 backdrop-blur-xl shadow-scmd-deep relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-scmd-primary" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-scmd-primary/10 rounded-scmd-md text-scmd-primary">
              <ClipboardList size={24} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase ">Trung tâm Giao việc</h1>
          </div>
          <p className="text-scmd-silver/60 text-xs font-bold uppercase tracking-wider max-w-md">Quản lý, phân công và giám sát tiến độ thực hiện nhiệm vụ an ninh.</p>
        </div>
        <SCMDButton 
          onClick={() => handleOpenModal()} 
          variant="primary" 
          className="h-14 px-8 bg-scmd-primary text-white font-black shadow-scmd-glow hover:scale-105 transition-all group rounded-scmd-md"
        >
          <Plus size={20} className="stroke-[3] transition-transform group-hover:rotate-90" /> 
          <span className="tracking-[0.1em]">TẠO NHIỆM VỤ MỚI</span>
        </SCMDButton>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-scmd-silver/30 group-focus-within:text-scmd-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm nhiệm vụ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-14 pr-6 bg-scmd-navy/40 border border-white/5 rounded-scmd-md text-scmd-silver font-bold focus:outline-none focus:border-scmd-primary/50 transition-all placeholder:text-scmd-silver/20 text-sm"
          />
        </div>
        
        <div className="flex flex-wrap md:flex-nowrap gap-3">
          {/* Sorting UI */}
          <div className="flex bg-scmd-navy/40 p-1 rounded-scmd-md border border-white/5">
            <div className="flex items-center px-3 border-r border-white/5">
              <ArrowUpDown size={14} className="text-scmd-silver/40" />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-[10px] font-black text-scmd-silver/60 uppercase tracking-widest px-3 focus:outline-none cursor-pointer hover:text-white transition-colors font-mono"
            >
              <option value="createdAt" className="bg-scmd-navy">Ngày tạo</option>
              <option value="dueDate" className="bg-scmd-navy">Thời hạn</option>
              <option value="priority" className="bg-scmd-navy">Ưu tiên</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 text-scmd-primary hover:bg-white/5 rounded-scmd-sm transition-all"
            >
              {sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
            </button>
          </div>

          <div className="flex bg-scmd-navy/40 p-1 rounded-scmd-md border border-white/5">
            {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-4 py-2 rounded-scmd-sm text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  statusFilter === s ? "bg-scmd-primary text-white shadow-scmd-glow" : "text-scmd-silver/40 hover:text-scmd-silver/80"
                )}
              >
                {s === 'ALL' ? 'Tất cả' : s === 'PENDING' ? 'Chờ' : s === 'IN_PROGRESS' ? 'Làm' : 'Xong'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-10 h-10 border-4 border-scmd-cyber border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,242,255,0.3)]" />
          <p className="text-scmd-silver/40 font-black uppercase tracking-[0.2em] text-xs">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {pagedTasks.map((task, idx) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: (idx % itemsPerPage) * 0.05 }}
              >
                <SCMDCard 
                  className={cn(
                    "p-5 h-full flex flex-col border border-white/5 transition-all duration-300 group bg-scmd-navy/80 relative overflow-hidden rounded-3xl",
                    task.status === 'COMPLETED' ? "opacity-60 grayscale-[0.3]" : 
                    isTaskOverdue(task) ? "border-scmd-error/30 bg-scmd-error/5 shadow-lg shadow-scmd-error/5" :
                    "hover:border-scmd-primary/30 hover:bg-scmd-navy hover:shadow-2xl"
                  )}
                >
                  {isTaskOverdue(task) && (
                    <div className="absolute top-0 left-0 w-full bg-scmd-error/80 text-white text-[8px] font-black uppercase tracking-[0.3em] py-1 text-center z-10 animate-pulse">
                      NHIỆM VỤ QUÁ HẠN
                    </div>
                  )}
                  {/* Priority Indicator Dot */}
                  <div className={cn(
                    "absolute top-0 right-0 w-12 h-12 -mr-6 -mt-6 rotate-45",
                    task.priority === 'HIGH' ? "bg-scmd-error/20" :
                    task.priority === 'MEDIUM' ? "bg-amber-500/20" : "bg-scmd-primary/20"
                  )} />

                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-wrap gap-2">
                      <div className={cn(
                        "px-2 py-0.5 rounded-scmd-sm text-[7px] font-black uppercase tracking-widest border flex items-center gap-1",
                        task.priority === 'HIGH' ? "bg-scmd-error/10 text-scmd-error border-scmd-error/20" :
                        task.priority === 'MEDIUM' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        "bg-scmd-primary/10 text-scmd-primary border-scmd-primary/20"
                      )}>
                        {task.priority === 'HIGH' && <AlertCircle size={8} />}
                        {task.priority}
                      </div>

                      {task.dueDate && (
                        <div className={cn(
                          "px-2 py-0.5 rounded-scmd-sm text-[7px] font-black uppercase tracking-widest border flex items-center gap-1 font-mono",
                          isTaskOverdue(task) ? "bg-scmd-error/20 text-scmd-error border-scmd-error/30" : "bg-white/5 text-scmd-silver/40 border-white/5"
                        )}>
                          <Clock size={8} className={isTaskOverdue(task) ? "animate-pulse" : ""} />
                          {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenModal(task)} className="p-1.5 bg-white/5 text-scmd-silver/40 hover:text-white rounded-scmd-sm transition-all border border-white/5">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => handleDelete(task.id, task.title)} className="p-1.5 bg-scmd-error/10 text-scmd-error hover:bg-scmd-error hover:text-white rounded-scmd-sm transition-all border border-scmd-error/10">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <h3 className={cn(
                    "text-lg font-black mb-1.5 tracking-tight transition-all uppercase",
                    task.status === 'COMPLETED' ? "text-scmd-silver/40 line-through" : "text-white group-hover:text-scmd-primary"
                  )}>
                    {task.title}
                  </h3>
                  
                  {task.description && (
                    <p className="text-scmd-silver/40 text-xs font-medium line-clamp-2 mb-4 flex-1">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-auto space-y-3 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-scmd-navy border border-white/5 rounded-scmd-sm flex items-center justify-center text-scmd-silver/40 transition-colors group-hover:bg-scmd-primary/20 group-hover:text-scmd-primary">
                          <UserIcon size={12} />
                        </div>
                        <span className="text-[9px] font-black text-scmd-silver/60 uppercase tracking-widest truncate max-w-[120px]">
                          {staffList.find(s => s.id === task.assigneeId)?.fullName || 'Chưa phân công'}
                        </span>
                      </div>

                      <div className={cn(
                        "px-3 py-1 rounded-scmd-sm flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.15em] transition-all border font-mono",
                        task.status === 'COMPLETED' 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : task.status === 'IN_PROGRESS'
                            ? "bg-scmd-cyber/10 text-scmd-cyber border-scmd-cyber/20"
                            : "bg-white/5 text-scmd-silver/30 border-white/5"
                      )}>
                        {task.status === 'COMPLETED' ? (
                          <><CheckCircle size={10} /> HOÀN TẤT</>
                        ) : task.status === 'IN_PROGRESS' ? (
                          <><Clock size={10} className="animate-pulse" /> ĐANG LÀM</>
                        ) : (
                          <><AlertCircle size={10} /> ĐANG CHỜ</>
                        )}
                      </div>
                    </div>
                  </div>
                </SCMDCard>
              </motion.div>
            ))}
          </AnimatePresence>

          {sortedTasks.length === 0 && (
            <div className="col-span-full py-24 text-center space-y-6 bg-scmd-navy/20 rounded-[48px] border-2 border-dashed border-white/5">
              <div className="w-20 h-20 bg-scmd-navy rounded-[32px] flex items-center justify-center mx-auto text-scmd-silver/10">
                <ClipboardList size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white  uppercase tracking-tighter">Không tìm thấy nhiệm vụ</h3>
                <p className="text-scmd-silver/40 font-medium max-w-sm mx-auto text-xs">
                  Hãy thử thay đổi tiêu chí sắp xếp hoặc tìm kiếm.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 bg-scmd-navy/50 p-4 rounded-scmd-lg border border-white/5 backdrop-blur-xl">
            <p className="text-[10px] font-black text-scmd-silver/30 uppercase tracking-widest ml-4">
              Hiển thị <span className="text-scmd-primary">{pagedTasks.length}</span> / {sortedTasks.length} nhiệm vụ
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-10 h-10 flex items-center justify-center rounded-scmd-md bg-white/5 border border-white/5 text-scmd-silver/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1 font-mono">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isVisible = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
                  if (!isVisible) {
                    if (p === 2 || p === totalPages - 1) return <span key={p} className="px-1 text-white/10">...</span>;
                    return null;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "w-9 h-9 rounded-scmd-md text-[9px] font-black transition-all border",
                        page === p 
                          ? "bg-scmd-primary text-white border-scmd-primary shadow-scmd-glow" 
                          : "text-scmd-silver/40 border-white/5 hover:bg-white/5"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-scmd-md bg-white/5 border border-white/5 text-scmd-silver/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Modal Tooltip-style Thêm/Sửa */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-scmd-navy/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-scmd-navy border border-white/10 rounded-scmd-xl shadow-scmd-deep overflow-hidden"
            >
              <div className="bg-white/5 p-8 border-b border-white/5 flex justify-between items-center relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-scmd-primary" />
                <h3 className="text-xl font-black text-white tracking-widest uppercase ">
                  {editingTask ? 'Cập nhật nhiệm vụ' : 'Thiết lập nhiệm vụ mới'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2.5 bg-white/5 text-scmd-silver/40 hover:text-white rounded-scmd-md transition-all border border-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6 md:col-span-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-scmd-silver/30 uppercase tracking-widest ml-1">Tiêu đề nhiệm vụ</label>
                      <SCMDInput 
                        required 
                        value={formData.title} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, title: e.target.value})} 
                        placeholder="VD: Kiểm tra trạm điện khu B..."
                        className="h-12 border-white/10 bg-white/5 rounded-scmd-md text-white font-bold"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-scmd-silver/30 uppercase tracking-widest ml-1">Mô tả chi tiết</label>
                      <textarea 
                        value={formData.description} 
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, description: e.target.value})} 
                        className="w-full bg-white/5 border border-white/10 rounded-scmd-md p-5 text-sm text-white font-medium h-28 focus:outline-none focus:border-scmd-primary/50 transition-all placeholder:text-scmd-silver/10"
                        placeholder="Nội dung cụ thể cần thực hiện..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-scmd-silver/30 uppercase tracking-widest ml-1">Độ ưu tiên</label>
                    <div className="relative">
                      <select 
                        value={formData.priority} 
                        onChange={e => setFormData({...formData, priority: e.target.value as any})}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-scmd-md px-5 text-xs text-white font-black uppercase tracking-widest appearance-none focus:outline-none focus:border-scmd-primary/50 transition-all cursor-pointer font-mono"
                      >
                        <option value="LOW" className="bg-scmd-navy">Thấp (Low)</option>
                        <option value="MEDIUM" className="bg-scmd-navy">Trung bình (Medium)</option>
                        <option value="HIGH" className="bg-scmd-navy">Cao (High)</option>
                      </select>
                      <ArrowUpDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={12} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-scmd-silver/30 uppercase tracking-widest ml-1">Nhân viên phụ trách</label>
                    <div className="relative">
                      <select 
                        value={formData.assigneeId} 
                        onChange={e => setFormData({...formData, assigneeId: e.target.value})}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-scmd-md px-5 text-xs text-white font-black uppercase tracking-widest appearance-none focus:outline-none focus:border-scmd-primary/50 transition-all cursor-pointer"
                      >
                        <option value="" className="bg-scmd-navy">-- Tự do (First-come) --</option>
                        {Array.isArray(staffList) && staffList.map(staff => (
                          <option key={staff.id} value={staff.id} className="bg-scmd-navy">{staff.fullName}</option>
                        ))}
                      </select>
                      <ArrowUpDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={12} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-scmd-silver/30 uppercase tracking-widest ml-1">Thời hạn hoàn tất</label>
                    <input 
                      type="date"
                      value={formData.dueDate} 
                      onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-scmd-md px-5 text-xs text-white font-black focus:outline-none focus:border-scmd-primary/50 transition-all font-mono uppercase"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-scmd-silver/30 uppercase tracking-widest ml-1">Trạng thái</label>
                    <div className="relative">
                      <select 
                        value={formData.status} 
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-scmd-md px-5 text-xs text-scmd-primary font-black uppercase tracking-widest appearance-none focus:outline-none focus:border-scmd-primary/50 transition-all cursor-pointer font-mono"
                      >
                        <option value="PENDING" className="bg-scmd-navy font-black">Chờ thực hiện</option>
                        <option value="IN_PROGRESS" className="bg-scmd-navy font-black">Đang làm</option>
                        <option value="COMPLETED" className="bg-scmd-navy font-black">Hoàn tất</option>
                      </select>
                      <ArrowUpDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={12} />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 h-12 bg-white/5 text-scmd-silver/40 font-black rounded-scmd-md hover:text-white transition-all uppercase tracking-widest text-[10px] border border-white/5"
                  >
                    Hủy bỏ
                  </button>
                  <SCMDButton 
                    type="submit" 
                    className="flex-[2] h-12 bg-scmd-primary text-white font-black rounded-scmd-md shadow-scmd-glow hover:scale-[1.02] active:scale-95 transition-all text-[10px] tracking-[0.2em]"
                  >
                    {editingTask ? 'XÁC NHẬN CẬP NHẬT' : 'PHÁT HÀNH NHIỆM VỤ'}
                  </SCMDButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
