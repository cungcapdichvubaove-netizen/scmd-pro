import type { ActiveTab } from '../types';
import type { FilterField, FilterOption, TabFilterConfig } from './filterTypes';

export type FilterOptionSource = {
  sites?: FilterOption[];
  vendors?: FilterOption[];
  contracts?: FilterOption[];
  staff?: FilterOption[];
};

const uniqueOptions = (items: FilterOption[] | undefined, allOption: FilterOption) => {
  const seen = new Set<string>();
  const cleaned = (items ?? [])
    .map((item) => ({ value: String(item.value || '').trim(), label: String(item.label || '').trim() }))
    .filter((item) => item.value && item.label && item.value !== allOption.value)
    .filter((item) => {
      const key = item.value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  return [allOption, ...cleaned];
};

const periodOptions = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'current-shift', label: 'Ca hiện tại' },
  { value: 'week', label: '7 ngày' },
  { value: 'month', label: '30 ngày' },
];

const statusOptions = [
  { value: 'all-status', label: 'Tất cả trạng thái' },
  { value: 'ok', label: 'Đạt chuẩn' },
  { value: 'warning', label: 'Cảnh báo' },
  { value: 'breach', label: 'Vi phạm' },
];

const riskOptions = [
  { value: 'all-risk', label: 'Tất cả rủi ro' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'LOW', label: 'Thấp' },
];

const currentMonth = new Date().toISOString().slice(0, 7);

export const getTabFilterConfig = (tab: ActiveTab, sources: FilterOptionSource = {}): TabFilterConfig | null => {
  const siteOptions = uniqueOptions(sources.sites, { value: 'all-sites', label: 'Tất cả mục tiêu' });
  const vendorOptions = uniqueOptions(sources.vendors, { value: 'all-vendors', label: 'Tất cả nhà cung cấp' });
  const contractOptions = uniqueOptions(sources.contracts, { value: 'all-contracts', label: 'Tất cả hợp đồng' });
  const staffOptions = uniqueOptions(sources.staff, { value: 'all-staff', label: 'Tất cả người phụ trách' });

  const contractFilter: FilterField = {
    type: 'select',
    key: 'contractId',
    label: 'Hợp đồng',
    options: contractOptions,
  };

  const assigneeFilter: FilterField = {
    type: 'select',
    key: 'assignee',
    label: 'Người phụ trách',
    options: staffOptions,
  };

  const configs: Partial<Record<ActiveTab, TabFilterConfig>> = {
    overview: {
      tab: 'overview',
      title: 'Bộ lọc hàng đợi vận hành',
      defaults: { period: 'today', site: 'all-sites', vendor: 'all-vendors', priority: 'priority-first', issueType: 'all-issues', slaRisk: 'all-sla', owner: '' },
      primary: [
        { type: 'select', key: 'period', label: 'Thời gian', options: periodOptions },
        { type: 'select', key: 'site', label: 'Mục tiêu', options: siteOptions },
        { type: 'select', key: 'vendor', label: 'Nhà cung cấp', options: vendorOptions },
        { type: 'select', key: 'priority', label: 'Ưu tiên', options: [
          { value: 'priority-first', label: 'Ưu tiên trước' },
          { value: 'critical', label: 'Cao' },
          { value: 'warning', label: 'Trung bình' },
          { value: 'all-priorities', label: 'Tất cả' },
        ] },
      ],
      advanced: [
        { type: 'select', key: 'issueType', label: 'Loại vấn đề', options: [
          { value: 'all-issues', label: 'Tất cả vấn đề' },
          { value: 'incident', label: 'Sự cố' },
          { value: 'patrol', label: 'Tuần tra' },
          { value: 'attendance', label: 'Ca trực' },
          { value: 'evidence', label: 'Bằng chứng' },
        ] },
        { type: 'select', key: 'slaRisk', label: 'Rủi ro SLA', options: [
          { value: 'all-sla', label: 'Tất cả SLA' },
          { value: 'breaching', label: 'Quá hạn' },
          { value: 'approaching', label: 'Sắp quá hạn' },
        ] },
        { type: 'search', key: 'owner', label: 'Người phụ trách', placeholder: 'Tìm người phụ trách...' },
      ],
      persist: 'url+localStorage',
    },
    attendance: {
      tab: 'attendance',
      title: 'Bộ lọc ca trực',
      defaults: { shift: 'current-shift', site: 'all-sites', vendor: 'all-vendors', coverageStatus: 'all-status', guard: '', contractId: 'all-contracts', checkInStatus: 'all-checkin', gpsStatus: 'all-gps' },
      primary: [
        { type: 'select', key: 'shift', label: 'Ngày/Ca', options: periodOptions },
        { type: 'select', key: 'site', label: 'Mục tiêu', options: siteOptions },
        { type: 'select', key: 'vendor', label: 'Nhà cung cấp', options: vendorOptions },
        { type: 'select', key: 'coverageStatus', label: 'Quân số', options: statusOptions },
      ],
      advanced: [
        { type: 'search', key: 'guard', label: 'Bảo vệ', placeholder: 'Tìm tên hoặc mã bảo vệ...' },
        contractFilter,
        { type: 'select', key: 'checkInStatus', label: 'Check-in', options: [{ value: 'all-checkin', label: 'Tất cả' }, { value: 'late', label: 'Đi trễ' }, { value: 'missing', label: 'Chưa check-in' }] },
        { type: 'select', key: 'gpsStatus', label: 'GPS', options: [{ value: 'all-gps', label: 'Tất cả' }, { value: 'valid', label: 'Đúng vị trí' }, { value: 'invalid', label: 'Sai vị trí' }] },
      ],
      persist: 'url+localStorage',
    },
    sites: {
      tab: 'sites',
      title: 'Bộ lọc mục tiêu và chốt',
      defaults: { siteType: 'all-types', siteStatus: 'ACTIVE', vendor: 'all-vendors', contractId: 'all-contracts', postCount: 'all-posts', riskLevel: 'all-risk', gpsStatus: 'all-gps' },
      primary: [
        { type: 'select', key: 'siteType', label: 'Loại site', options: [{ value: 'all-types', label: 'Tất cả loại' }, { value: 'FACTORY', label: 'Nhà máy' }, { value: 'OFFICE', label: 'Văn phòng' }, { value: 'WAREHOUSE', label: 'Kho' }] },
        { type: 'select', key: 'siteStatus', label: 'Trạng thái', options: [{ value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'INACTIVE', label: 'Tạm dừng' }, { value: 'all-status', label: 'Tất cả' }] },
        { type: 'select', key: 'vendor', label: 'Nhà cung cấp', options: vendorOptions },
      ],
      advanced: [
        { type: 'select', key: 'site', label: 'Mục tiêu', options: siteOptions },
        contractFilter,
        { type: 'select', key: 'postCount', label: 'Số chốt', options: [{ value: 'all-posts', label: 'Tất cả' }, { value: 'missing-posts', label: 'Chưa có chốt' }, { value: 'many-posts', label: 'Nhiều chốt' }] },
        { type: 'select', key: 'riskLevel', label: 'Rủi ro', options: riskOptions },
        { type: 'select', key: 'gpsStatus', label: 'GPS', options: [{ value: 'all-gps', label: 'Tất cả' }, { value: 'has-gps', label: 'Có GPS' }, { value: 'missing-gps', label: 'Thiếu GPS' }] },
      ],
      persist: 'url+localStorage',
    },
    incidents: {
      tab: 'incidents',
      title: 'Bộ lọc sự cố',
      defaults: { status: 'open', severity: 'all-severity', site: 'all-sites', sla: 'risk-first', incidentType: 'all-types', assignee: 'all-staff', vendor: 'all-vendors', evidenceMissing: 'all-evidence' },
      primary: [
        { type: 'select', key: 'status', label: 'Trạng thái', options: [{ value: 'open', label: 'Sự cố mở' }, { value: 'closed', label: 'Đã đóng' }, { value: 'all-status', label: 'Tất cả' }] },
        { type: 'select', key: 'severity', label: 'Mức độ', options: [{ value: 'all-severity', label: 'Tất cả mức độ' }, { value: 'CRITICAL', label: 'Nghiêm trọng' }, { value: 'HIGH', label: 'Cao' }, { value: 'MEDIUM', label: 'Trung bình' }] },
        { type: 'select', key: 'site', label: 'Mục tiêu', options: siteOptions },
        { type: 'select', key: 'sla', label: 'SLA', options: [{ value: 'risk-first', label: 'Sắp quá SLA trước' }, { value: 'breached', label: 'Đã quá hạn' }, { value: 'within', label: 'Trong hạn' }] },
      ],
      advanced: [
        { type: 'select', key: 'incidentType', label: 'Loại sự cố', options: [{ value: 'all-types', label: 'Tất cả loại' }, { value: 'SECURITY_BREACH', label: 'Xâm nhập' }, { value: 'MISSING_GUARD', label: 'Thiếu bảo vệ' }, { value: 'CUSTOMER_COMPLAINT', label: 'Khiếu nại' }] },
        assigneeFilter,
        { type: 'select', key: 'vendor', label: 'Nhà cung cấp', options: vendorOptions },
        { type: 'select', key: 'evidenceMissing', label: 'Bằng chứng', options: [{ value: 'all-evidence', label: 'Tất cả' }, { value: 'missing', label: 'Thiếu bằng chứng' }, { value: 'complete', label: 'Đủ bằng chứng' }] },
      ],
      persist: 'url+localStorage',
    },
    vendors: {
      tab: 'vendors',
      title: 'Bộ lọc nhà cung cấp',
      defaults: { status: 'ACTIVE', riskLevel: 'all-risk', complianceScore: 'all-score', activeContract: 'all-contracts', siteCount: 'all-sites', violationCount: 'all-violations' },
      primary: [
        { type: 'select', key: 'vendor', label: 'Nhà cung cấp', options: vendorOptions },
        { type: 'select', key: 'status', label: 'Trạng thái', options: [{ value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'SUSPENDED', label: 'Tạm dừng' }, { value: 'all-status', label: 'Tất cả' }] },
        { type: 'select', key: 'riskLevel', label: 'Rủi ro', options: riskOptions },
      ],
      advanced: [
        { type: 'select', key: 'complianceScore', label: 'Điểm tuân thủ', options: [{ value: 'all-score', label: 'Tất cả' }, { value: 'below-80', label: 'Dưới 80' }, { value: 'above-90', label: 'Trên 90' }] },
        { type: 'select', key: 'activeContract', label: 'Hợp đồng active', options: [{ value: 'all-contracts', label: 'Tất cả' }, { value: 'yes', label: 'Có' }, { value: 'no', label: 'Không' }] },
        { type: 'select', key: 'siteCount', label: 'Số mục tiêu', options: [{ value: 'all-sites', label: 'Tất cả' }, { value: 'none', label: 'Chưa có site' }, { value: 'many', label: 'Nhiều site' }] },
        { type: 'select', key: 'violationCount', label: 'Vi phạm', options: [{ value: 'all-violations', label: 'Tất cả' }, { value: 'has-violations', label: 'Có vi phạm' }, { value: 'none', label: 'Không vi phạm' }] },
      ],
      persist: 'url+localStorage',
    },
    staff: {
      tab: 'staff',
      title: 'Bộ lọc nhân sự',
      defaults: { search: '', vendor: 'all-vendors', site: 'all-sites', status: 'active', role: 'all', certification: 'all-certification', assignmentStatus: 'all-assignments', contractId: 'all-contracts' },
      primary: [
        { type: 'search', key: 'search', placeholder: 'Tìm nhân sự...' },
        { type: 'select', key: 'vendor', label: 'Nhà cung cấp', options: vendorOptions },
        { type: 'select', key: 'site', label: 'Mục tiêu', options: siteOptions },
        { type: 'select', key: 'status', label: 'Trạng thái', options: [{ value: 'active', label: 'Đang hoạt động' }, { value: 'inactive', label: 'Tạm dừng' }, { value: 'all', label: 'Tất cả' }] },
      ],
      advanced: [
        { type: 'select', key: 'role', label: 'Vai trò', options: [{ value: 'all', label: 'Tất cả vai trò' }, { value: 'guard', label: 'Bảo vệ' }, { value: 'supervisor', label: 'Giám sát' }, { value: 'tenant-admin', label: 'Quản trị' }] },
        { type: 'select', key: 'certification', label: 'Chứng chỉ', options: [{ value: 'all-certification', label: 'Tất cả' }, { value: 'valid', label: 'Còn hạn' }, { value: 'expired', label: 'Hết hạn' }] },
        { type: 'select', key: 'assignmentStatus', label: 'Phân công', options: [{ value: 'all-assignments', label: 'Tất cả' }, { value: 'assigned', label: 'Đã gán' }, { value: 'unassigned', label: 'Chưa gán' }] },
        contractFilter,
      ],
      persist: 'url+localStorage',
    },
    violations: {
      tab: 'violations',
      title: 'Bộ lọc vi phạm dịch vụ',
      defaults: { status: 'new', severity: 'all-severity', violationType: 'all-types', site: 'all-sites', vendor: 'all-vendors', contractId: 'all-contracts', reviewStatus: 'all-review', penaltyStatus: 'all-penalties' },
      primary: [
        { type: 'select', key: 'status', label: 'Trạng thái', options: [{ value: 'new', label: 'Cần review' }, { value: 'accepted', label: 'Đã xác nhận' }, { value: 'waived', label: 'Đã miễn trừ' }, { value: 'all-status', label: 'Tất cả' }] },
        { type: 'select', key: 'severity', label: 'Mức độ', options: [{ value: 'all-severity', label: 'Tất cả' }, { value: 'CRITICAL', label: 'Nghiêm trọng' }, { value: 'WARNING', label: 'Cảnh báo' }] },
        { type: 'select', key: 'site', label: 'Mục tiêu', options: siteOptions },
        { type: 'select', key: 'vendor', label: 'Nhà cung cấp', options: vendorOptions },
      ],
      advanced: [
        { type: 'select', key: 'violationType', label: 'Loại vi phạm', options: [{ value: 'all-types', label: 'Tất cả loại' }, { value: 'MISSING_GUARD', label: 'Thiếu quân' }, { value: 'GPS_INVALID', label: 'Sai GPS' }, { value: 'PATROL_MISSED', label: 'Bỏ tuần tra' }, { value: 'EVIDENCE_MISSING', label: 'Thiếu bằng chứng' }] },
        contractFilter,
        { type: 'select', key: 'reviewStatus', label: 'Review', options: [{ value: 'all-review', label: 'Tất cả' }, { value: 'NEW', label: 'Mới' }, { value: 'REVIEWING', label: 'Đang review' }, { value: 'RESOLVED', label: 'Đã xử lý' }] },
        { type: 'select', key: 'penaltyStatus', label: 'Phạt', options: [{ value: 'all-penalties', label: 'Tất cả' }, { value: 'suggested', label: 'Đề xuất phạt' }, { value: 'waived', label: 'Đã miễn' }] },
      ],
      persist: 'url+localStorage',
    },
    tasks: {
      tab: 'tasks',
      title: 'Bộ lọc nhiệm vụ xử lý',
      defaults: { status: 'open', priority: 'all-priorities', source: 'all-sources', site: 'all-sites', vendor: 'all-vendors', assignee: 'all-staff', due: 'all-due' },
      primary: [
        { type: 'select', key: 'status', label: 'Trạng thái', options: [{ value: 'open', label: 'Đang mở' }, { value: 'PENDING', label: 'Chờ xử lý' }, { value: 'IN_PROGRESS', label: 'Đang làm' }, { value: 'COMPLETED', label: 'Hoàn tất' }, { value: 'all-status', label: 'Tất cả' }] },
        { type: 'select', key: 'priority', label: 'Ưu tiên', options: [{ value: 'all-priorities', label: 'Tất cả' }, { value: 'HIGH', label: 'Cao' }, { value: 'MEDIUM', label: 'Trung bình' }, { value: 'LOW', label: 'Thấp' }] },
        assigneeFilter,
        { type: 'select', key: 'due', label: 'Deadline', options: [{ value: 'all-due', label: 'Tất cả' }, { value: 'overdue', label: 'Quá hạn' }, { value: 'today', label: 'Hôm nay' }, { value: 'week', label: '7 ngày' }] },
      ],
      advanced: [
        { type: 'select', key: 'source', label: 'Nguồn phát sinh', options: [{ value: 'all-sources', label: 'Tất cả' }, { value: 'INCIDENT', label: 'Sự cố' }, { value: 'VIOLATION', label: 'Vi phạm' }, { value: 'AUDIT', label: 'Audit' }, { value: 'MANUAL', label: 'Thủ công' }] },
        { type: 'select', key: 'site', label: 'Mục tiêu', options: siteOptions },
        { type: 'select', key: 'vendor', label: 'Nhà cung cấp', options: vendorOptions },
      ],
      persist: 'url+localStorage',
    },
    reports: {
      tab: 'reports',
      title: 'Bộ lọc báo cáo',
      defaults: { month: currentMonth, vendor: 'all-vendors', reportStatus: 'all-status', contractId: 'all-contracts', site: 'all-sites', exportStatus: 'all-export' },
      primary: [
        { type: 'select', key: 'month', label: 'Tháng', options: [{ value: currentMonth, label: 'Tháng hiện tại' }] },
        { type: 'select', key: 'vendor', label: 'Nhà cung cấp', options: vendorOptions },
        { type: 'select', key: 'reportStatus', label: 'Trạng thái', options: [{ value: 'all-status', label: 'Tất cả' }, { value: 'DRAFT', label: 'Nháp' }, { value: 'FINALIZED', label: 'Đã chốt' }, { value: 'VENDOR_DISPUTED', label: 'Nhà thầu phản hồi' }] },
      ],
      advanced: [
        contractFilter,
        { type: 'select', key: 'site', label: 'Mục tiêu', options: siteOptions },
        { type: 'select', key: 'exportStatus', label: 'Export', options: [{ value: 'all-export', label: 'Tất cả' }, { value: 'has-pdf', label: 'Đã có PDF' }, { value: 'has-excel', label: 'Đã có Excel' }, { value: 'missing-export', label: 'Chưa xuất' }] },
      ],
      persist: 'url+localStorage',
    },
  };

  return configs[tab] ?? null;
};
