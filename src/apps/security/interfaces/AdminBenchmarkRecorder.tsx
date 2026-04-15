import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, CheckCircle2, Loader2, Navigation, Play, Globe, Plus, Trash2, Edit2, Save, X, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Checkpoint, CheckItem } from '../domain/entities';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { cn } from '../../../lib/utils';
import { getAuthHeaders } from '../../common/utils/auth';

// Declare Leaflet
declare const L: any;

export const AdminBenchmarkRecorder: React.FC = () => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null);
  const [lastCheckpointTime, setLastCheckpointTime] = useState<number | null>(null);
  const [workStartTime, setWorkStartTime] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [formData, setFormData] = useState({
    name: '',
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
    if (showMap && mapContainerRef.current && typeof L !== 'undefined') {
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([10.762622, 106.660172], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);
      }

      if (activeCheckpoint) {
        const pos: [number, number] = [activeCheckpoint.latitude, activeCheckpoint.longitude];
        mapInstanceRef.current.setView(pos, 16);
        
        if (markerRef.current) mapInstanceRef.current.removeLayer(markerRef.current);
        
        markerRef.current = L.marker(pos, {
          icon: L.divIcon({
            html: '<div class="w-6 h-6 bg-scmd-cyber rounded-full border-4 border-white shadow-lg animate-pulse"></div>',
            className: 'custom-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(mapInstanceRef.current);
      }
    }
  }, [showMap, activeCheckpoint]);

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
          setCheckpoints(prev => prev.map(c => c.id === updated.id ? updated : c));
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
      type: 'toggle'
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

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const saved = await res.json();
        if (editingCheckpoint) {
          setCheckpoints(prev => prev.map(c => c.id === saved.id ? saved : c));
        } else {
          setCheckpoints(prev => [...prev, saved]);
        }
        setShowForm(false);
        setEditingCheckpoint(null);
        setFormData({ name: '', latitude: 10.762622, longitude: 106.660172, check_items: [] });
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
            setFormData({ name: '', latitude: 10.762622, longitude: 106.660172, check_items: [] });
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
          {checkpoints.map((cp) => (
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
      <div className="fixed bottom-10 left-6 right-6">
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
            >
              <SCMDButton 
                onClick={handleArrive}
                className="w-full h-20 text-xl font-black uppercase tracking-widest shadow-2xl shadow-scmd-cyber/20"
              >
                <Navigation className="mr-2" /> TÔI ĐÃ ĐẾN ĐIỂM
              </SCMDButton>
            </motion.div>
          ) : (
            <motion.div
              key="record"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <SCMDButton 
                onClick={handleRecordBenchmark}
                className="w-full h-20 text-xl font-black uppercase tracking-widest bg-scmd-safety shadow-2xl shadow-scmd-safety/20"
              >
                <CheckCircle2 className="mr-2" /> GHI NHẬN ĐIỂM NÀY
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
                        <p className="text-xs text-slate-500 font-medium italic">Chưa có mục kiểm tra nào</p>
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
