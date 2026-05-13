import React from 'react';
import {
  MapPin,
  Target,
  Navigation,
  Plus,
  Loader2,
  Trash2,
  Check,
  QrCode,
  Zap,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { BenchmarkLearningMode } from './components/BenchmarkLearningMode';
import { AdminBenchmarkRecorder } from './AdminBenchmarkRecorder';
import { TacticalMap, type MapPoint } from './components/TacticalMap';
import type { Checkpoint, CheckItem, PatrolRoute } from './types';

interface SitesTabProps {
  checkpoints: Checkpoint[];
  checkpointsNextCursor: string | null;
  hasMoreCheckpoints: boolean;
  loadMoreCheckpoints: () => void;
  loadingMoreCheckpoints: boolean;
  routes: PatrolRoute[];
  editingCheckpoint: Checkpoint | null;
  newCheckpoint: { name: string; qr_hash: string; latitude: number; longitude: number; check_items: CheckItem[] };
  isSubmitting: boolean;
  siteSubTab: 'manage' | 'benchmark' | 'field' | 'map';
  setSiteSubTab: (v: 'manage' | 'benchmark' | 'field' | 'map') => void;
  setCheckpoints: React.Dispatch<React.SetStateAction<Checkpoint[]>>;
  setNewCheckpoint: React.Dispatch<React.SetStateAction<{ name: string; qr_hash: string; latitude: number; longitude: number; check_items: CheckItem[] }>>;
  setShowConfirmModal: (v: { id: string; type: 'checkpoint' | 'staff' | 'route'; name: string } | null) => void;
  setShowQRModal: (v: Checkpoint | null) => void;
  setMessage: (v: { text: string; type: 'success' | 'error' } | null) => void;
  setActiveTab: (tab: any) => void;
  startEditingCheckpoint: (cp: Checkpoint) => void;
  cancelEditing: () => void;
  handleAddCheckpoint: (e: React.FormEvent) => void;
  addCheckItem: () => void;
  removeCheckItem: (id: string) => void;
  updateCheckItem: (id: string, updates: Partial<CheckItem>) => void;
}

export const SitesTab: React.FC<SitesTabProps> = React.memo(({
  checkpoints,
  routes,
  editingCheckpoint,
  newCheckpoint,
  isSubmitting,
  siteSubTab,
  setSiteSubTab,
  setCheckpoints,
  setNewCheckpoint,
  setShowConfirmModal,
  setShowQRModal,
  setMessage,
  setActiveTab,
  startEditingCheckpoint,
  cancelEditing,
  handleAddCheckpoint,
  addCheckItem,
  removeCheckItem,
  updateCheckItem,
  hasMoreCheckpoints,
  loadMoreCheckpoints,
  loadingMoreCheckpoints,
}) => {
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);

  // Convert checkpoints or route checkpoints to MapPoints
  const mapPoints: MapPoint[] = React.useMemo(() => {
    if (selectedRouteId) {
      const route = routes.find(r => r.id === selectedRouteId);
      if (route) {
        return route.checkpoints
          .map(cpId => checkpoints.find(c => c.id === cpId))
          .filter((cp): cp is Checkpoint => !!cp)
          .map(cp => ({
            id: cp.id,
            name: cp.name,
            lat: cp.latitude,
            lon: cp.longitude,
            status: (cp.status === 'active' ? 'ACTIVE' : 'INACTIVE') as any,
            type: 'CHECKPOINT'
          }));
      }
    }
    
    // Default to all checkpoints if no route selected
    return Array.isArray(checkpoints) ? checkpoints.map(cp => ({
      id: cp.id,
      name: cp.name,
      lat: cp.latitude,
      lon: cp.longitude,
      status: (cp.status === 'active' ? 'ACTIVE' : 'INACTIVE') as any,
      type: 'CHECKPOINT'
    })) : [];
  }, [checkpoints, routes, selectedRouteId]);

  return (
    <motion.div
      key="sites"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 animate-in fade-in duration-500"
    >
      <header id="checkpoint-form">
        <h2 className="text-4xl font-black tracking-tight text-white">Mục tiêu & Site</h2>
        <p className="text-slate-400 mt-2 font-medium">
          Quản lý các điểm tuần tra và theo sát hiệu quả SLA theo từng vị trí.
        </p>
      </header>

      {/* Sub-tab switcher */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setSiteSubTab('manage')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all',
            siteSubTab === 'manage'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-300',
          )}
        >
          <MapPin size={13} /> Quản lý điểm
        </button>
        <button
          onClick={() => {
            setSiteSubTab('map');
            setSelectedRouteId(null);
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all',
            siteSubTab === 'map'
              ? 'bg-sky-600 text-white shadow-sm shadow-sky-500/20'
              : 'text-slate-500 hover:text-slate-300',
          )}
        >
          <Navigation size={13} /> Bản đồ chiến thuật
        </button>
        <button
          onClick={() => setSiteSubTab('benchmark')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all',
            siteSubTab === 'benchmark'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-500 hover:text-slate-300',
          )}
        >
          <Target size={13} /> Learning Mode
          {Array.isArray(checkpoints) && checkpoints.filter((c: any) => !c.benchmark_work_duration).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-md text-[9px] font-black">
              {checkpoints.filter((c: any) => !c.benchmark_work_duration).length} chưa học
            </span>
          )}
        </button>
        <button
          onClick={() => setSiteSubTab('field')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all',
            siteSubTab === 'field'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
              : 'text-slate-500 hover:text-slate-300',
          )}
        >
          <Navigation size={13} /> Thiết lập thực địa
        </button>
      </div>

      {/* Bản đồ chiến thuật */}
      {siteSubTab === 'map' && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Lựa chọn lộ trình */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Lọc theo Lộ trình</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedRouteId(null)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border",
                      !selectedRouteId 
                        ? "bg-white/10 border-white/20 text-white shadow-lg" 
                        : "border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300"
                    )}
                  >
                    Tất cả điểm kiểm soát
                  </button>
                  {Array.isArray(routes) && routes.map(route => (
                    <button
                      key={route.id}
                      onClick={() => setSelectedRouteId(route.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border",
                        selectedRouteId === route.id
                          ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20 border-sky-400/50"
                          : "border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span>{route.name}</span>
                        <Zap size={12} className={selectedRouteId === route.id ? "text-white" : "text-slate-700"} />
                      </div>
                      <div className="text-[8px] mt-1 opacity-60 normal-case font-medium">{route.checkpoints.length} điểm • {route.schedule}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-scmd-surface p-6 rounded-[2rem] border border-white/5">
                <p className="text-[10px] text-scmd-silver/40 font-medium leading-relaxed">
                  <strong className="text-scmd-silver/60">Chú ý:</strong> Bản đồ hiển thị lộ trình tuần tra (Route paths) nối các điểm kiểm soát theo đúng thứ tự thiết lập trong hệ thống.
                </p>
              </div>
            </div>

            {/* Map Area */}
            <div className="lg:col-span-3 h-[600px] rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl relative">
              <TacticalMap 
                points={mapPoints} 
                showRouteLine={!!selectedRouteId}
                onPointClick={(pt) => {
                  const cp = checkpoints.find(c => c.id === pt.id);
                  if (cp) startEditingCheckpoint(cp);
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Thiết lập thực địa — Admin thực hiện khảo sát & ghi benchmark tại hiện trường */}
      {siteSubTab === 'field' && (
        <div className="animate-in fade-in duration-500">
          <AdminBenchmarkRecorder />
        </div>
      )}

      {/* Learning Mode */}
      {siteSubTab === 'benchmark' && (
        <BenchmarkLearningMode
          checkpoints={checkpoints as any}
          onCheckpointsUpdate={(updated: any) => setCheckpoints(updated)}
        />
      )}

      {/* Manage panel */}
      {siteSubTab === 'manage' && (
        <>
          {/* Routes Overview */}
          <div className="bg-slate-900 shadow-2xl rounded-[32px] p-8 border border-slate-800 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white">Cấu trúc Lộ trình & Tuyến</h3>
              <button
                onClick={() => setActiveTab('sites')}
                className="px-4 py-2 bg-scmd-cyber/10 text-scmd-cyber rounded-xl text-[10px] font-black uppercase tracking-widest border border-scmd-cyber/20 hover:bg-scmd-cyber/20 transition-all"
              >
                Thiết lập Tuyến mới
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.isArray(routes) && routes.map((route) => (
                <div
                  key={route.id}
                  className="bg-slate-950 p-6 rounded-3xl border border-slate-800 group hover:border-sky-500/50 transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                      <Zap size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{route.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{route.schedule}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                      SLA Goal: 95%
                    </span>
                    <button 
                      onClick={() => {
                        setSiteSubTab('map');
                        setSelectedRouteId(route.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-sky-400 text-[10px] font-black uppercase tracking-widest hover:underline"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form + List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Add/Edit form */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-scmd-surface p-8 rounded-[32px] border border-white/5 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-white">
                    {editingCheckpoint ? 'Sửa mục tiêu' : 'Thêm điểm mới'}
                  </h3>
                  {editingCheckpoint && (
                    <button
                      onClick={cancelEditing}
                      className="text-xs font-bold text-red-500 hover:text-red-600"
                    >
                      Hủy sửa
                    </button>
                  )}
                </div>

                <form onSubmit={handleAddCheckpoint} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Tên mục tiêu
                    </label>
                    <input
                      type="text"
                      required
                      value={newCheckpoint.name}
                      onChange={(e) => setNewCheckpoint({ ...newCheckpoint, name: e.target.value })}
                      className="w-full px-5 py-3 bg-scmd-navy border border-white/5 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-white placeholder:text-slate-500"
                      placeholder="Ví dụ: Cổng số 3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Vĩ độ (Lat)
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newCheckpoint.latitude}
                        onChange={(e) =>
                          setNewCheckpoint({ ...newCheckpoint, latitude: parseFloat(e.target.value) })
                        }
                        className="w-full px-5 py-3 bg-scmd-navy border border-white/5 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono text-sm font-bold text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Kinh độ (Lon)
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newCheckpoint.longitude}
                        onChange={(e) =>
                          setNewCheckpoint({ ...newCheckpoint, longitude: parseFloat(e.target.value) })
                        }
                        className="w-full px-5 py-3 bg-scmd-navy border border-white/5 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono text-sm font-bold text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setNewCheckpoint({
                              ...newCheckpoint,
                              latitude: position.coords.latitude,
                              longitude: position.coords.longitude,
                            });
                            setMessage({ text: 'Đã lấy tọa độ hiện tại!', type: 'success' });
                            setTimeout(() => setMessage(null), 3000);
                          },
                          () => {
                            setMessage({ text: 'Lỗi lấy vị trí!', type: 'error' });
                            setTimeout(() => setMessage(null), 3000);
                          },
                        );
                      }
                    }}
                    className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-scmd-silver/60 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <MapPin size={12} /> Lấy tọa độ hiện tại (GPS)
                  </button>

                  {/* Checklist Builder */}
                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Đầu việc Checklist ({newCheckpoint.check_items.length})
                      </label>
                      <button
                        type="button"
                        onClick={addCheckItem}
                        className="flex items-center gap-1 text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest"
                      >
                        <Plus size={12} /> Thêm
                      </button>
                    </div>

                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {Array.isArray(newCheckpoint.check_items) && newCheckpoint.check_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-3 bg-scmd-navy rounded-xl border border-white/5"
                        >
                          <select
                            value={item.type}
                            onChange={(e) =>
                              updateCheckItem(item.id, {
                                type: e.target.value as CheckItem['type'],
                              })
                            }
                            className="text-[10px] font-black bg-scmd-surface border border-white/10 rounded-lg px-2 py-1 text-white uppercase"
                          >
                            <option value="toggle">Toggle</option>
                            <option value="photo">Photo</option>
                            <option value="text">Text</option>
                          </select>
                          <input
                            type="text"
                            value={item.task}
                            onChange={(e) => updateCheckItem(item.id, { task: e.target.value })}
                            placeholder="Nội dung đầu việc..."
                            className="flex-1 text-xs font-bold bg-scmd-surface border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                          />
                          <label className="flex items-center gap-1 cursor-pointer group/check">
                            <div
                              className={cn(
                                'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                                item.required
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-600',
                              )}
                            >
                              {item.required && <Check size={10} strokeWidth={4} />}
                            </div>
                            <input
                              type="checkbox"
                              checked={item.required}
                              onChange={(e) => updateCheckItem(item.id, { required: e.target.checked })}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeCheckItem(item.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {(!Array.isArray(newCheckpoint.check_items) || newCheckpoint.check_items.length === 0) && (
                        <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl">
                          <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest">
                            Chưa có đầu việc nào
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      'w-full py-4 text-slate-950 font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
                      editingCheckpoint
                        ? 'bg-scmd-cyber shadow-scmd-cyber/20'
                        : 'bg-emerald-500 shadow-emerald-500/20',
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" />
                    ) : editingCheckpoint ? (
                      <Check size={20} />
                    ) : (
                      <Plus size={20} />
                    )}
                    {editingCheckpoint ? 'Cập nhật mục tiêu' : 'Lưu mục tiêu'}
                  </button>
                </form>
              </div>

              <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles className="text-emerald-400" size={20} />
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    <strong>Mẹo:</strong> Bạn có thể lấy tọa độ từ Google Maps. Hệ thống sẽ tự động
                    sinh mã QR bảo mật cho điểm này.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Checkpoint List */}
            <div className="lg:col-span-2">
              <div className="bg-scmd-surface rounded-[32px] border border-white/5 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-scmd-navy/40 flex justify-between items-center">
                  <h3 className="font-black text-white">Danh sách mục tiêu</h3>
                  <span className="px-3 py-1 bg-white/5 text-scmd-silver/60 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/5">
                    {Array.isArray(checkpoints) ? checkpoints.length : 0} Điểm
                  </span>
                </div>

                <div className="divide-y divide-white/5">
                  {Array.isArray(checkpoints) && checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className="p-6 flex items-center justify-between hover:bg-white/5 transition-all group border-l-4 border-transparent hover:border-scmd-cyber"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-scmd-navy text-scmd-silver/20 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-all border border-white/5">
                          <MapPin size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-black text-white text-lg">{cp.name}</p>
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                              SLA: 98.5%
                            </span>
                          </div>
                          <p className="text-xs text-scmd-silver/40 font-mono mt-0.5">
                            {(cp.latitude ?? 0).toFixed(6)}, {(cp.longitude ?? 0).toFixed(6)}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-scmd-alert" />
                              <span className="text-[10px] font-bold text-scmd-silver/30 uppercase tracking-widest">2 Vi phạm</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                              <span className="text-[10px] font-bold text-scmd-silver/30 uppercase tracking-widest">
                                Gần nhất: 15p trước
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => startEditingCheckpoint(cp)}
                          className="px-4 py-2 bg-white/5 text-scmd-silver/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-scmd-navy hover:text-white transition-all border border-white/5"
                        >
                          Xem Timeline
                        </button>
                        <button
                          onClick={() => setShowQRModal(cp)}
                          className="p-2.5 text-scmd-silver/30 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all border border-dashed border-white/10"
                          title="In mã QR"
                        >
                          <QrCode size={18} />
                        </button>
                        <button
                          onClick={() =>
                            setShowConfirmModal({ id: cp.id, type: 'checkpoint', name: cp.name })
                          }
                          className="p-2.5 text-scmd-silver/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!Array.isArray(checkpoints) || checkpoints.length === 0) && (
                    <div className="p-20 text-center">
                      <div className="w-20 h-20 bg-scmd-navy rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner">
                        <Target className="text-scmd-silver/10" size={40} />
                      </div>
                      <p className="text-scmd-silver/40 font-bold uppercase tracking-widest text-xs">Chưa có mục tiêu tuần tra nào.</p>
                    </div>
                  )}

                  {hasMoreCheckpoints && (
                    <div className="p-6 flex justify-center border-t border-white/5 bg-scmd-navy/20">
                      <button
                        onClick={loadMoreCheckpoints}
                        disabled={loadingMoreCheckpoints}
                        className="px-6 py-2.5 bg-emerald-500/10 text-emerald-400 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-500/20 disabled:opacity-50 transition-all border border-emerald-500/10 flex items-center gap-2"
                      >
                        {loadingMoreCheckpoints && <Loader2 size={14} className="animate-spin" />}
                        Tải thêm điểm tuần tra
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
});