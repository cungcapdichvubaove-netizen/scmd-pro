import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getSocket } from '../../../../lib/socket';
import { useDashboardStore } from '../../store/useDashboardStore';

export function useSocketEvents(
  fetchData: () => Promise<void> | void,
  dependencies: any[]
) {
  const { 
    setNocFeed, 
    setAnomalies, 
    setActiveSOS, 
  } = useDashboardStore(useShallow(state => ({
    setNocFeed: state.setNocFeed,
    setAnomalies: state.setAnomalies,
    setActiveSOS: state.setActiveSOS,
  })));

  useEffect(() => {
    let cancelled = false;
    let activeSocket: Awaited<ReturnType<typeof getSocket>> | null = null;

    fetchData();
    const tenantId = localStorage.getItem('scmd_tenant_id') || 'tenant_1';

    const onSosAlert = (data: any) => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('🚨 CẢNH BÁO SOS KHẨN CẤP', {
            body: `${data.message} (Nhân viên: ${data.staffId})`,
            icon: '/qr-main-entrance.png'
          });
        }
      }

      setActiveSOS(data);
      setNocFeed((prev: any[]) => [
        {
          id: Math.random().toString(),
          title: 'CẢNH BÁO SOS KHẨN CẤP',
          description: `${data.message} (Nhân viên: ${data.staffId})`,
          status: 'CRITICAL',
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
      try {
        new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3').play();
      } catch (e) {
        console.warn('Failed to play SOS audio:', e);
      }
    };

    const onNotification = (data: any) => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission();
        } else if (Notification.permission === 'granted' && data.isSecurityAlert) {
          new Notification(data.title || 'Thông báo', {
            body: data.message,
            icon: '/qr-main-entrance.png'
          });
        }
      }

      if (data.isSecurityAlert) {
        setNocFeed((prev: any[]) => [
          {
            id: data.id || Math.random().toString(),
            title: data.title,
            message: data.message,
            status: data.count > 1 ? 'CRITICAL' : 'WARNING',
            timestamp: data.timestamp || new Date().toISOString(),
            isGrouped: data.isGrouped,
            count: data.count,
            type: data.type,
          },
          ...prev,
        ]);
        if (data.isGrouped || data.type === 'SOS') {
          try {
            new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3').play();
          } catch (e) {
            console.warn('Failed to play notification audio:', e);
          }
        }
      }
    };

    const onPatrolUpdate = (data: any) => {
      setNocFeed((prev: any[]) => [
        {
          id: Math.random().toString(),
          title: 'Cập nhật tuần tra',
          description: `Nhân viên ${data.staffId} hoàn thành ${data.checkpointName}`,
          status: data.anomaly?.isAnomaly ? 'WARNING' : 'SUCCESS',
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
      if (data.anomaly?.isAnomaly) {
        setAnomalies((prev: any[]) => [
          {
            id: Math.random().toString(),
            title: 'Bất thường tuần tra (AI)',
            description: data.anomaly.reason,
            severity: 'WARNING',
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    };

    const bindSocketEvents = async () => {
      const socket = await getSocket();
      if (cancelled) {
        return;
      }

      activeSocket = socket;
      socket.emit('join_tenant', tenantId);
      socket.on('sos_alert', onSosAlert);
      socket.on('notification', onNotification);
      socket.on('patrol_update', onPatrolUpdate);
    };

    void bindSocketEvents();

    return () => {
      cancelled = true;
      activeSocket?.off('sos_alert', onSosAlert);
      activeSocket?.off('patrol_update', onPatrolUpdate);
      activeSocket?.off('notification', onNotification);
    };
  }, [setAnomalies, setNocFeed, setActiveSOS, ...dependencies]);
}
