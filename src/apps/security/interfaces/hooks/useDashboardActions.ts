import { useState } from 'react';
import { apiFetch } from '../../../../lib/api';

/**
 * useDashboardActions — Hook quản lý các hành động nghiệp vụ tại Dashboard
 * Giúp tách biệt logic khỏi component UI chính.
 */
export function useDashboardActions(setMessage: (msg: any) => void) {
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugReport, setBugReport] = useState({ title: '', description: '', severity: 'LOW' });
  const [isReportingBug, setIsReportingBug] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleSubmitBug = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReportingBug(true);
    try {
      await apiFetch('/api/v1/help/bug-report', {
        method: 'POST',
        body: JSON.stringify(bugReport)
      });
      setMessage({ text: 'Báo cáo lỗi đã được gửi thành công!', type: 'success' });
      setShowBugModal(false);
      setBugReport({ title: '', description: '', severity: 'LOW' });
    } catch (error: any) {
      setMessage({ text: error.message || 'Lỗi khi gửi báo cáo', type: 'error' });
    } finally {
      setIsReportingBug(false);
    }
  };

  const handleExportWatcherReport = async () => {
    setMessage({ text: 'Đang chuẩn bị báo cáo PDF Watcher...', type: 'success' });
    try {
      const result = await apiFetch(`/api/v1/tenant/monitor/export-watcher-pdf`);
      if (result.jobId) {
        setMessage({ text: 'Đã gửi yêu cầu xuất PDF Watcher Report. Hệ thống đang tiến hành tạo...', type: 'success' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Lỗi khi xuất PDF', type: 'error' });
    }
  };

  const handleAnomalyFeedback = async (id: string, feed: 'true' | 'false') => {
    try {
      await apiFetch(`/api/v1/tenant/incidents/anomalies/${id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ feedback: feed })
      });
      setMessage({ text: 'Cảm ơn bạn đã phản hồi về tính chính xác của AI!', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message || 'Lỗi khi gửi phản hồi', type: 'error' });
    }
  };

  const onExportPriorities = () => {
    window.print();
  };

  return {
    showBugModal, setShowBugModal,
    bugReport, setBugReport,
    isReportingBug,
    showUpgradeModal, setShowUpgradeModal,
    handleSubmitBug,
    handleExportWatcherReport,
    handleAnomalyFeedback,
    onExportPriorities
  };
}
