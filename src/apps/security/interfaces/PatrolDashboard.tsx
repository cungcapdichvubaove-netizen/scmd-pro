import React, { useState, useEffect, useCallback } from 'react';
import { 
  QrCode, 
  CheckCircle2, 
  Circle, 
  MapPin, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Flame, 
  Lock, 
  Camera, 
  Check, 
  X,
  ClipboardCheck,
  Zap,
  AlertCircle,
  Send,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Checkpoint } from '../domain/entities';
import { cn } from '../../../lib/utils';
import { 
  savePendingLocation, 
  savePendingReport, 
  getPendingLocations, 
  getPendingReports, 
  deletePendingLocation, 
  deletePendingReport 
} from '../../../lib/db';
import { getAuthHeaders } from '../../common/utils/auth';
import translations from '../../common/constants/translations.json';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { SCMDStatusBadge } from '../../common/interfaces/components/SCMDStatusBadge';
import { analyzePatrolAnomaly } from '../../../services/geminiService';
import socket from '../../../lib/socket';

export const PatrolDashboard: React.FC = () => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [tenantId] = useState(localStorage.getItem('scmd_tenant_id') || 'tenant_1');
  
  // Checklist states
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null);
  const [checklistValues, setChecklistValues] = useState<Record<string, any>>({});
  const [selectedItemInfo, setSelectedItemInfo] = useState<any | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [trajectory, setTrajectory] = useState<{ lat: number; lon: number; timestamp: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    const locations = await getPendingLocations();
    const reports = await getPendingReports();
    setPendingCount(locations.length + reports.length);
  }, []);

  // Audio feedback: Beep
  const playBeep = (type: 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Audio feedback failed", e);
    }
  };

  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine) return;

    const pendingLocations = await getPendingLocations();
    const pendingReports = await getPendingReports();
    
    if (pendingLocations.length === 0 && pendingReports.length === 0) return;

    console.log(`[Sync] Attempting to sync ${pendingLocations.length} locations and ${pendingReports.length} reports...`);
    let successCount = 0;

    // Sync Locations (Scan QR)
    for (const item of pendingLocations) {
      try {
        const res = await fetch('/api/security/patrol/scan-qr', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(item.payload)
        });
        if (res.ok) {
          if (item.id) await deletePendingLocation(item.id);
          successCount++;
        }
      } catch (err) {
        console.error("[Sync] Failed to sync location", item.id, err);
      }
    }

    // Sync Reports (Complete Patrol)
    for (const item of pendingReports) {
      try {
        const res = await fetch('/api/security/patrol/complete', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(item.reportData)
        });
        if (res.ok) {
          if (item.id) await deletePendingReport(item.id);
          successCount++;
        }
      } catch (err) {
        console.error("[Sync] Failed to sync report", item.id, err);
      }
    }

    if (successCount > 0) {
      setMessage({ text: `Đã đồng bộ ${successCount} dữ liệu thành công!`, type: 'success' });
      triggerFeedback('success');
      refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    // Track GPS trajectory while patrolling
    let watchId: number | null = null;
    if (activeCheckpoint) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setTrajectory(prev => [...prev, {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            timestamp: new Date().toISOString()
          }]);
        },
        (err) => console.error("GPS Watch Error:", err),
        { enableHighAccuracy: true }
      );
    } else {
      setTrajectory([]);
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [activeCheckpoint]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineData();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial sync check
    syncOfflineData();
    refreshPendingCount();

    fetch('/api/security/patrol/checkpoints', { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        setCheckpoints(data);
        localStorage.setItem('patrol_checkpoints', JSON.stringify(data));
        setLoading(false);
      })
      .catch(err => {
        console.warn("Offline mode: Loading checkpoints from localStorage");
        const localData = JSON.parse(localStorage.getItem('patrol_checkpoints') || '[]');
        if (localData.length > 0) {
          setCheckpoints(localData);
        }
        setLoading(false);
      });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineData, refreshPendingCount]);

  const triggerFeedback = (type: 'success' | 'error') => {
    // Vibration
    if ('vibrate' in navigator) {
      if (type === 'success') {
        navigator.vibrate([100]);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    }
    // Sound
    playBeep(type);
  };

  const handleScan = async () => {
    setScanning(true);
    // Simulate camera scan delay
    setTimeout(async () => {
      setScanning(false);
      setVerifying(true);
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const nextCheckpoint = checkpoints.find(c => c.status === 'pending');
          
          if (nextCheckpoint) {
            const payload = {
              qr_hash: (nextCheckpoint as any).qr_hash || 'qr_gate_1',
              lat: latitude,
              lon: longitude
            };

            if (!navigator.onLine) {
              // Offline logic with IndexedDB
              await savePendingLocation({
                tenantId,
                checkpointId: nextCheckpoint.id,
                payload,
                timestamp: Date.now()
              });

              // Mock activation for offline
              setActiveCheckpoint({
                ...nextCheckpoint,
                check_items: [
                  { 
                    id: "item_1", 
                    task: "Kiểm tra hệ thống PCCC", 
                    type: "toggle", 
                    required: true,
                    description: "Kiểm tra áp suất bình chữa cháy và vòi phun.",
                    expected_format: "Trạng thái Bật/Tắt",
                    instructions: "Đảm bảo kim đồng hồ nằm trong vùng xanh. Không có vật cản trước bình."
                  },
                  { 
                    id: "item_2", 
                    task: "Kiểm tra khóa cửa an ninh", 
                    type: "toggle", 
                    required: true,
                    description: "Xác nhận tất cả các cửa ra vào đã được khóa chốt.",
                    expected_format: "Trạng thái Bật/Tắt",
                    instructions: "Thử kéo tay nắm cửa để chắc chắn khóa đã khớp."
                  },
                  { 
                    id: "item_3", 
                    task: "Chụp ảnh hiện trạng khu vực", 
                    type: "photo", 
                    required: true,
                    description: "Chụp ảnh bao quát khu vực tuần tra.",
                    expected_format: "Hình ảnh thực tế",
                    instructions: "Ảnh phải rõ nét, không bị nhòe, bao quát được các góc quan trọng."
                  }
                ]
              });
              setStartTime(Date.now());
              setChecklistValues({ item_1: false, item_2: false, item_3: null });
              
              triggerFeedback('success');
              setMessage({ text: `Đã lưu tạm (Offline). Hãy tiếp tục!`, type: 'warning' });
              setVerifying(false);
              refreshPendingCount();
              return;
            }

            try {
              const res = await fetch('/api/security/patrol/scan-qr', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
              });
              
              if (!res.ok) {
                throw new Error(`API Error: ${res.status}`);
              }

              const data = await res.json();
              
              if (data.success) {
                const cpWithItems = data.checkpoint;
                setActiveCheckpoint(cpWithItems);
                setStartTime(Date.now());
                const initialValues: Record<string, any> = {};
                (cpWithItems.check_items || []).forEach((item: any) => {
                  initialValues[item.id] = item.type === 'toggle' ? false : null;
                });
                setChecklistValues(initialValues);
                
                triggerFeedback('success');
              } else {
                triggerFeedback('error');
                setMessage({ text: "Sai mã QR. Thử lại.", type: 'error' });
              }
            } catch (err) {
              triggerFeedback('error');
              setMessage({ text: "Lỗi mạng hoặc xác thực. Thử lại.", type: 'error' });
            }
          } else {
            triggerFeedback('error');
            setMessage({ text: "Không có điểm tuần tra nào đang chờ.", type: 'warning' });
          }
          setVerifying(false);
        },
        (error) => {
          triggerFeedback('error');
          setMessage({ text: "Lỗi GPS.", type: 'error' });
          setVerifying(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }, 1500);
  };

  const handleCompleteCheckpoint = async () => {
    if (!activeCheckpoint || !startTime) return;
    setIsCompleting(true);
    setIsAnalyzing(true);
    
    const endTime = Date.now();
    const checkItemsData = (activeCheckpoint.check_items || []).map(item => ({
      id: item.id,
      task: item.task,
      type: item.type,
      value: checklistValues[item.id],
      is_gallery_upload: false,
      timestamp: new Date().toISOString()
    }));

    // Find photo if any
    const photoItem = checkItemsData.find(i => i.type === 'photo');
    const photoUrl = photoItem?.value;

    // AI Anomaly Detection ("The Watcher")
    const anomalyResult = await analyzePatrolAnomaly(trajectory, photoUrl);
    setIsAnalyzing(false);

    const reportData = {
      checkpointId: activeCheckpoint.id,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      checkItemsData,
      staffId: "NV001",
      deviceId: navigator.userAgent,
      location: null as any,
      anomaly: anomalyResult
    };

    // Get current position for final recording
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      reportData.location = { lat: latitude, lon: longitude };
      
      // Emit Real-time Update via Socket.io
      socket.emit('patrol_update', {
        tenantId,
        staffId: "NV001",
        checkpointName: activeCheckpoint.name,
        status: 'COMPLETED',
        anomaly: anomalyResult
      });

      if (!navigator.onLine) {
        await savePendingReport({
          tenantId,
          checkpointId: activeCheckpoint.id,
          reportData,
          timestamp: Date.now()
        });

        const updatedCheckpoints = checkpoints.map(c => 
          c.id === activeCheckpoint.id ? { ...c, status: 'completed' as const } : c
        );
        setCheckpoints(updatedCheckpoints);
        localStorage.setItem('patrol_checkpoints', JSON.stringify(updatedCheckpoints));
        
        setActiveCheckpoint(null);
        setChecklistValues({});
        setStartTime(null);
        setMessage({ text: "Đã lưu tạm (Offline). Tiếp tục.", type: 'warning' });
        triggerFeedback('success');
        setIsCompleting(false);
        refreshPendingCount();
        return;
      }

      try {
        const res = await fetch('/api/security/patrol/complete', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(reportData)
        });

        if (res.ok) {
          const updatedCheckpoints = checkpoints.map(c => 
            c.id === activeCheckpoint.id ? { ...c, status: 'completed' as const } : c
          );
          setCheckpoints(updatedCheckpoints);
          localStorage.setItem('patrol_checkpoints', JSON.stringify(updatedCheckpoints));
          
          setActiveCheckpoint(null);
          setChecklistValues({});
          setStartTime(null);
          
          if (anomalyResult.isAnomaly) {
            setMessage({ text: `Cảnh báo AI: ${anomalyResult.reason}`, type: 'warning' });
            triggerFeedback('error');
          } else {
            setMessage({ text: "Đã xong. Tiếp tục.", type: 'success' });
            triggerFeedback('success');
          }
          refreshPendingCount();
        }
      } catch (err) {
        console.error(err);
        triggerFeedback('error');
        setMessage({ text: "Lỗi lưu dữ liệu.", type: 'error' });
      } finally {
        setIsCompleting(false);
      }
    }, () => {
      setIsCompleting(false);
      setMessage({ text: "Lỗi GPS: Không thể hoàn thành.", type: 'error' });
    });
  };

  const toggleCheckItem = (id: string) => {
    setChecklistValues(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    triggerFeedback('success');
  };

  const takePhoto = (id: string) => {
    // Simulate photo taking
    setChecklistValues(prev => ({
      ...prev,
      [id]: 'https://picsum.photos/seed/security/400/300'
    }));
    triggerFeedback('success');
  };

  const isChecklistValid = () => {
    if (!activeCheckpoint) return false;
    const items = activeCheckpoint.check_items || [];
    return items.every(item => {
      if (!item.required) return true;
      const val = checklistValues[item.id];
      if (item.type === 'toggle') return val === true;
      if (item.type === 'photo') return !!val;
      return true;
    });
  };

  const getTaskIcon = (task: string) => {
    const t = task.toLowerCase();
    if (t.includes('pccc') || t.includes('lửa') || t.includes('cháy')) return <Flame className="text-orange-500" size={32} />;
    if (t.includes('khóa') || t.includes('cửa')) return <Lock className="text-blue-500" size={32} />;
    if (t.includes('điện') || t.includes('trạm')) return <Zap className="text-yellow-500" size={32} />;
    return <ClipboardCheck className="text-emerald-500" size={32} />;
  };

  const handleSendReport = async () => {
    if (activeCheckpoint) {
      if (isChecklistValid()) {
        await handleCompleteCheckpoint();
      } else {
        setMessage({ text: "Vui lòng hoàn thành checklist trước khi gửi.", type: 'error' });
      }
    } else {
      if (navigator.onLine) {
        await syncOfflineData();
      } else {
        setMessage({ text: "Không có kết nối mạng để gửi báo cáo.", type: 'error' });
      }
    }
  };

  const isChecklistIncomplete = activeCheckpoint && !isChecklistValid();
  const isOfflineAndNoData = isOffline && pendingCount === 0 && !activeCheckpoint;
  const isSendDisabled = isChecklistIncomplete || isOfflineAndNoData || isCompleting || verifying;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-scmd-cyber" size={32} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-6 pb-32"
    >
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{translations.security.patrol_route}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Ca sáng • Khu vực A</p>
            {isOffline ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-scmd-alert/20 text-scmd-alert rounded-full text-[8px] font-black tracking-widest">
                <WifiOff size={10} /> OFFLINE
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-scmd-safety/20 text-scmd-safety rounded-full text-[8px] font-black tracking-widest">
                <Wifi size={10} /> ONLINE
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
              <Send size={18} />
            </div>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-scmd-cyber text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-scmd-navy animate-bounce">
                {pendingCount}
              </span>
            )}
          </div>
          <SCMDStatusBadge status="patrolling" />
        </div>
      </header>

      <div className="space-y-3">
        {checkpoints.map((checkpoint, index) => (
          <motion.div
            key={checkpoint.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <SCMDCard 
              className={cn(
                "p-4 flex flex-row items-center gap-4 border-2 transition-all duration-300",
                checkpoint.status === 'completed' 
                  ? "border-scmd-safety/30 bg-scmd-safety/5 opacity-60" 
                  : index === checkpoints.findIndex(c => c.status === 'pending')
                    ? "border-scmd-cyber/50 bg-scmd-cyber/5 shadow-[0_0_20px_rgba(0,255,242,0.1)]"
                    : "border-slate-800 bg-slate-900/50"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500",
                checkpoint.status === 'completed' 
                  ? "bg-scmd-safety text-white rotate-0" 
                  : index === checkpoints.findIndex(c => c.status === 'pending')
                    ? "bg-scmd-cyber text-slate-950 animate-pulse scale-110"
                    : "bg-slate-800 text-slate-500"
              )}>
                {checkpoint.status === 'completed' ? <CheckCircle2 size={24} strokeWidth={3} /> : <MapPin size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-black text-lg truncate transition-colors",
                  checkpoint.status === 'completed' ? "text-slate-400" : "text-white"
                )}>{checkpoint.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                    checkpoint.status === 'completed' ? "bg-slate-800 text-slate-500" : "bg-slate-800 text-scmd-cyber"
                  )}>
                    {checkpoint.status === 'completed' ? "Hoàn thành" : "Đang chờ"}
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold">
                    {checkpoint.latitude?.toFixed(4)}, {checkpoint.longitude?.toFixed(4)}
                  </span>
                </div>
              </div>
              {checkpoint.status === 'pending' && index === checkpoints.findIndex(c => c.status === 'pending') && (
                <div className="w-2 h-2 bg-scmd-cyber rounded-full animate-ping" />
              )}
            </SCMDCard>
          </motion.div>
        ))}
      </div>

      {/* Optimized Action Bar - Thumb Friendly & Professional */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-scmd-navy via-scmd-navy/80 to-transparent z-50">
        <div className="max-w-md mx-auto flex items-center justify-between gap-6">
          {/* Secondary Action: Help/SOS or Sync */}
          <button
            onClick={() => setMessage({ text: "Đang kết nối với trung tâm chỉ huy...", type: 'warning' })}
            className="w-14 h-14 rounded-2xl bg-slate-800/50 backdrop-blur border border-slate-700 flex items-center justify-center text-slate-400 active:scale-90 transition-all"
          >
            <HelpCircle size={24} />
          </button>

          {/* Primary Action: SCAN QR (Central FAB) */}
          <div className="relative -mt-12">
            <button
              onClick={handleScan}
              disabled={scanning || verifying}
              className={cn(
                "w-24 h-24 rounded-[32px] flex flex-col items-center justify-center transition-all relative z-10",
                scanning || verifying
                  ? "bg-slate-800 text-slate-500"
                  : "bg-scmd-cyber text-slate-950 shadow-[0_0_40px_rgba(0,255,242,0.5)] active:scale-95 active:rotate-6"
              )}
            >
              {scanning || verifying ? (
                <Loader2 className="animate-spin" size={32} />
              ) : (
                <>
                  <QrCode size={40} strokeWidth={2.5} />
                  <span className="text-[8px] font-black uppercase tracking-widest mt-1">Quét QR</span>
                </>
              )}
              {!scanning && !verifying && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-white"></span>
                </span>
              )}
            </button>
            {/* Decorative ring */}
            <div className="absolute inset-0 rounded-[32px] border-4 border-scmd-cyber/20 animate-pulse -m-2" />
          </div>

          {/* Secondary Action: Send Report */}
          <button
            onClick={handleSendReport}
            disabled={isSendDisabled}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
              isSendDisabled 
                ? "bg-slate-800/50 text-slate-600 border border-slate-800" 
                : "bg-white text-slate-950 shadow-xl shadow-white/10 active:scale-90 border border-white"
            )}
            title="Gửi báo cáo"
          >
            <Send size={24} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {selectedItemInfo && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItemInfo(null)}
              className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-navy-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-scmd-cyber/20 rounded-2xl flex items-center justify-center text-scmd-cyber">
                  <HelpCircle size={24} />
                </div>
                <button 
                  onClick={() => setSelectedItemInfo(null)}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <h3 className="text-xl font-black text-white mb-4">{selectedItemInfo.task}</h3>
              
              <div className="space-y-6">
                {selectedItemInfo.description && (
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mô tả</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{selectedItemInfo.description}</p>
                  </div>
                )}
                
                {selectedItemInfo.expected_format && (
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Định dạng yêu cầu</p>
                    <p className="text-sm text-scmd-cyber font-bold">{selectedItemInfo.expected_format}</p>
                  </div>
                )}

                {selectedItemInfo.instructions && (
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Zap size={12} /> Hướng dẫn thực hiện
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      "{selectedItemInfo.instructions}"
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedItemInfo(null)}
                className="w-full mt-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
              >
                Đã hiểu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCheckpoint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy-950 z-[100] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-navy-800 flex justify-between items-center bg-navy-900/50 backdrop-blur-md">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">{activeCheckpoint.name}</h2>
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-1">Danh mục kiểm tra • Think Zero</p>
              </div>
              <button 
                onClick={() => setActiveCheckpoint(null)}
                className="p-3 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            {/* Checklist Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {(activeCheckpoint.check_items || []).map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <SCMDCard
                    className={cn(
                      "p-6 border-4 transition-all duration-500 flex items-center gap-6 min-h-[120px]",
                      checklistValues[item.id] 
                        ? "bg-emerald-500/20 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]" 
                        : "bg-scmd-navy border-slate-800"
                    )}
                    onClick={() => item.type === 'toggle' && toggleCheckItem(item.id)}
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-500",
                      checklistValues[item.id] ? "bg-emerald-500 text-white" : "bg-slate-800"
                    )}>
                      {checklistValues[item.id] ? <Check size={40} strokeWidth={3} /> : getTaskIcon(item.task)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-black text-xl leading-tight transition-colors duration-500",
                          checklistValues[item.id] ? "text-emerald-400" : "text-white"
                        )}>{item.task}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemInfo(item);
                          }}
                          className="p-1 text-slate-500 hover:text-scmd-cyber transition-colors"
                        >
                          <HelpCircle size={20} />
                        </button>
                      </div>
                      {item.required && !checklistValues[item.id] && (
                        <span className="text-[12px] font-black text-scmd-alert uppercase tracking-tighter mt-1 block">Bắt buộc</span>
                      )}
                    </div>

                    {item.type === 'photo' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); takePhoto(item.id); }}
                        className={cn(
                          "w-20 h-20 rounded-2xl flex items-center justify-center transition-all shrink-0",
                          checklistValues[item.id] 
                            ? "bg-emerald-500 text-white" 
                            : "bg-scmd-cyber text-slate-950 shadow-lg shadow-scmd-cyber/20"
                        )}
                      >
                        {checklistValues[item.id] ? (
                          <img 
                            src={checklistValues[item.id]} 
                            className="w-full h-full object-cover rounded-2xl" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Camera size={36} />
                        )}
                      </button>
                    )}
                  </SCMDCard>
                </motion.div>
              ))}

              {(activeCheckpoint.check_items || []).length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
                  <ClipboardCheck size={64} className="opacity-20" />
                  <p className="text-center font-medium">Mục tiêu này không có checklist.<br/>Bạn có thể hoàn thành ngay.</p>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-8 bg-scmd-navy/80 backdrop-blur-xl border-t border-slate-800">
              <button
                onClick={handleCompleteCheckpoint}
                disabled={isSendDisabled}
                className={cn(
                  "w-full h-20 rounded-2xl font-black text-2xl uppercase tracking-widest transition-all duration-500 flex items-center justify-center gap-4",
                  !isSendDisabled 
                    ? "bg-emerald-500 text-white shadow-[0_0_50px_rgba(16,185,129,0.4)] translate-y-0" 
                    : "bg-slate-800 text-slate-600 translate-y-2 opacity-50"
                )}
              >
                {isCompleting || isAnalyzing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {isAnalyzing ? "AI Đang phân tích..." : "Đang lưu..."}
                    </span>
                  </div>
                ) : (
                  <>
                    <Send size={32} />
                    GỬI BÁO CÁO
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-48 left-4 right-4 p-4 rounded-xl shadow-lg text-center font-medium z-50 flex items-center justify-center gap-2",
              message.type === 'success' ? "bg-emerald-600 text-white" : 
              message.type === 'warning' ? "bg-yellow-500 text-slate-900" : "bg-red-600 text-white"
            )}
          >
            {message.type === 'warning' && <AlertCircle size={18} />}
            {message.text}
            <button 
              onClick={() => setMessage(null)}
              className="absolute top-1 right-2 text-white/50"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

