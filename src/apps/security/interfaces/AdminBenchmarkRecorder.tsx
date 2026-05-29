import React, { useState, useEffect, useRef } from 'react';
import L, { type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, CheckCircle2, Loader2, Navigation, Play, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Checkpoint, CheckItem, CheckItemType } from '../../../server/domain/entities';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { cn } from '../../../lib/utils';
import { getAuthHeaders } from '../../common/utils/auth';

export const AdminBenchmarkRecorder: React.FC = () => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null);
  const [lastCheckpointTime, setLastCheckpointTime] = useState<number | null>(null);
  const [workStartTime, setWorkStartTime] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [, setTicker] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const [formData, setFormData] = useState({
    name: '',
    qr_hash: '',
    latitude: 10.762622,
    longitude: 106.660172,
    check_items: [] as CheckItem[]
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/tenant/checkpoints', { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        setCheckpoints(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        setMessage("Lỗi tải dữ liệu. Vui lòng đăng nhập lại.");
      });
  }, []);

  useEffect(() => {
    if (showMap && mapContainerRef.current) {
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([10.762622, 106.660172], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);
        
        // Apply technical dark filter to map container
        if (mapContainerRef.current) {
          mapContainerRef.current.style.filter = 'invert(0.9) hue-rotate(195deg) brightness(0.7) contrast(1.2) saturate(0.8)';
        }
      }

      // Draw all checkpoints and connections for context
      const currentMap = mapInstanceRef.current;
      
      // Clear existing markers and lines if needed (or just add context)
      // For simplicity in the recorder, we'll focus on the active one but show others as small dots
      
      if (Array.isArray(checkpoints) && checkpoints.length > 1) {
        const latlngs: LatLngTuple[] = checkpoints
          .filter(c => c.latitude && c.longitude)
          .map(c => [c.latitude, c.longitude]);
        
        if (latlngs.length > 1) {
          L.polyline(latlngs, {
            color: '#4285F4',
            weight: 2,
            opacity: 0.3,
            dashArray: '5, 10'
          }).addTo(currentMap);
        }
      }

      if (activeCheckpoint) {
        const pos: [number, number] = [activeCheckpoint.latitude, activeCheckpoint.longitude];
        currentMap.setView(pos, 16);
        
        if (markerRef.current) currentMap.removeLayer(markerRef.current);
        
        markerRef.current = L.marker(pos, {
          icon: L.divIcon({
            html: `
              <div class="relative">
                <div class="absolute inset-[-8px] bg-sky-500 rounded-full animate-ping opacity-40"></div>
                <div class="w-8 h-8 bg-sky-600 rounded-xl border-2 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] flex items-center justify-center relative z-10">
                  <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
            `,
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(currentMap);
      }
    }
  }, [showMap, activeCheckpoint]);

  useEffect(() => {
    let int: any;
    if (recording) {
      int = setInterval(() => setTicker(Date.now()), 1000);
    }
    return () => clearInterval(int);
  }, [recording]);

  const handleStartLearning = (cp: Checkpoint) => {
    setActiveCheckpoint(cp);
    setLastCheckpointTime(Date.now());
    setRecording(true);
    setMessage(`Đang học điểm: ${cp.name}`);
    setShowMap(true);
  };

  const handleArrive = () => {
    setWorkStartTime(Date.now());
    setMessage("Đã đến điểm. Hãy thực hiện kiểm tra thực tế...");
  };

  const handleRecordBenchmark = () => {
    if (!activeCheckpoint || !lastCheckpointTime || !workStartTime) return;

    const now = Date.now();
    const travelTime = Math.floor((workStartTime - lastCheckpointTime) / 1000);
    const workDuration = Math.floor((now - workStartTime) / 1000);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;

      try {
        const res = await fetch(`/api/admin/checkpoints/${activeCheckpoint.id}/benchmark`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            lat: latitude,
            lon: longitude,
            travelTime,
            workDuration
          })
        });

        if (res.ok) {
          const updated = await res.json();
          setCheckpoints(prev => Array.isArray(prev) ? prev.map(c => c.id === updated.id ? updated : c) : [updated]);
          setActiveCheckpoint(null);
          setLastCheckpointTime(now);
          setWorkStartTime(null);
          setRecording(false);
          setMessage("Đã ghi nhận Benchmark thành công!");
          
          if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        }
      } catch (err) {
        console.error(err);
        setMessage("Lỗi khi lưu Benchmark.");
      }
    });
  };

  const handleAddCheckItem = () => {
    const newItem: CheckItem = {
      id: Math.random().toString(36).substr(2, 9),
      task: '',
      required: true,
      type: CheckItemType.TOGGLE
    };
    setFormData(prev => ({
      ...prev,
      check_items: [...prev.check_items, newItem]
    }));
  };

  const handleRemoveCheckItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      check_items: prev.check_items.filter(item => item.id !== id)
    }));
  };

  const handleUpdateCheckItem = (id: string, updates: Partial<CheckItem>) => {
    setFormData(prev => ({
      ...prev,
      check_items: prev.check_items.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  };

  const handleSaveCheckpoint = async () => {
    if (!formData.name) {
      setMessage("Vui lòng nhập tên điểm tuần tra");
      return;
    }

    try {
      const url = editingCheckpoint ? `/api/tenant/checkpoints/${editingCheckpoint.id}` : '/api/tenant/checkpoints';
      const method = editingCheckpoint ? 'PUT' : 'POST';

      // FIX [7.4]: Đảm bảo payload gửi lên có qr_hash
      const payload = {
        ...formData,
        qr_hash: formData.qr_hash || `cp_${Math.random().toString(36).substring(7)}`
      };

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved = await res.json();
        if (editingCheckpoint) {
          setCheckpoints(prev => Array.isArray(prev) ? prev.map(c => c.id === saved.id ? saved : c) : [saved]);
        } else {
          setCheckpoints(prev => Array.isArray(prev) ? [...prev, saved] : [saved]);
        }
        setShowForm(false);
        setEditingCheckpoint(null);
        setFormData({ name: '', qr_hash: '', latitude: 10.762622, longitude: 106.660172, check_items: [] });
        setMessage("Đã lưu điểm tuần tra thành công!");
      }
    } catch (err) {
      console.error(err);
      setMessage("Lỗi khi lưu điểm tuần tra.");
    }
  };

  const startEditing = (cp: Checkpoint) => {
    setEditingCheckpoint(cp);
    setFormData({
      name: cp.name,
      qr_hash: cp.qr_hash || '',
      latitude: cp.latitude,
      longitude: cp.longitude,
      check_items: cp.check_items || []
    });
    setShowForm(true);
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-scmd-navy"><Loader2 className="animate-spin text-scmd-cyber" /></div>;

  return (
    <div className="flex flex-col h-screen bg-scmd-navy text-slate-100 overflow-hidden">
      <header className="px-6 pt-12 pb-6 bg-scmd-slate/50 backdrop-blur-lg border-b border-slate-700/50 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Thiết lập thực địa</h1>
          <p className="text-slate-400 text-sm font-medium">Chế độ Learning Mode • Think Zero</p>
        </div>
        <button 
          onClick={() => {
            setEditingCheckpoint(null);
            setFormData({ name: '', qr_hash: '', latitude: 10.762622, longitude: 106.660172, check_items: [] });
            setShowForm(true);
          }}
          className="w-10 h-10 bg-scmd-cyber text-slate-950 rounded-full flex items-center justify-center shadow-lg shadow-scmd-cyber/20 active:scale-90 transition-all"
        >
          <Plus size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-scmd-cyber/20 border border-scmd-cyber/50 rounded-scmd text-scmd-cyber text-center font-bold text-sm"
          >
            {message}
          </motion.div>
        )}

        {showMap && (
          <div className="relative h-48 rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-slate-900/80 backdrop-blur rounded-full text-[10px] font-black text-sky-400 border border-white/5">
              LIVE TRACKING
            </div>
          </div>
        )}

        <div className="space-y-3">
          {Array.isArray(checkpoints) && checkpoints.map((cp) => (
            <SCMDCard 
              key={cp.id}
              className={cn(
                "p-4 flex items-center justify-between transition-all",
                activeCheckpoint?.id === cp.id ? "border-scmd-cyber bg-scmd-cyber/5" : "border-slate-800",
                cp.benchmark_work_duration ? "opacity-60" : ""
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  cp.benchmark_work_duration ? "bg-scmd-safety/20 text-scmd-safety" : "bg-slate-800 text-slate-500"
                )}>
                  {cp.benchmark_work_duration ? <CheckCircle2 size={20} /> : <MapPin size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-white">{cp.name}</h3>
                  {cp.benchmark_work_duration && (
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                      Chuẩn: {cp.benchmark_travel_time}s di chuyển | {cp.benchmark_work_duration}s làm việc
                    </p>
                  )}
                </div>
              </div>
                <div className="flex items-center gap-2">
                  {!cp.benchmark_work_duration && !recording && (
                    <button 
                      onClick={() => startEditing(cp)}
                      className="p-2 bg-slate-800 text-slate-400 rounded-full active:scale-95 hover:text-white transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  {!cp.benchmark_work_duration && !recording && (
                    <button 
                      onClick={() => handleStartLearning(cp)}
                      className="p-2 bg-scmd-cyber text-slate-950 rounded-full active:scale-95"
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  )}
                </div>
            </SCMDCard>
          ))}
        </div>
      </main>

      {/* Thumb-first Action Button */}
      <div className="fixed bottom-10 left-6 right-6 z-50">
        <AnimatePresence mode="wait">
          {!recording ? (
            <div className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">
              Chọn một điểm để bắt đầu học
            </div>
          ) : !workStartTime ? (
            <motion.div
              key="arrive"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              <div className="bg-scmd-slate/90 backdrop-blur-xl border border-scmd-cyber/30 rounded-3xl p-6 text-center shadow-2xl">
                <p className="text-scmd-cyber font-black text-sm uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-scmd-cyber text-slate-900 flex items-center justify-center text-xs">1</span>
                  Di chuyển tới điểm
                </p>
                <p className="text-slate-400 text-xs mb-4">
                  Hệ thống đang đo thời gian di chuyển của bạn. Hãy đi bộ tới điểm tuần tra mục tiêu.
                </p>
                <div className="inline-flex items-center justify-center px-6 py-3 bg-slate-900 rounded-2xl border border-slate-700">
                  <div className="text-4xl font-mono font-black text-white">
                    {Math.floor((currentTime - (lastCheckpointTime || currentTime)) / 1000)}<span className="text-xl text-slate-500 ml-1">giây</span>
                  </div>
                </div>
              </div>
              <SCMDButton 
                onClick={handleArrive}
                className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-2xl shadow-scmd-cyber/20 bg-scmd-cyber text-slate-900 hover:bg-sky-400"
              >
                <Navigation className="mr-2" size={24} /> TÔI ĐÃ ĐẾN NƠI
              </SCMDButton>
            </motion.div>
          ) : (
            <motion.div
              key="record"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              <div className="bg-scmd-slate/90 backdrop-blur-xl border border-scmd-safety/30 rounded-3xl p-6 text-center shadow-2xl">
                <p className="text-scmd-safety font-black text-sm uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-scmd-safety text-slate-900 flex items-center justify-center text-xs">2</span>
                  Thực hiện kiểm tra
                </p>
                <p className="text-slate-400 text-xs mb-4">
                  Hãy kiểm tra thực tế như một ca trực bình thường để AI ghi nhận thời gian chuẩn xác nhất.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 py-3">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Thời gian đi</p>
                    <p className="text-xl font-mono font-black text-slate-300">
                      {Math.floor((workStartTime - (lastCheckpointTime || workStartTime)) / 1000)}s
                    </p>
                  </div>
                  <div className="bg-slate-900 rounded-2xl border border-scmd-safety/50 py-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-scmd-safety/10 animate-pulse" />
                    <p className="text-[10px] text-scmd-safety font-bold uppercase tracking-widest mb-1 relative z-10">Đang làm việc</p>
                    <p className="text-2xl font-mono font-black text-white relative z-10">
                      {Math.floor((currentTime - workStartTime) / 1000)}s
                    </p>
                  </div>
                </div>
              </div>
              <SCMDButton 
                onClick={handleRecordBenchmark}
                className="w-full h-16 text-lg font-black uppercase tracking-widest bg-scmd-safety text-slate-900 shadow-2xl shadow-scmd-safety/20 hover:bg-emerald-400"
              >
                <CheckCircle2 className="mr-2" size={24} /> HOÀN THÀNH & GHI NHẬN
              </SCMDButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-scmd-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-scmd-slate rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-scmd-navy/50">
                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  {editingCheckpoint ? 'Sửa điểm tuần tra' : 'Thêm điểm mới'}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tên điểm tuần tra</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Cổng chính, Kho A..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-scmd-cyber outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vĩ độ (Lat)</label>
                    <input 
                      type="number" 
                      value={formData.latitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-scmd-cyber outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kinh độ (Lon)</label>
                    <input 
                      type="number" 
                      value={formData.longitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-scmd-cyber outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Danh mục kiểm tra (Checklist)</label>
                    <button 
                      onClick={handleAddCheckItem}
                      className="flex items-center gap-1 text-[10px] font-black text-scmd-cyber uppercase tracking-widest bg-scmd-cyber/10 px-2 py-1 rounded-lg"
                    >
                      <Plus size={12} /> Thêm mục
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.check_items.map((item, idx) => (
                      <div key={item.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-slate-600">MỤC #{idx + 1}</span>
                          <button onClick={() => handleRemoveCheckItem(item.id)} className="text-red-500/50 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        <input 
                          type="text" 
                          value={item.task}
                          onChange={(e) => handleUpdateCheckItem(item.id, { task: e.target.value })}
                          placeholder="Nhiệm vụ cần thực hiện..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-scmd-cyber outline-none"
                        />

                        <div className="flex items-center justify-between gap-4">
                          <select 
                            value={item.type}
                            onChange={(e) => handleUpdateCheckItem(item.id, { type: e.target.value as any })}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none"
                          >
                            <option value="toggle">Nút gạt (Xong/Chưa)</option>
                            <option value="photo">Chụp ảnh minh chứng</option>
                            <option value="text">Nhập văn bản báo cáo</option>
                          </select>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={item.required}
                              onChange={(e) => handleUpdateCheckItem(item.id, { required: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-scmd-cyber"
                            />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Bắt buộc</span>
                          </label>
                        </div>
                      </div>
                    ))}
                    {formData.check_items.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-2xl">
                        <p className="text-xs text-slate-500 font-medium ">Chưa có mục kiểm tra nào</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-scmd-navy/50 border-t border-slate-700">
                <SCMDButton onClick={handleSaveCheckpoint} className="w-full h-14 text-sm font-black uppercase tracking-widest">
                  <Save className="mr-2" size={18} /> Lưu điểm tuần tra
                </SCMDButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
