import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, Image as ImageIcon, File, Film, Search, 
  Calendar, Plus, X, ChevronRight, 
  Download, Trash2, HardDrive, Eye, ExternalLink,
  FileSearch, Info, Check
} from "lucide-react";
import { apiFetch } from "../../../lib/api";
import { cn } from "../../../lib/utils";
import {
  DashboardMetricCard,
  DashboardMetricGrid,
  DashboardPageHeader,
  DashboardToolbarRow,
  dashboardInputClass,
} from "../../common/interfaces/components/DashboardUI";
import {
  OpsIconButton,
  opsRowClass,
  opsTableClass,
  opsTdClass,
  opsThClass,
} from "./components/OpsTableSystem";
import { SCMDButton } from "../../common/interfaces/components/SCMDButton";

type AttachmentRecord = {
  id: string;
  name: string;
  size: string;
  type: "IMAGE" | "PDF" | "DOC" | "VIDEO";
  extension: string;
  thumbnailUrl?: string;
  uploader: string;
  origin: { type: "INCIDENT" | "STAFF" | "CONTRACT"; id: string; label: string };
  createdAt: string;
  metadata: { resolution?: string; pages?: number; duration?: string };
};

export const AttachmentsTab: React.FC = () => {
  const [files, setFiles] = useState<AttachmentRecord[]>([]);
  const [, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<AttachmentRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadFiles = async () => {
    setLoading(true);
    try {
      // Mock API call - Thực tế sẽ dùng apiFetch
      const data = await apiFetch<any>("/api/tenant/attachments?limit=50");
      setFiles(Array.isArray(data) ? data : data?.items || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadFiles(); }, []);

  const openPreview = (file: AttachmentRecord) => {
    setSelectedFile(file);
    setIsDrawerOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "IMAGE": return <ImageIcon size={16} className="text-blue-400" />;
      case "PDF": return <FileText size={16} className="text-red-400" />;
      case "VIDEO": return <Film size={16} className="text-purple-400" />;
      default: return <File size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {/* Khu vực 1: Top Bar - Unified Filter */}
      <DashboardPageHeader
        title="Quản lý Tài nguyên"
        eyebrow="Digital Asset Management"
        description="Lưu trữ tập trung ảnh bằng chứng hiện trường, hồ sơ PDF và video sự cố phục vụ đối soát SLA."
        actions={
          <SCMDButton className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20">
            <Plus size={16} /> <span className="ml-2 font-black uppercase tracking-widest text-[11px]">Tải lên</span>
          </SCMDButton>
        }
      />

      <DashboardToolbarRow>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input placeholder="Tìm tên tệp, người tải hoặc mã sự cố..." className={cn(dashboardInputClass, "pl-9")} />
          </div>
          <select className={cn(dashboardInputClass, "w-40")}>
            <option value="all">Mọi định dạng</option>
            <option value="IMAGE">Ảnh (JPG, PNG)</option>
            <option value="PDF">Tài liệu (PDF)</option>
            <option value="VIDEO">Video (MP4)</option>
          </select>
          <select className={cn(dashboardInputClass, "w-44")}>
            <option value="all">Mọi nguồn gốc</option>
            <option value="INCIDENT">Gắn với Sự cố</option>
            <option value="STAFF">Hồ sơ Nhân sự</option>
            <option value="CONTRACT">Hợp đồng / Phụ lục</option>
          </select>
          <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
             <input type="date" className={cn(dashboardInputClass, "pl-9 w-40")} />
          </div>
        </div>
      </DashboardToolbarRow>

      {/* Khu vực 2: Micro-KPIs Storage */}
      <DashboardMetricGrid className="md:grid-cols-4">
        <DashboardMetricCard label="Dung lượng đã dùng" value="4.2 GB" description="42% của hạn mức 10GB" icon={<HardDrive size={18} />} tone="primary" />
        <DashboardMetricCard label="Tổng số tệp" value={files.length || "1,240"} description="Tăng 12% so với tháng trước" icon={<FileSearch size={18} />} />
        <DashboardMetricCard label="Bằng chứng rác" value="12" description="Tệp không gắn với thực thể nào" icon={<Trash2 size={18} />} tone="warning" />
        <DashboardMetricCard label="Uptime CDN" value="99.9%" description="Tốc độ truy xuất < 200ms" icon={<Check size={18} />} tone="success" />
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
                    onChange={(e) => setSelectedIds(e.target.checked ? files.map(f => f.id) : [])}
                  />
                </th>
                <th className={opsThClass}>Tên tệp & Thumbnail</th>
                <th className={opsThClass}>Dung lượng</th>
                <th className={opsThClass}>Gắn với (Origin)</th>
                <th className={opsThClass}>Người tải</th>
                <th className={opsThClass}>Ngày tạo</th>
                <th className={cn(opsThClass, "text-right")}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {files.map(file => (
                <tr key={file.id} className={cn(opsRowClass, "cursor-pointer group", selectedIds.includes(file.id) && "bg-blue-600/5")} onClick={() => openPreview(file)}>
                  <td className={opsTdClass} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.includes(file.id)} onChange={() => toggleSelect(file.id)} className="rounded border-white/10 bg-slate-950" />
                  </td>
                  <td className={opsTdClass}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                        {file.thumbnailUrl ? <img src={file.thumbnailUrl} className="object-cover w-full h-full" alt="thumb" /> : getFileIcon(file.type)}
                      </div>
                      <span className="font-bold text-slate-200 truncate max-w-[200px]">{file.name}</span>
                    </div>
                  </td>
                  <td className={cn(opsTdClass, "font-mono text-[11px] text-slate-400")}>{file.size}</td>
                  <td className={opsTdClass}>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-black border border-white/10 uppercase tracking-tighter text-blue-400">
                      {file.origin.type}: {file.origin.label}
                    </span>
                  </td>
                  <td className={opsTdClass}>{file.uploader}</td>
                  <td className={opsTdClass}>{new Date(file.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className={cn(opsTdClass, "text-right")} onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <OpsIconButton label="Xem chi tiết" onClick={() => openPreview(file)}><Eye size={14} /></OpsIconButton>
                      <OpsIconButton label="Tải về" onClick={() => { /* download logic */ }}><Download size={14} /></OpsIconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bulk Action Floating Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-blue-600 shadow-2xl flex items-center gap-6 border border-blue-400/50">
              <span className="text-white text-xs font-black uppercase tracking-widest">{selectedIds.length} tệp đã chọn</span>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex gap-2">
                 <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all"><Download size={14} /> Tải hàng loạt</button>
                 <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white text-[11px] font-bold transition-all"><Trash2 size={14} /> Xóa vĩnh viễn</button>
              </div>
              <button onClick={() => setSelectedIds([])} className="text-white/60 hover:text-white"><X size={18} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Right-side Detail Drawer (Master-Detail Flow) */}
      <AnimatePresence>
        {isDrawerOpen && selectedFile && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative flex h-full w-full max-w-2xl flex-col bg-scmd-navy border-l border-white/10 shadow-2xl overflow-hidden">
              
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 p-6 shrink-0">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                    {getFileIcon(selectedFile.type)} {selectedFile.name}
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mã định danh: #{selectedFile.id.slice(0,12)}</p>
                </div>
                <div className="flex items-center gap-2">
                   <SCMDButton variant="ghost" size="sm" className="h-10 px-4 text-blue-400"><Download size={16} /> Tải xuống</SCMDButton>
                   <button onClick={() => setIsDrawerOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X size={24} /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Nửa trên: Preview Section */}
                <section className="rounded-2xl bg-slate-950/50 border border-white/5 aspect-video flex items-center justify-center relative group overflow-hidden">
                   {selectedFile.type === "IMAGE" ? (
                     <img src={selectedFile.thumbnailUrl} className="max-w-full max-h-full object-contain" alt="Preview" />
                   ) : (
                     <div className="flex flex-col items-center gap-4 text-slate-600">
                        <FileSearch size={64} className="opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest">Không hỗ trợ xem trước định dạng {selectedFile.extension}</p>
                     </div>
                   )}
                   <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </section>

                {/* Nửa dưới: Metadata Section */}
                <div className="grid grid-cols-2 gap-8">
                  <section className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Info size={14} /> Thông số kỹ thuật
                    </h3>
                    <div className="space-y-3">
                       <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-xs text-slate-500">Định dạng</span>
                          <span className="text-xs font-bold text-white uppercase">{selectedFile.extension}</span>
                       </div>
                       <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-xs text-slate-500">Kích thước</span>
                          <span className="text-xs font-bold text-white uppercase">{selectedFile.size}</span>
                       </div>
                       <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-xs text-slate-500">Độ phân giải</span>
                          <span className="text-xs font-bold text-white uppercase">{selectedFile.metadata.resolution || "---"}</span>
                       </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <ExternalLink size={14} /> Nguồn gốc dữ liệu
                    </h3>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Tệp này thuộc về:</p>
                       <div>
                          <p className="text-sm font-bold text-white">{selectedFile.origin.label}</p>
                          <p className="text-[10px] text-slate-500 mt-1 uppercase">Loại thực thể: {selectedFile.origin.type}</p>
                       </div>
                       <button className="w-full h-9 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2">
                          Đi tới bản ghi gốc <ChevronRight size={12} />
                       </button>
                    </div>
                  </section>
                </div>

                <section className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Lịch sử hoạt động</h3>
                    <div className="flex items-center gap-4 text-xs">
                       <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">{selectedFile.uploader.charAt(0)}</div>
                       <div>
                          <p className="text-slate-300 font-bold">{selectedFile.uploader} <span className="font-normal text-slate-500">đã tải lên vào lúc</span> {new Date(selectedFile.createdAt).toLocaleString()}</p>
                       </div>
                    </div>
                </section>
              </div>

              <div className="p-6 bg-slate-900/50 border-t border-white/10 flex justify-between items-center">
                 <p className="text-[10px] text-slate-500 italic">Dữ liệu được bảo mật bởi RLS - Tenant Isolation.</p>
                 <button className="text-red-400 text-[10px] font-black uppercase hover:underline">Xóa tệp khỏi hệ thống</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};