import { useState } from 'react';
import { apiFetch } from '../../../../lib/api';
import { exportReport, type ReportColumn } from '../utils/reportExport';

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

  const onExportPriorities = (
    format: 'print' | 'excel' = 'print',
    tasks: Array<Record<string, any>> = [],
    context?: { tenantName?: string; generatedBy?: string }
  ) => {
    const normalizedRows = (tasks || []).map((task, index) => ({
      index: index + 1,
      severity: task.severity === 'CRITICAL' ? 'Khẩn cấp' : 'Cảnh báo',
      type: task.type === 'SOS' ? 'SOS' : task.type === 'MISSED' ? 'Bỏ sót' : (task.type || 'Khác'),
      title: task.title || 'Chưa có tiêu đề',
      description: task.description || 'Không có mô tả',
      status: task.status || 'Cần xử lý',
    }));

    const columns: ReportColumn<Record<string, any>>[] = [
      { key: 'severity', header: 'Mức độ', width: '90px', align: 'center' },
      { key: 'type', header: 'Loại', width: '90px', align: 'center' },
      { key: 'title', header: 'Nội dung ưu tiên' },
      { key: 'description', header: 'Mô tả / bằng chứng' },
      { key: 'status', header: 'Trạng thái', width: '110px', align: 'center' },
    ];

    exportReport(
      format,
      {
        title: 'Báo cáo ưu tiên ca trực',
        subtitle: 'Danh sách sự kiện cần xử lý được tổng hợp từ Command Center',
        organizationName: context?.tenantName || 'SCMD Pro',
        unitName: 'Trung tâm điều hành an ninh',
        reportPeriod: 'Ca trực hiện tại',
        generatedBy: context?.generatedBy || 'Tenant Admin',
      },
      columns,
      normalizedRows,
      [
        { label: 'Tổng ưu tiên', value: normalizedRows.length },
        { label: 'Khẩn cấp', value: normalizedRows.filter(row => row.severity === 'Khẩn cấp').length },
        { label: 'Cảnh báo', value: normalizedRows.filter(row => row.severity === 'Cảnh báo').length },
        { label: 'Nguồn dữ liệu', value: 'Command Center' },
      ],
    );
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
