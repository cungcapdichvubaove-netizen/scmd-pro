import { useState, useEffect, useCallback } from 'react';
import { useDashboardStore } from '../../store/useDashboardStore.js';
import { Checkpoint, CheckpointStatus } from '../../../../server/domain/entities.js';
import { addToSyncQueue } from '../../../../lib/db.js';
import { SyncManager } from '../../../../lib/sync-manager';
import { signData } from '../../../../lib/crypto';
import { apiFetch } from '../../../../lib/api.js';
import { analyzePatrolAnomaly } from '../../../../services/ai-proxy.service';
import { validateGPSTrajectory, isMockedPosition } from '../../../../shared/utils/edge-validation.js';
import socket from '../../../../lib/socket';

export const usePatrolDashboardState = () => {
  const setPatrolLocation = useDashboardStore((s: any) => s.setPatrolLocation);
  const setActiveCheckpoint = useDashboardStore((s: any) => s.setActiveCheckpoint);
  const setPatrolOfflineStatus = useDashboardStore((s: any) => s.setPatrolOfflineStatus);
  const setPatrolPendingCount = useDashboardStore((s: any) => s.setPatrolPendingCount);
  const setPatrolTimes = useDashboardStore((s: any) => s.setPatrolTimes);
  const setNocFeed = useDashboardStore((s: any) => s.setNocFeed);

  // We only subscribe to activeCheckpoint and checkpoints here for logic
  const activeCheckpoint = useDashboardStore((s: any) => s.patrolState.activeCheckpoint);
  const isOffline = useDashboardStore((s: any) => s.patrolState.isOffline);
  const pendingCount = useDashboardStore((s: any) => s.patrolState.pendingCount);
  const lastCheckpointTime = useDashboardStore((s: any) => s.patrolState.lastCheckpointTime);
  const currentLocation = useDashboardStore((s: any) => s.patrolState.currentLocation);

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null);
  const [tenantId] = useState(localStorage.getItem('scmd_tenant_id') || 'tenant_1');
  
  const [checklistValues, setChecklistValues] = useState<Record<string, any>>({});
  const [selectedItemInfo, setSelectedItemInfo] = useState<any | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [trajectory, setTrajectory] = useState<{ lat: number; lon: number; timestamp: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Socket.io Listeners for real-time updates
  useEffect(() => {
    socket.emit('join_tenant', tenantId);

    const onPatrolUpdate = (data: any) => {
      // If our current route is updated by someone else, we might want to refresh
      // For now, we just add to NOC feed
      setNocFeed((prev: any[]) => [
        {
          id: Math.random().toString(),
          title: 'Cập nhật hệ thống',
          description: `Phát hiện cập nhật từ ${data.staffId} tại ${data.checkpointName}`,
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    };

    socket.on('patrol_update', onPatrolUpdate);
    
    return () => {
      socket.off('patrol_update', onPatrolUpdate);
    };
  }, [tenantId, setNocFeed]);

  const [deviceSecret] = useState(() => {
    let secret = localStorage.getItem('scmd_device_secret');
    if (!secret) {
      secret = `DS_${Math.random().toString(36).substring(2)}_${Date.now()}`;
      localStorage.setItem('scmd_device_secret', secret);
    }
    return secret;
  });

  const refreshPendingCount = useCallback(async () => {
    const count = await SyncManager.getPendingCount();
    setPatrolPendingCount(count);
  }, [setPatrolPendingCount]);

  useEffect(() => {
    return SyncManager.subscribe((status) => {
      setPatrolPendingCount(status.pending);
      setIsSyncing(status.syncing);
      if (status.lastError) {
        console.error("[Sync] Manager reported error:", status.lastError);
      }
    });
  }, [setPatrolPendingCount]);

  const playBeep = useCallback((type: 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); 
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Audio feedback failed", e);
    }
  }, []);

  const triggerFeedback = useCallback((type: 'success' | 'error') => {
    if ('vibrate' in navigator) {
      if (type === 'success') {
        navigator.vibrate([100]);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    }
    playBeep(type);
  }, [playBeep]);

  const syncOfflineData = useCallback(async () => {
    await SyncManager.triggerSync();
  }, []);

  useEffect(() => {
    let watchId: number | null = null;
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        
        if (isMockedPosition(pos)) {
          setMessage({ text: "Cảnh báo: Phát hiện phần mềm giả lập GPS!", type: 'error' });
          triggerFeedback('error');
          return;
        }

        const newPoint = {
          ...coords,
          timestamp: new Date().toISOString()
        };

        if (activeCheckpoint) {
          const edgeResult = validateGPSTrajectory(trajectory, newPoint);
          if (!edgeResult.isValid) {
            console.warn(`[Edge Watcher] ${edgeResult.reason}`);
            setMessage({ text: edgeResult.reason || "Dữ liệu di chuyển không hợp lệ", type: 'warning' });
            triggerFeedback('error');
          }
          setTrajectory(prev => [...prev, newPoint]);
        }
        setPatrolLocation(coords);
      },
      (err) => console.error("GPS Watch Error:", err),
      { enableHighAccuracy: true }
    );

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [activeCheckpoint, trajectory, triggerFeedback, setPatrolLocation]);

  useEffect(() => {
    const handleOnline = () => {
      setPatrolOfflineStatus(false);
      syncOfflineData();
    };
    const handleOffline = () => setPatrolOfflineStatus(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    syncOfflineData();
    refreshPendingCount();

    const fetchAllCheckpoints = async (allCheckpoints: Checkpoint[] = [], cursor: string | null = null): Promise<Checkpoint[]> => {
      try {
        const url = new URL('/api/security/patrol/checkpoints', window.location.origin);
        if (cursor) url.searchParams.set('cursor', cursor);
        url.searchParams.set('limit', '100'); // Balanced limit for performance vs roundtrips

        const result = await apiFetch(url.toString());
        const pageData = Array.isArray(result) ? result : (result?.data || []);
        const nextCursor = result?.nextCursor;
        const hasMore = result?.hasMore;
        
        const combined = [...allCheckpoints, ...pageData];
        
        // Safety cap: Stop auto-fetching after 500 checkpoints for dashboard UI stability
        if (hasMore && nextCursor && combined.length < 500) {
          return fetchAllCheckpoints(combined, nextCursor);
        }
        
        return combined;
      } catch (err) {
        console.warn("Fetch error, falling back to local/cached data:", err);
        throw err;
      }
    };

    setLoading(true);
    fetchAllCheckpoints()
      .then(data => {
        setCheckpoints(data);
        localStorage.setItem('patrol_checkpoints', JSON.stringify(data));
        setLoading(false);
      })
      .catch(_err => {
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

  const handleScan = useCallback(async () => {
    setScanning(true);
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
              const t = Date.now();
              const signature = await signData(JSON.stringify(payload) + t, deviceSecret);
              
              await addToSyncQueue({
                type: 'LOCATION',
                tenantId,
                data: payload,
                timestamp: t,
                signature,
                retryCount: 0,
                status: 'PENDING'
              });

              // Use actual check items if available in cached checkpoint
              const checkItems = Array.isArray(nextCheckpoint.check_items) && nextCheckpoint.check_items.length > 0
                ? nextCheckpoint.check_items
                : [
                  { 
                    id: "item_1", task: "Kiểm tra hệ thống PCCC", type: "toggle", required: true,
                    description: "Kiểm tra áp suất bình chữa cháy và vòi phun.",
                    expected_format: "Trạng thái Bật/Tắt",
                    instructions: "Đảm bảo kim đồng hồ nằm trong vùng xanh. Không có vật cản trước bình."
                  },
                  { 
                    id: "item_2", task: "Kiểm tra khóa cửa an ninh", type: "toggle", required: true,
                  },
                  { 
                    id: "item_3", task: "Chụp ảnh hiện trạng khu vực", type: "photo", required: true,
                  }
                ];

              setActiveCheckpoint({
                ...nextCheckpoint,
                check_items: checkItems
              });
              
              setStartTime(Date.now());
              
              // Initialize values correctly
              const initialValues: Record<string, any> = {};
              checkItems.forEach((item: any) => {
                initialValues[item.id] = item.type === 'toggle' ? false : null;
              });
              setChecklistValues(initialValues);
              
              triggerFeedback('success');
              setMessage({ text: `Đã lưu trạm "${nextCheckpoint.name}" (Ngoại tuyến)`, type: 'warning' });
              setVerifying(false);
              refreshPendingCount();
              return;
            }

            try {
              const data = await apiFetch('/api/security/patrol/scan-qr', {
                method: 'POST',
                body: JSON.stringify(payload)
              });
              
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
              console.warn("Scan API failed, falling back to offline", err);
              const t = Date.now();
              const signature = await signData(JSON.stringify(payload) + t, deviceSecret);
              
              await addToSyncQueue({
                type: 'LOCATION', tenantId, data: payload, timestamp: t, signature, retryCount: 0, status: 'PENDING'
              });

              setActiveCheckpoint({
                ...nextCheckpoint,
                check_items: [
                  { id: "item_1", task: "Kiểm tra hệ thống", type: "toggle", required: true },
                  { id: "item_2", task: "Kiểm tra bảo mật", type: "toggle", required: true },
                  { id: "item_3", task: "Chụp ảnh", type: "photo", required: true }
                ]
              });
              setStartTime(Date.now());
              setChecklistValues({ item_1: false, item_2: false, item_3: null });
              triggerFeedback('success');
              setMessage({ text: `Đã lưu tạm (Offline fallback). Hãy tiếp tục!`, type: 'warning' });
              refreshPendingCount();
            }
          } else {
            triggerFeedback('error');
            setMessage({ text: "Không có điểm tuần tra nào đang chờ.", type: 'warning' });
          }
          setVerifying(false);
        },
        (_error) => {
          triggerFeedback('error');
          setMessage({ text: "Lỗi GPS.", type: 'error' });
          setVerifying(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }, 1500);
  }, [checkpoints, tenantId, deviceSecret, triggerFeedback, refreshPendingCount, setActiveCheckpoint]);

  const handleCompleteCheckpoint = useCallback(async () => {
    if (!activeCheckpoint || !startTime) return;
    setIsCompleting(true);
    setIsAnalyzing(true);
    
    const endTime = Date.now();
    const checkItemsData = (activeCheckpoint.check_items || []).map((item: any) => ({
      id: item.id, task: item.task, type: item.type, value: checklistValues[item.id], is_gallery_upload: false, timestamp: new Date().toISOString()
    }));

    const photoItem = checkItemsData.find((i: any) => i.type === 'photo');
    const photoUrl = photoItem?.value;

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

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      reportData.location = { lat: latitude, lon: longitude };

      const finalizeOffline = async () => {
        const t = Date.now();
        const signature = await signData(JSON.stringify(reportData) + t, deviceSecret);

        await addToSyncQueue({
          type: 'REPORT', tenantId, data: reportData, timestamp: t, signature, retryCount: 0, status: 'PENDING'
        });

        const updatedCheckpoints = Array.isArray(checkpoints)
          ? checkpoints.map(c => c.id === activeCheckpoint.id ? { ...c, status: CheckpointStatus.COMPLETED } : c)
          : [];
        setCheckpoints(updatedCheckpoints);
        localStorage.setItem('patrol_checkpoints', JSON.stringify(updatedCheckpoints));
        
        setActiveCheckpoint(null);
        setChecklistValues({});
        setStartTime(null);
        setPatrolTimes({ lastCheckpointTime: Date.now() });
        triggerFeedback('success');
        refreshPendingCount();
      };

      if (!navigator.onLine) {
        await finalizeOffline();
        setMessage({ text: "Đã lưu tạm (Offline). Tiếp tục.", type: 'warning' });
        setIsCompleting(false);
        return;
      }

      try {
        await apiFetch('/api/security/patrol/complete', {
          method: 'POST',
          body: JSON.stringify(reportData)
        });

        const updatedCheckpoints = Array.isArray(checkpoints)
          ? checkpoints.map(c => c.id === activeCheckpoint.id ? { ...c, status: CheckpointStatus.COMPLETED } : c)
          : [];
        setCheckpoints(updatedCheckpoints);
          localStorage.setItem('patrol_checkpoints', JSON.stringify(updatedCheckpoints));
          
          setActiveCheckpoint(null);
          setChecklistValues({});
          setStartTime(null);
          setPatrolTimes({ lastCheckpointTime: Date.now() });
          
          if (anomalyResult.isAnomaly) {
            setMessage({ text: `Cảnh báo AI: ${anomalyResult.reason}`, type: 'warning' });
            triggerFeedback('error');
          } else {
            setMessage({ text: "Đã xong. Tiếp tục.", type: 'success' });
            triggerFeedback('success');
          }
          refreshPendingCount();
      } catch (err) {
        console.error(err);
        await finalizeOffline();
        setMessage({ text: "Đã lưu tạm (Offline fallback). Tiếp tục.", type: 'warning' });
      } finally {
        setIsCompleting(false);
      }
    }, () => {
      setIsCompleting(false);
      setMessage({ text: "Lỗi GPS: Không thể hoàn thành.", type: 'error' });
    });
  }, [activeCheckpoint, startTime, checklistValues, trajectory, tenantId, deviceSecret, checkpoints, refreshPendingCount, triggerFeedback, setActiveCheckpoint, setPatrolTimes]);

  const toggleCheckItem = useCallback((id: string) => {
    setChecklistValues(prev => ({ ...prev, [id]: !prev[id] }));
    triggerFeedback('success');
  }, [triggerFeedback]);

  const takePhoto = useCallback((id: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!navigator.onLine) {
        const reader = new FileReader();
        reader.onload = (re) => {
          const base64 = re.target?.result as string;
          setChecklistValues(prev => ({ ...prev, [id]: base64 }));
          triggerFeedback('success');
          setMessage({ text: "Ảnh đã lưu cục bộ (Chờ đồng bộ)", type: 'warning' });
        };
        reader.readAsDataURL(file);
        return;
      }

      const formData = new FormData();
      formData.append('photo', file);
      formData.append('type', 'PATROL');

      try {
        const result = await apiFetch('/api/tenant/patrol/upload-photo', {
          method: 'POST',
          body: formData
        });
        if (result.url) {
          setChecklistValues(prev => ({ ...prev, [id]: result.url }));
          triggerFeedback('success');
        } else {
           triggerFeedback('error');
        }
      } catch (error) {
        triggerFeedback('error');
      }
    };
    input.click();
  }, [triggerFeedback]);

  const isChecklistValid = useCallback(() => {
    if (!activeCheckpoint) return false;
    const items = activeCheckpoint.check_items || [];
    return items.every((item: any) => {
      if (!item.required) return true;
      const val = checklistValues[item.id];
      if (item.type === 'toggle') return val === true;
      if (item.type === 'photo') return !!val;
      return true;
    });
  }, [activeCheckpoint, checklistValues]);

  const isPatrolDone = Array.isArray(checkpoints) && checkpoints.length > 0 && checkpoints.every(c => c.status === 'completed');

  const handleSendReport = useCallback(async () => {
    if (activeCheckpoint) {
      if (isChecklistValid()) {
        await handleCompleteCheckpoint();
      } else {
        setMessage({ text: "Vui lòng hoàn thành checklist trước khi gửi.", type: 'error' });
      }
    } else {
      // If patrol is done, suggest closing shift
      if (isPatrolDone) {
        const confirmClose = window.confirm("Lộ trình đã hoàn tất. Bạn có muốn gửi báo cáo tổng kết và CHỐT CA LÀM VIỆC không?");
        if (confirmClose) {
          try {
            setIsCompleting(true);
            await apiFetch('/api/tenant/attendance/check-out', {
              method: 'POST',
              body: JSON.stringify({
                notes: "Tự động đóng ca sau khi hoàn thành toàn bộ lộ trình tuần tra."
              })
            });
            setMessage({ text: "Đã gửi báo cáo và chốt ca làm việc thành công!", type: 'success' });
            triggerFeedback('success');
            // Refresh checkpoints or redirect if needed
          } catch (err) {
            setMessage({ text: "Gửi báo cáo ca thất bại. Vui lòng thử lại.", type: 'error' });
          } finally {
            setIsCompleting(false);
          }
          return;
        }
      }

      if (navigator.onLine) {
        await syncOfflineData();
      } else {
        setMessage({ text: "Không có kết nối mạng để gửi báo cáo.", type: 'error' });
      }
    }
  }, [activeCheckpoint, isChecklistValid, handleCompleteCheckpoint, syncOfflineData, isPatrolDone, triggerFeedback]);

  const isChecklistIncomplete = activeCheckpoint && !isChecklistValid();
  const isOfflineAndNoData = isOffline && pendingCount === 0 && !activeCheckpoint;
  const isSendDisabled = isChecklistIncomplete || isOfflineAndNoData || isCompleting || verifying;

  return {
    checkpoints, setCheckpoints,
    loading, setLoading,
    scanning, setScanning,
    verifying, setVerifying,
    message, setMessage,
    isOffline, setPatrolOfflineStatus,
    currentLocation, setPatrolLocation,
    activeCheckpoint, setActiveCheckpoint,
    checklistValues, setChecklistValues,
    selectedItemInfo, setSelectedItemInfo,
    startTime, setStartTime,
    isCompleting, setIsCompleting,
    pendingCount, setPatrolPendingCount,
    trajectory, setTrajectory,
    isAnalyzing, setIsAnalyzing,
    lastCheckpointTime,
    isSyncing, setIsSyncing,
    handleScan,
    handleCompleteCheckpoint,
    toggleCheckItem,
    takePhoto,
    isChecklistValid,
    handleSendReport,
    isChecklistIncomplete,
    isOfflineAndNoData,
    isSendDisabled,
    isPatrolDone,
    syncOfflineData,
  };
};
