import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  File, 
  Upload, 
  Search, 
  Trash2, 
  Folder, 
  X,
  ExternalLink,
  ChevronRight,
  Plus,
  SortAsc,
  SortDesc,
  Eye,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { EmptyState } from '../../../superadmin/interfaces/components/EmptyState';
import { DashboardPageHeader, dashboardInputClass, dashboardMetricCardClass, dashboardPanelClass, dashboardTabButtonClass, dashboardToolbarClass } from '../../../common/interfaces/components/DashboardUI';

interface Attachment {
  id: string;
  name: string;
  url: string;
  fileType: string;
  size: number;
  category: string;
  tags: string[];
  createdAt: string;
}

const CATEGORIES = [
  'SLA',
  'COMPLIANCE',
  'INCIDENT',
  'EVIDENCE',
  'REPORT',
  'SHIFT_LOG',
  'UNSPECIFIED'
];

type SortField = 'createdAt' | 'name' | 'size';
type SortOrder = 'asc' | 'desc';

export const FileManager: React.FC = () => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('UNSPECIFIED');
  const [uploadTags, setUploadTags] = useState('');
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Attachment | null>(null);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  const fetchAttachments = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/tenant/attachments?limit=100&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      if (activeCategory) url += `&category=${activeCategory}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      const res = await fetch(url, {
        credentials: 'include'
      });
      const data = await res.json();
      setAttachments(data.items || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchAttachments, 300);
    return () => clearTimeout(timer);
  }, [search, activeCategory, sortBy, sortOrder]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', uploadCategory);
      formData.append('tags', JSON.stringify(uploadTags.split(',').map(t => t.trim()).filter(Boolean)));

      const csrfToken = document.cookie.split('; ').find((row) => row.startsWith('scmd_csrf='))?.split('=').slice(1).join('=');
      const res = await fetch('/api/v1/tenant/attachments', {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': decodeURIComponent(csrfToken) } : {},
        body: formData
      });

      if (res.ok) {
        setMessage({ text: 'Tải tệp lên thành công', type: 'success' });
        setSelectedFile(null);
        setUploadTags('');
        fetchAttachments();
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      setMessage({ text: 'Không thể tải tệp lên', type: 'error' });
    } finally {
      setIsUploading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const csrfToken = document.cookie.split('; ').find((row) => row.startsWith('scmd_csrf='))?.split('=').slice(1).join('=');
      const res = await fetch(`/api/v1/tenant/attachments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': decodeURIComponent(csrfToken) } : {}
      });
      if (res.ok) {
        fetchAttachments();
        if (previewFile?.id === id) setPreviewFile(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const renderPreview = () => {
    if (!previewFile) return null;

    const isImage = previewFile.fileType.startsWith('image/');
    const isPDF = previewFile.fileType === 'application/pdf';

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8 bg-scmd-navy/95 backdrop-blur-sm"
        onClick={() => setPreviewFile(null)}
      >
        <div 
          className="relative w-full max-w-5xl h-full flex flex-col bg-scmd-navy border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-scmd-primary/10 flex items-center justify-center text-scmd-primary">
                <File size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">{previewFile.name}</h3>
                <p className="text-[10px] text-scmd-silver/40 font-bold uppercase tracking-widest">
                  {previewFile.category} • {(previewFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => window.open(previewFile.url, '_blank')}
                className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-scmd-primary transition-all flex items-center gap-2"
              >
                <ExternalLink size={14} /> Mở cửa sổ mới
              </button>
              <button 
                onClick={() => setPreviewFile(null)}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-black/40 flex items-center justify-center p-4">
            {isImage ? (
              <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain shadow-2xl" />
            ) : isPDF ? (
              <iframe
                src={previewFile.url}
                className="w-full h-full border-none rounded-xl"
                title="PDF Preview"
                sandbox="allow-downloads allow-forms allow-popups"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="text-center space-y-4 pt-10">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-scmd-silver/20 mx-auto">
                  <File size={48} />
                </div>
                <p className="text-sm font-black text-white uppercase tracking-widest">Định dạng {previewFile.fileType} không hỗ trợ xem trước</p>
                <button 
                  onClick={() => window.open(previewFile.url, '_blank')}
                  className="px-8 py-3 bg-scmd-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl"
                >
                  TẢI XUỐNG ĐỂ XEM
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderDeleteConfirm = () => {
    if (!deleteConfirm) return null;
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-scmd-navy/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-sm bg-scmd-navy rounded-[40px] p-10 border border-white/10 shadow-2xl"
        >
          <div className="w-20 h-20 rounded-[32px] bg-red-500/10 flex items-center justify-center text-red-500 mb-8 mx-auto shadow-inner">
            <Trash2 size={32} />
          </div>
          <div className="text-center space-y-3 mb-10">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Xác nhận xóa tệp?</h3>
            <p className="text-xs font-bold text-scmd-silver/40 uppercase tracking-widest leading-relaxed">
              Tệp <span className="text-white">{deleteConfirm.name}</span> sẽ bị xóa vĩnh viễn và không thể khôi phục.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleDelete(deleteConfirm.id)}
              className="py-5 bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-95"
            >
              CÓ, XÓA TỆP
            </button>
            <button 
              onClick={() => setDeleteConfirm(null)}
              className="py-5 bg-white/5 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl hover:bg-white/10 transition-all border border-white/10 active:scale-95"
            >
              HỦY BỎ
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const archiveMetrics = [
    { label: 'Tổng tệp', value: attachments.length, helper: 'bằng chứng/tài liệu' },
    { label: 'SLA', value: attachments.filter(file => file.category === 'SLA').length, helper: 'đối soát hợp đồng' },
    { label: 'Incident', value: attachments.filter(file => file.category === 'INCIDENT' || file.category === 'EVIDENCE').length, helper: 'sự cố & evidence' },
  ];

  return (
    <div className="space-y-6 pb-24">
      <DashboardPageHeader
        title={<>Quản lý <span className="text-scmd-primary">Tệp tin</span></>}
        description={`Kho bằng chứng, tài liệu SLA và hồ sơ nghiệm thu vận hành • ${attachments.length} tệp`}
        eyebrow="Evidence archive"
        actions={(
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className={cn(dashboardToolbarClass, 'flex overflow-x-auto p-1')}>
              <button
                onClick={() => toggleSort('createdAt')}
                className={cn(
                  'flex shrink-0 items-center gap-2',
                  dashboardTabButtonClass(sortBy === 'createdAt')
                )}
              >
                <Calendar size={12} /> NGÀY {sortBy === 'createdAt' && (sortOrder === 'desc' ? <SortDesc size={12} /> : <SortAsc size={12} />)}
              </button>
              <button
                onClick={() => toggleSort('name')}
                className={cn(
                  'flex shrink-0 items-center gap-2',
                  dashboardTabButtonClass(sortBy === 'name')
                )}
              >
                <ArrowUpDown size={12} /> TÊN {sortBy === 'name' && (sortOrder === 'desc' ? <SortDesc size={12} /> : <SortAsc size={12} />)}
              </button>
              <button
                onClick={() => toggleSort('size')}
                className={cn(
                  'flex shrink-0 items-center gap-2',
                  dashboardTabButtonClass(sortBy === 'size')
                )}
              >
                <Layers size={12} /> SIZE {sortBy === 'size' && (sortOrder === 'desc' ? <SortDesc size={12} /> : <SortAsc size={12} />)}
              </button>
            </div>

            <div className="relative min-w-0 group sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-scmd-silver/30 group-focus-within:text-scmd-primary transition-colors" size={16} />
              <input
                type="text"
                placeholder="TÌM KIẾM TỆP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(dashboardInputClass, 'pl-12 text-xs uppercase tracking-[0.14em]')}
              />
            </div>
          </div>
        )}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {archiveMetrics.map((metric) => (
          <div key={metric.label} className={dashboardMetricCardClass}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-scmd-silver/45">{metric.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-3xl font-black tracking-[-0.04em] text-white">{metric.value}</p>
              <span className="text-right text-[10px] font-bold uppercase tracking-wider text-scmd-silver/38">{metric.helper}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar Filters */}
        <div className="space-y-6">
          <div className={cn(dashboardPanelClass, 'p-5 lg:sticky lg:top-6')}>
            <p className="text-[10px] font-black text-scmd-silver/45 uppercase tracking-[0.22em] mb-4 flex items-center gap-2">
              <Folder size={12} /> Danh mục
            </p>
            <div className="space-y-1">
              <button 
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeCategory === null ? "bg-scmd-primary text-white" : "text-scmd-silver/60 hover:bg-white/5"
                )}
              >
                <span>Tất cả tệp</span>
                <ChevronRight size={12} />
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    activeCategory === cat ? "bg-scmd-primary text-white" : "text-scmd-silver/60 hover:bg-white/5"
                  )}
                >
                  <span>{cat}</span>
                  <ChevronRight size={12} />
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleUpload} className={cn(dashboardPanelClass, 'space-y-4 border-scmd-primary/20 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_55%)] p-5')}>
            <p className="text-[9px] font-black text-scmd-primary uppercase tracking-[0.2em] flex items-center gap-2">
              <Upload size={12} /> Tải tệp mới
            </p>
            
            <div className="space-y-3">
              <input 
                type="file" 
                id="file-upload"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <label 
                htmlFor="file-upload"
                className="w-full flex flex-col items-center gap-3 p-7 border-2 border-dashed border-scmd-primary/25 rounded-[24px] hover:border-scmd-primary/55 cursor-pointer transition-all bg-scmd-navy/55 hover:bg-scmd-primary/8"
              >
                <div className="w-10 h-10 rounded-full bg-scmd-primary/10 flex items-center justify-center text-scmd-primary">
                  <Plus size={20} />
                </div>
                <span className="text-[9px] font-black text-white uppercase tracking-widest text-center px-2">
                  {selectedFile ? selectedFile.name : 'CHỌN TỆP HOẶC KÉO THẢ'}
                </span>
                {selectedFile && (
                  <span className="text-[8px] text-scmd-primary/60 font-bold uppercase">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </label>

              <div className="space-y-1">
                <p className="text-[8px] font-black text-scmd-silver/20 uppercase tracking-widest ml-1">Danh mục lưu trữ</p>
                <select 
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full p-3 bg-scmd-navy/50 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white focus:outline-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <p className="text-[8px] font-black text-scmd-silver/20 uppercase tracking-widest ml-1">Từ khóa (Tags)</p>
                <input 
                  type="text" 
                  placeholder="TAGS (CÁCH NHAU BẰNG DẤU PHẨY)"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  className="w-full p-3 bg-scmd-navy/50 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white focus:outline-none placeholder:text-scmd-silver/20"
                />
              </div>

              <button 
                type="submit"
                disabled={!selectedFile || isUploading}
                className="w-full py-4 bg-scmd-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-scmd-primary/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 transition-all"
              >
                {isUploading ? 'ĐANG TẢI LÊN...' : 'TẢI TỆP LÊN'}
              </button>
            </div>
          </form>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : attachments.length === 0 ? (
            <EmptyState
              icon={<File size={32} />}
              title="Không có tệp tin nào được tìm thấy"
              description="Tải lên bằng chứng, tài liệu SLA hoặc hồ sơ nghiệm thu để lưu vết vận hành."
              className="py-24"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {attachments.map(file => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={file.id}
                    className={cn(dashboardPanelClass, 'group relative flex min-h-[220px] flex-col overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-scmd-primary/35')}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-scmd-primary/10 flex items-center justify-center text-scmd-primary">
                        <File size={24} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setPreviewFile(file)}
                          aria-label="Xem trước tệp"
                          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-scmd-silver/70 hover:bg-scmd-primary hover:text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-scmd-primary/30"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm(file)}
                          aria-label="Xoá tệp"
                          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <p className="text-sm font-black text-white uppercase tracking-tight line-clamp-2 group-hover:text-scmd-primary transition-colors cursor-pointer" onClick={() => setPreviewFile(file)}>
                        {file.name}
                      </p>
                      <p className="text-[9px] text-scmd-silver/40 uppercase font-bold tracking-widest">
                        {(file.size / 1024).toFixed(1)} KB • {file.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                      </p>
                      <p className="text-[8px] text-scmd-silver/20 uppercase font-black tracking-widest flex items-center gap-1">
                        <Calendar size={10} /> {new Date(file.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      <span className="px-2 py-1 rounded bg-scmd-primary/10 text-scmd-primary text-[8px] font-black uppercase tracking-widest">
                        {file.category}
                      </span>
                      {file.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-white/5 text-scmd-silver/40 text-[8px] font-black uppercase tracking-widest">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-1 h-1 rounded-full bg-scmd-primary animate-pulse" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {renderPreview()}
      </AnimatePresence>

      <AnimatePresence>
        {renderDeleteConfirm()}
      </AnimatePresence>

      {message && (
        <div className="fixed bottom-8 right-8 z-[500] animate-in slide-in-from-right-10">
          <div className={cn(
            "px-6 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest border flex items-center gap-3 backdrop-blur-xl",
            message.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
          )}>
            <div className={cn("w-2 h-2 rounded-full", message.type === 'success' ? "bg-emerald-500" : "bg-red-500")} />
            {message.text}
          </div>
        </div>
      )}
    </div>
  );
};
