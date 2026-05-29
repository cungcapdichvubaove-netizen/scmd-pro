import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock3,
  FileText,
  Paperclip,
  Plus,
  Route,
  Search,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useAuthStore } from '../../../common/store/useAuthStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getAuthHeaders } from '../../../common/utils/auth';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard';
import { ShiftSchedulerView } from './ShiftSchedulerView';
import { OpsSavedViews, OpsStatusBadge, opsRowClass, opsTableClass, opsTdClass, opsThClass } from './OpsTableSystem';

type WorkspaceTab = 'vendors' | 'sites' | 'contracts' | 'scheduler';
type ContractWorkspaceTab =
  | 'overview'
  | 'pricing'
  | 'posts'
  | 'staff-standards'
  | 'penalties'
  | 'checklist'
  | 'files'
  | 'versions';

interface VendorRecord {
  id: string;
  name: string;
  taxCode?: string;
  contactPerson?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  serviceScope?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  score?: number;
  _count?: { contracts?: number; sites?: number };
}

interface SiteRecord {
  id: string;
  siteName: string;
  address: string;
  siteType: string;
  status: 'ACTIVE' | 'INACTIVE';
  managerName?: string;
  managerPhone?: string;
  vendorId?: string;
  vendor?: VendorRecord;
  guardPosts?: GuardPostRecord[];
  contracts?: ContractRecord[];
}

interface GuardPostRecord {
  id: string;
  siteId: string;
  postName: string;
  postType: string;
  requiredGuardCount: number;
  gpsLat?: number;
  gpsLng?: number;
  radiusMeters: number;
  status: 'ACTIVE' | 'INACTIVE';
}

interface ContractRecord {
  id: string;
  vendorId: string;
  siteId?: string;
  contractName?: string;
  contractCode?: string;
  siteName: string;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
  guardCountPerShift: number;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  slaConfig?: Record<string, any>;
  acceptancePolicy?: Record<string, any>;
  evidencePolicy?: Record<string, any>;
  penaltyPolicy?: Record<string, any>;
  contractFileUrl?: string;
  activeVersion?: {
    id: string;
    lineItems?: Array<Record<string, any>>;
    shiftRequirements?: Array<Record<string, any>>;
    staffStandards?: Array<Record<string, any>>;
    penaltyRules?: Array<Record<string, any>>;
  };
  vendor?: VendorRecord;
  site?: SiteRecord;
  createdAt?: string;
  updatedAt?: string;
}

interface PricingRow {
  id: string;
  guardPostId: string;
  shiftLabel: string;
  requiredCount: number;
  unitPrice: number;
  billingCycle: 'SHIFT' | 'MONTH';
  notes: string;
}

interface ShiftRequirementRow {
  id: string;
  guardPostId: string;
  shiftLabel: string;
  startTime: string;
  endTime: string;
  requiredCount: number;
  patrolRequired: boolean;
  notes: string;
  appliesOnMonday?: boolean;
  appliesOnTuesday?: boolean;
  appliesOnWednesday?: boolean;
  appliesOnThursday?: boolean;
  appliesOnFriday?: boolean;
  appliesOnSaturday?: boolean;
  appliesOnSunday?: boolean;
}

interface StaffStandardRow {
  id: string;
  standardCode?: string;
  standardName: string;
  required: boolean;
  appliesTo: string;
  appliesToGuardPostId?: string;
  details: string;
}

interface PenaltyRuleRow {
  id: string;
  violationCode: string;
  violationName: string;
  penaltyAmount: number;
  penaltyUnit: 'CASE' | 'SHIFT' | 'DAY' | 'MONTH';
  graceMinutes: number;
  monthlyCap: number;
}

interface ChecklistRow {
  id: string;
  itemName: string;
  dataType: 'PHOTO' | 'NOTE' | 'QR' | 'GPS' | 'SIGNATURE';
  photoRequired: boolean;
  frequency: string;
  notes: string;
}

interface ContractFileRow {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: 'CONTRACT_SCAN' | 'APPENDIX' | 'SLA' | 'PENALTY' | 'OTHER';
  notes: string;
}

interface VersionRow {
  id: string;
  versionNo: number;
  status: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  note?: string;
}

const CONTRACT_TABS: Array<{ id: ContractWorkspaceTab; label: string }> = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'pricing', label: 'Đơn giá & Số quân' },
  { id: 'posts', label: 'Chốt / Ca' },
  { id: 'staff-standards', label: 'Tiêu chuẩn nhân sự' },
  { id: 'penalties', label: 'Điều khoản phạt' },
  { id: 'checklist', label: 'Checklist / Nội quy' },
  { id: 'files', label: 'File hợp đồng' },
  { id: 'versions', label: 'Lịch sử version' },
];

const unwrap = async <T,>(res: Response): Promise<T[]> => {
  if (!res.ok) return [];
  const payload = await res.json();
  return Array.isArray(payload) ? payload : payload?.data || [];
};

const apiHeaders = () => ({ ...getAuthHeaders(), 'Content-Type': 'application/json' });


const createRowId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `row-${Math.random().toString(36).slice(2, 10)}`;

const createPricingRow = (): PricingRow => ({
  id: createRowId(),
  guardPostId: '',
  shiftLabel: 'Ca ngày',
  requiredCount: 1,
  unitPrice: 0,
  billingCycle: 'MONTH',
  notes: '',
});

const createShiftRequirementRow = (): ShiftRequirementRow => ({
  id: createRowId(),
  guardPostId: '',
  shiftLabel: 'Ca ngày',
  startTime: '07:00',
  endTime: '19:00',
  requiredCount: 1,
  patrolRequired: false,
  notes: '',
  appliesOnMonday: true,
  appliesOnTuesday: true,
  appliesOnWednesday: true,
  appliesOnThursday: true,
  appliesOnFriday: true,
  appliesOnSaturday: true,
  appliesOnSunday: true,
});

const createStaffStandardRow = (): StaffStandardRow => ({
  id: createRowId(),
  standardCode: '',
  standardName: 'Đồng phục đầy đủ',
  required: true,
  appliesTo: 'Tất cả chốt/ca',
  appliesToGuardPostId: '',
  details: '',
});

const createPenaltyRuleRow = (): PenaltyRuleRow => ({
  id: createRowId(),
  violationCode: '',
  violationName: '',
  penaltyAmount: 0,
  penaltyUnit: 'CASE',
  graceMinutes: 0,
  monthlyCap: 0,
});

const createChecklistRow = (): ChecklistRow => ({
  id: createRowId(),
  itemName: '',
  dataType: 'PHOTO',
  photoRequired: true,
  frequency: 'Mỗi ca',
  notes: '',
});

const createContractFileRow = (): ContractFileRow => ({
  id: createRowId(),
  fileName: '',
  fileUrl: '',
  fileType: 'CONTRACT_SCAN',
  notes: '',
});

const sanitizeRows = <T extends Record<string, any>>(rows: T[], requiredKey?: keyof T) =>
  rows.filter((row) => {
    if (!requiredKey) return true;
    const value = row[requiredKey];
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== null && value !== undefined;
  });

const getContractLineItems = (contract?: ContractRecord | null): PricingRow[] =>
  (contract?.activeVersion?.lineItems as PricingRow[] | undefined)
  || (contract?.acceptancePolicy?.contractLineItems as PricingRow[] | undefined)
  || [];

const getShiftRequirements = (contract?: ContractRecord | null): ShiftRequirementRow[] => {
  const structuredRows = contract?.activeVersion?.shiftRequirements;
  if (Array.isArray(structuredRows) && structuredRows.length > 0) {
    return structuredRows.map((row) => ({
      id: String(row.id || createRowId()),
      guardPostId: String(row.guardPostId || ''),
      shiftLabel: String(row.shiftName || row.positionName || 'Ca trực'),
      startTime: String(row.startTime || ''),
      endTime: String(row.endTime || ''),
      requiredCount: Number(row.requiredStaffCount || 0),
      patrolRequired: Boolean(row.patrolRequired),
      notes: String(row.metadata?.notes || ''),
      appliesOnMonday: row.appliesOnMonday !== false,
      appliesOnTuesday: row.appliesOnTuesday !== false,
      appliesOnWednesday: row.appliesOnWednesday !== false,
      appliesOnThursday: row.appliesOnThursday !== false,
      appliesOnFriday: row.appliesOnFriday !== false,
      appliesOnSaturday: row.appliesOnSaturday !== false,
      appliesOnSunday: row.appliesOnSunday !== false,
    }));
  }

  return (contract?.acceptancePolicy?.shiftRequirements as ShiftRequirementRow[] | undefined) || [];
};

const getStaffStandards = (contract?: ContractRecord | null): StaffStandardRow[] => {
  const structuredRows = contract?.activeVersion?.staffStandards;
  if (Array.isArray(structuredRows) && structuredRows.length > 0) {
    return structuredRows.map((row) => ({
      id: String(row.id || createRowId()),
      standardCode: String(row.standardCode || ''),
      standardName: String(row.standardName || row.standardCode || 'Tiêu chuẩn nhân sự'),
      required: String(row.blockingLevel || 'WARN').toUpperCase() === 'BLOCK',
      appliesTo: String(row.appliesToGuardPost?.postName || row.appliesToGuardPostId || 'Tất cả chốt/ca'),
      appliesToGuardPostId: row.appliesToGuardPostId ? String(row.appliesToGuardPostId) : undefined,
      details: Array.isArray(row.requiredQualifications) ? row.requiredQualifications.join(', ') : '',
    }));
  }

  return (contract?.acceptancePolicy?.staffStandards as StaffStandardRow[] | undefined) || [];
};

const getPenaltyRules = (contract?: ContractRecord | null): PenaltyRuleRow[] =>
  (contract?.penaltyPolicy?.rules as PenaltyRuleRow[] | undefined) || [];

const getChecklistRequirements = (contract?: ContractRecord | null): ChecklistRow[] =>
  (contract?.evidencePolicy?.checklistRequirements as ChecklistRow[] | undefined) || [];

const getContractFiles = (contract?: ContractRecord | null): ContractFileRow[] => {
  const fileRows = (contract?.evidencePolicy?.contractFiles as ContractFileRow[] | undefined) || [];
  if (fileRows.length > 0) return fileRows;
  if (contract?.contractFileUrl) {
    return [{
      id: createRowId(),
      fileName: contract.contractName || contract.contractCode || 'Hợp đồng hiện tại',
      fileUrl: contract.contractFileUrl,
      fileType: 'CONTRACT_SCAN',
      notes: 'Lấy từ contractFileUrl hiện tại.',
    }];
  }
  return [];
};

const getVersionHistory = (contract?: ContractRecord | null): VersionRow[] => {
  const fromPolicy = (contract?.acceptancePolicy?.versionHistory as VersionRow[] | undefined) || [];
  if (fromPolicy.length > 0) return fromPolicy;
  if (!contract) return [];
  return [{
    id: contract.id,
    versionNo: 1,
    status: contract.status,
    effectiveFrom: contract.startDate,
    effectiveTo: contract.endDate,
    note: 'Bản hiện tại đang được lưu trực tiếp trên hợp đồng. Tính năng ContractVersion ở hệ thống sẽ được bổ sung ở sprint sau.',
  }];
};

export const VendorContractManagement: React.FC = () => {
  const role = useAuthStore((state) => state.role);
  const tenantInfo = useDashboardStore((state) => state.tenantInfo);
  const aiContractScanAvailability = tenantInfo?.featureAvailability?.ai_contract_scan;
  const isVendorActor = role === 'vendor-commander' || role === 'vendor-representative';
  const canManageScheduling = role === 'vendor-commander' || role === 'tenant-admin' || role === 'super-admin';
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(isVendorActor ? 'scheduler' : 'vendors');
  const [contractEditorTab, setContractEditorTab] = useState<ContractWorkspaceTab>('overview');
  const [contractDetailTab, setContractDetailTab] = useState<ContractWorkspaceTab>('overview');
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [guardPosts, setGuardPosts] = useState<GuardPostRecord[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const [vendorForm, setVendorForm] = useState({
    name: '',
    taxCode: '',
    contactPerson: '',
    phone: '',
    email: '',
    serviceScope: 'Bảo vệ mục tiêu cố định',
    riskLevel: 'LOW',
    status: 'ACTIVE',
  });

  const [siteForm, setSiteForm] = useState({
    siteName: '',
    address: '',
    siteType: 'BUILDING',
    managerName: '',
    managerPhone: '',
    vendorId: '',
  });

  const [guardPostForm, setGuardPostForm] = useState({
    postName: '',
    postType: 'GATE',
    requiredGuardCount: 1,
    gpsLat: '',
    gpsLng: '',
    radiusMeters: 50,
  });

  const [contractForm, setContractForm] = useState({
    contractName: '',
    contractCode: '',
    vendorId: '',
    siteId: '',
    startDate: '',
    endDate: '',
    value: 0,
    guardCountPerShift: 1,
    status: 'DRAFT',
    patrolCompletionTargetPercent: 95,
    incidentResponseMinutes: 15,
    incidentResolutionMinutes: 120,
    lateCheckInGraceMinutes: 5,
    missingGuardPenalty: 500000,
    missedPatrolPenalty: 300000,
    unresolvedIncidentPenalty: 1000000,
    minimumCompliancePercent: 95,
    requiredEvidenceTypes: ['PHOTO', 'NOTE'] as Array<'PHOTO' | 'VIDEO' | 'NOTE' | 'DOCUMENT' | 'SIGNATURE'>,
  });

  const [pricingRows, setPricingRows] = useState<PricingRow[]>([createPricingRow()]);
  const [shiftRequirementRows, setShiftRequirementRows] = useState<ShiftRequirementRow[]>([createShiftRequirementRow()]);
  const [staffStandardRows, setStaffStandardRows] = useState<StaffStandardRow[]>([createStaffStandardRow()]);
  const [penaltyRuleRows, setPenaltyRuleRows] = useState<PenaltyRuleRow[]>([createPenaltyRuleRow()]);
  const [checklistRows, setChecklistRows] = useState<ChecklistRow[]>([createChecklistRow()]);
  const [contractFiles, setContractFiles] = useState<ContractFileRow[]>([createContractFileRow()]);
  const [versionNote, setVersionNote] = useState('Khởi tạo hợp đồng từ giao diện cấu hình nâng cao.');

  const loadData = async () => {
    const [vendorData, siteData, guardPostData, contractData] = await Promise.all([
      fetch('/api/admin/vendors?limit=100', { headers: getAuthHeaders() }).then((r) => unwrap<VendorRecord>(r)),
      fetch('/api/admin/sites?limit=100', { headers: getAuthHeaders() }).then((r) => unwrap<SiteRecord>(r)),
      fetch('/api/admin/guard-posts', { headers: getAuthHeaders() }).then((r) => unwrap<GuardPostRecord>(r)),
      fetch('/api/admin/contracts?limit=100', { headers: getAuthHeaders() }).then((r) => unwrap<ContractRecord>(r)),
    ]);

    setVendors(vendorData);
    setSites(siteData);
    setGuardPosts(guardPostData);
    setContracts(contractData);
    if (!selectedSiteId && siteData[0]) setSelectedSiteId(siteData[0].id);
    if (!selectedContractId && contractData[0]) setSelectedContractId(contractData[0].id);
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (isVendorActor && activeTab !== 'scheduler' && activeTab !== 'contracts') {
      setActiveTab('scheduler');
    }
  }, [activeTab, isVendorActor]);

  const filteredVendors = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return vendors.filter((v) => [v.name, v.taxCode, v.contactPerson, v.contact_person, v.phone, v.email].some((x) => x?.toLowerCase().includes(q)));
  }, [vendors, searchTerm]);

  const filteredSites = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return sites.filter((s) => [s.siteName, s.address, s.vendor?.name].some((x) => x?.toLowerCase().includes(q)));
  }, [sites, searchTerm]);

  const filteredContracts = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return contracts.filter((c) => [c.contractName, c.contractCode, c.siteName, c.vendor?.name].some((x) => x?.toLowerCase().includes(q)));
  }, [contracts, searchTerm]);

  const selectedSite = sites.find((site) => site.id === selectedSiteId);
  const selectedSitePosts = guardPosts.filter((post) => post.siteId === selectedSiteId);
  const selectedContract = filteredContracts.find((contract) => contract.id === selectedContractId) || filteredContracts[0] || null;

  const contractSitePosts = useMemo(() => {
    if (!contractForm.siteId) return [];
    return guardPosts.filter((post) => post.siteId === contractForm.siteId);
  }, [contractForm.siteId, guardPosts]);

  const contractVendorSites = useMemo(() => {
    if (!contractForm.vendorId) return sites;
    return sites.filter((site) => !site.vendorId || site.vendorId === contractForm.vendorId);
  }, [contractForm.vendorId, sites]);

  useEffect(() => {
    if (selectedContract && selectedContract.id !== selectedContractId) {
      setSelectedContractId(selectedContract.id);
    }
  }, [selectedContract, selectedContractId]);

  const saveJson = async (url: string, body: Record<string, any>) => {
    setIsSaving(true);
    try {
      const res = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json())?.error || 'SAVE_FAILED');
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const createVendor = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveJson('/api/admin/vendors', vendorForm);
    setVendorForm({ ...vendorForm, name: '', taxCode: '', contactPerson: '', phone: '', email: '' });
  };

  const createSite = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveJson('/api/admin/sites', { ...siteForm, vendorId: siteForm.vendorId || undefined });
    setSiteForm({ ...siteForm, siteName: '', address: '', managerName: '', managerPhone: '' });
  };

  const createGuardPost = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveJson('/api/admin/guard-posts', {
      ...guardPostForm,
      siteId: selectedSiteId,
      gpsLat: guardPostForm.gpsLat ? Number(guardPostForm.gpsLat) : undefined,
      gpsLng: guardPostForm.gpsLng ? Number(guardPostForm.gpsLng) : undefined,
    });
    setGuardPostForm({ postName: '', postType: 'GATE', requiredGuardCount: 1, gpsLat: '', gpsLng: '', radiusMeters: 50 });
  };

  const createContract = async (event: React.FormEvent) => {
    event.preventDefault();
    const contractLineItems = sanitizeRows<PricingRow>(pricingRows, 'guardPostId').map((row) => ({
      guardPostId: row.guardPostId,
      shiftLabel: row.shiftLabel,
      requiredCount: Number(row.requiredCount),
      unitPrice: Number(row.unitPrice),
      billingCycle: row.billingCycle,
      notes: row.notes,
    }));

    const shiftRequirements = sanitizeRows<ShiftRequirementRow>(shiftRequirementRows, 'guardPostId').map((row) => ({
      guardPostId: row.guardPostId,
      shiftLabel: row.shiftLabel,
      startTime: row.startTime,
      endTime: row.endTime,
      requiredCount: Number(row.requiredCount),
      patrolRequired: row.patrolRequired,
      appliesOnMonday: row.appliesOnMonday !== false,
      appliesOnTuesday: row.appliesOnTuesday !== false,
      appliesOnWednesday: row.appliesOnWednesday !== false,
      appliesOnThursday: row.appliesOnThursday !== false,
      appliesOnFriday: row.appliesOnFriday !== false,
      appliesOnSaturday: row.appliesOnSaturday !== false,
      appliesOnSunday: row.appliesOnSunday !== false,
      notes: row.notes,
    }));

    const staffStandards = sanitizeRows<StaffStandardRow>(staffStandardRows, 'standardName').map((row, index) => ({
      standardCode: row.standardCode || `STD_${index + 1}`,
      standardName: row.standardName,
      required: row.required,
      appliesTo: row.appliesTo,
      appliesToGuardPostId: row.appliesToGuardPostId || undefined,
      requiredQualifications: row.details
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      details: row.details,
    }));

    const penaltyRules = sanitizeRows<PenaltyRuleRow>(penaltyRuleRows, 'violationName').map((row) => ({
      violationCode: row.violationCode,
      violationName: row.violationName,
      penaltyAmount: Number(row.penaltyAmount),
      penaltyUnit: row.penaltyUnit,
      graceMinutes: Number(row.graceMinutes),
      monthlyCap: Number(row.monthlyCap),
    }));

    const checklistRequirements = sanitizeRows<ChecklistRow>(checklistRows, 'itemName').map((row) => ({
      itemName: row.itemName,
      dataType: row.dataType,
      photoRequired: row.photoRequired,
      frequency: row.frequency,
      notes: row.notes,
    }));

    const normalizedFiles = sanitizeRows<ContractFileRow>(contractFiles, 'fileName').map((row) => ({
      fileName: row.fileName,
      fileUrl: row.fileUrl,
      fileType: row.fileType,
      notes: row.notes,
    }));

    await saveJson('/api/admin/contracts', {
      contractName: contractForm.contractName,
      contractCode: contractForm.contractCode,
      vendorId: contractForm.vendorId,
      siteId: contractForm.siteId,
      startDate: contractForm.startDate,
      endDate: contractForm.endDate,
      value: Number(contractForm.value),
      currency: 'VND',
      guardCountPerShift: Number(contractForm.guardCountPerShift),
      status: contractForm.status,
      contractFileUrl: normalizedFiles[0]?.fileUrl || undefined,
      slaConfig: {
        patrolCompletionTargetPercent: Number(contractForm.patrolCompletionTargetPercent),
        incidentResponseMinutes: Number(contractForm.incidentResponseMinutes),
        incidentResolutionMinutes: Number(contractForm.incidentResolutionMinutes),
        lateCheckInGraceMinutes: Number(contractForm.lateCheckInGraceMinutes),
        requiredEvidenceTypes: contractForm.requiredEvidenceTypes,
      },
      acceptancePolicy: {
        monthlyAcceptance: true,
        minimumCompliancePercent: Number(contractForm.minimumCompliancePercent),
        contractLineItems,
        shiftRequirements,
        staffStandards,
        scoreFormulaVersion: 'V.5.5.0.10',
        versionHistory: [{
          id: createRowId(),
          versionNo: 1,
          status: contractForm.status,
          effectiveFrom: contractForm.startDate,
          effectiveTo: contractForm.endDate,
          note: versionNote,
        }],
      },
      evidencePolicy: {
        requiredEvidenceTypes: contractForm.requiredEvidenceTypes,
        checklistRequirements,
        contractFiles: normalizedFiles,
      },
      penaltyPolicy: {
        missingGuardPenalty: Number(contractForm.missingGuardPenalty),
        missedPatrolPenalty: Number(contractForm.missedPatrolPenalty),
        unresolvedIncidentPenalty: Number(contractForm.unresolvedIncidentPenalty),
        rules: penaltyRules,
      },
    });

    setContractForm({
      ...contractForm,
      contractName: '',
      contractCode: '',
      vendorId: '',
      siteId: '',
      startDate: '',
      endDate: '',
      value: 0,
      status: 'DRAFT',
    });
    setPricingRows([createPricingRow()]);
    setShiftRequirementRows([createShiftRequirementRow()]);
    setStaffStandardRows([createStaffStandardRow()]);
    setPenaltyRuleRows([createPenaltyRuleRow()]);
    setChecklistRows([createChecklistRow()]);
    setContractFiles([createContractFileRow()]);
    setVersionNote('Khởi tạo hợp đồng từ giao diện cấu hình nâng cao.');
    setContractEditorTab('overview');
  };

  const renderContractEditorTab = () => {
    switch (contractEditorTab) {
      case 'overview':
        return (
          <div className="space-y-4">
            <Field label="Tên hợp đồng" value={contractForm.contractName} onChange={(v) => setContractForm({ ...contractForm, contractName: v })} required />
            <Field label="Mã hợp đồng" value={contractForm.contractCode} onChange={(v) => setContractForm({ ...contractForm, contractCode: v })} required />
            <Select
              label="Nhà thầu"
              value={contractForm.vendorId}
              onChange={(v) => setContractForm({ ...contractForm, vendorId: v, siteId: '' })}
              options={['', ...vendors.map((v) => v.id)]}
              labels={{ '': 'Chọn nhà thầu', ...Object.fromEntries(vendors.map((v) => [v.id, v.name])) }}
            />
            <Select
              label="Mục tiêu"
              value={contractForm.siteId}
              onChange={(v) => setContractForm({ ...contractForm, siteId: v })}
              options={['', ...contractVendorSites.map((s) => s.id)]}
              labels={{ '': 'Chọn mục tiêu', ...Object.fromEntries(contractVendorSites.map((s) => [s.id, s.siteName])) }}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngày bắt đầu" type="date" value={contractForm.startDate} onChange={(v) => setContractForm({ ...contractForm, startDate: v })} required />
              <Field label="Ngày kết thúc" type="date" value={contractForm.endDate} onChange={(v) => setContractForm({ ...contractForm, endDate: v })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Giá trị hợp đồng" type="number" value={contractForm.value} onChange={(v) => setContractForm({ ...contractForm, value: Number(v) })} />
              <Field label="Số người tối thiểu / ca" type="number" value={contractForm.guardCountPerShift} onChange={(v) => setContractForm({ ...contractForm, guardCountPerShift: Number(v) })} />
            </div>
            <Select label="Trạng thái" value={contractForm.status} onChange={(v) => setContractForm({ ...contractForm, status: v })} options={['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']} labels={{ DRAFT: 'Nháp', ACTIVE: 'Đang hoạt động', EXPIRED: 'Hết hạn', TERMINATED: 'Đã chấm dứt' }} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mục tiêu tuần tra %" type="number" value={contractForm.patrolCompletionTargetPercent} onChange={(v) => setContractForm({ ...contractForm, patrolCompletionTargetPercent: Number(v) })} />
              <Field label="Mục tiêu nghiệm thu %" type="number" value={contractForm.minimumCompliancePercent} onChange={(v) => setContractForm({ ...contractForm, minimumCompliancePercent: Number(v) })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Phản hồi sự cố (phút)" type="number" value={contractForm.incidentResponseMinutes} onChange={(v) => setContractForm({ ...contractForm, incidentResponseMinutes: Number(v) })} />
              <Field label="Khắc phục sự cố (phút)" type="number" value={contractForm.incidentResolutionMinutes} onChange={(v) => setContractForm({ ...contractForm, incidentResolutionMinutes: Number(v) })} />
              <Field label="Thời gian gia hạn check-in (phút)" type="number" value={contractForm.lateCheckInGraceMinutes} onChange={(v) => setContractForm({ ...contractForm, lateCheckInGraceMinutes: Number(v) })} />
            </div>
          </div>
        );
      case 'pricing':
        return (
          <StructuredTableCard
            title="Bảng đơn giá và số quân"
            description="Quản trị viên nhập từng chốt/ca theo đúng đơn giá thực tế thay vì gộp vào JSON."
            actionLabel="Thêm dòng đơn giá"
            onAdd={() => setPricingRows((rows) => [...rows, createPricingRow()])}
          >
            <OpsSavedViews storageKey="scmd.vendor.views.vendors" defaultViews={["Tất cả", "Rủi ro cao", "Có hợp đồng active", "Cần đánh giá"]} />
            <div className="overflow-x-auto">
              <table className={opsTableClass}>
                <thead>
                  <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase text-[var(--color-text-muted)]">
                    <th className="px-3 py-3">Chốt</th>
                    <th className="px-3 py-3">Ca</th>
                    <th className="px-3 py-3">Số người</th>
                    <th className="px-3 py-3">Đơn giá</th>
                    <th className="px-3 py-3">Chu kỳ</th>
                    <th className="px-3 py-3">Ghi chú</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pricingRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="px-3 py-3">
                        <InlineSelect
                          value={row.guardPostId}
                          onChange={(value) => setPricingRows((rows) => rows.map((item) => item.id === row.id ? { ...item, guardPostId: value } : item))}
                          options={['', ...contractSitePosts.map((post) => post.id)]}
                          labels={{ '': 'Chọn chốt', ...Object.fromEntries(contractSitePosts.map((post) => [post.id, post.postName])) }}
                        />
                      </td>
                      <td className="px-3 py-3"><InlineInput value={row.shiftLabel} onChange={(value) => setPricingRows((rows) => rows.map((item) => item.id === row.id ? { ...item, shiftLabel: value } : item))} /></td>
                      <td className="px-3 py-3"><InlineInput type="number" value={row.requiredCount} onChange={(value) => setPricingRows((rows) => rows.map((item) => item.id === row.id ? { ...item, requiredCount: Number(value) } : item))} /></td>
                      <td className="px-3 py-3"><InlineInput type="number" value={row.unitPrice} onChange={(value) => setPricingRows((rows) => rows.map((item) => item.id === row.id ? { ...item, unitPrice: Number(value) } : item))} /></td>
                      <td className="px-3 py-3">
                        <InlineSelect
                          value={row.billingCycle}
                          onChange={(value) => setPricingRows((rows) => rows.map((item) => item.id === row.id ? { ...item, billingCycle: value as PricingRow['billingCycle'] } : item))}
                          options={['SHIFT', 'MONTH']}
                          labels={{ SHIFT: 'Theo ca', MONTH: 'Theo tháng' }}
                        />
                      </td>
                      <td className="px-3 py-3"><InlineInput value={row.notes} onChange={(value) => setPricingRows((rows) => rows.map((item) => item.id === row.id ? { ...item, notes: value } : item))} /></td>
                      <td className="px-3 py-3 text-right">
                        <RowDeleteButton onClick={() => setPricingRows((rows) => rows.length === 1 ? rows : rows.filter((item) => item.id !== row.id))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StructuredTableCard>
        );
      case 'posts':
        return (
          <StructuredTableCard
            title="Bảng chốt / ca vận hành"
            description="Khai báo theo góc nhìn điều độ: chốt nào, ca nào, giờ nào, cần bao nhiêu người và có yêu cầu tuần tra hay không."
            actionLabel="Thêm cấu hình chốt/ca"
            onAdd={() => setShiftRequirementRows((rows) => [...rows, createShiftRequirementRow()])}
          >
            <OpsSavedViews storageKey="scmd.vendor.views.sites" defaultViews={["Tất cả", "Đang active", "Thiếu chốt", "Cần cấu hình"]} />
            <div className="overflow-x-auto">
              <table className={opsTableClass}>
                <thead>
                  <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase text-[var(--color-text-muted)]">
                    <th className="px-3 py-3">Chốt</th>
                    <th className="px-3 py-3">Ca</th>
                    <th className="px-3 py-3">Bắt đầu</th>
                    <th className="px-3 py-3">Kết thúc</th>
                    <th className="px-3 py-3">Số người</th>
                    <th className="px-3 py-3">Tuần tra?</th>
                    <th className="px-3 py-3">T2-T8-CN</th>
                    <th className="px-3 py-3">Ghi chú</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {shiftRequirementRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="px-3 py-3">
                        <InlineSelect
                          value={row.guardPostId}
                          onChange={(value) => setShiftRequirementRows((rows) => rows.map((item) => item.id === row.id ? { ...item, guardPostId: value } : item))}
                          options={['', ...contractSitePosts.map((post) => post.id)]}
                          labels={{ '': 'Chọn chốt', ...Object.fromEntries(contractSitePosts.map((post) => [post.id, post.postName])) }}
                        />
                      </td>
                      <td className="px-3 py-3"><InlineInput value={row.shiftLabel} onChange={(value) => setShiftRequirementRows((rows) => rows.map((item) => item.id === row.id ? { ...item, shiftLabel: value } : item))} /></td>
                      <td className="px-3 py-3"><InlineInput type="time" value={row.startTime} onChange={(value) => setShiftRequirementRows((rows) => rows.map((item) => item.id === row.id ? { ...item, startTime: value } : item))} /></td>
                      <td className="px-3 py-3"><InlineInput type="time" value={row.endTime} onChange={(value) => setShiftRequirementRows((rows) => rows.map((item) => item.id === row.id ? { ...item, endTime: value } : item))} /></td>
                      <td className="px-3 py-3"><InlineInput type="number" value={row.requiredCount} onChange={(value) => setShiftRequirementRows((rows) => rows.map((item) => item.id === row.id ? { ...item, requiredCount: Number(value) } : item))} /></td>
                      <td className="px-3 py-3"><InlineToggle checked={row.patrolRequired} onChange={(checked) => setShiftRequirementRows((rows) => rows.map((item) => item.id === row.id ? { ...item, patrolRequired: checked } : item))} /></td>
                      <td className="px-3 py-3">
                        <div className="grid grid-cols-4 gap-1 xl:grid-cols-7">
                          {([
                            ['appliesOnMonday', 'T2'],
                            ['appliesOnTuesday', 'T3'],
                            ['appliesOnWednesday', 'T4'],
                            ['appliesOnThursday', 'T5'],
                            ['appliesOnFriday', 'T6'],
                            ['appliesOnSaturday', 'T7'],
                            ['appliesOnSunday', 'CN'],
                          ] as Array<[keyof ShiftRequirementRow, string]>).map(([key, label]) => (
                            <div key={String(key)} className="flex flex-col items-center gap-1 rounded-lg border border-white/10 px-1 py-2 text-[10px] text-[var(--color-text-secondary)]">
                              <span>{label}</span>
                              <InlineToggle
                                checked={Boolean(row[key])}
                                onChange={(checked) => setShiftRequirementRows((rows) => rows.map((item) => item.id === row.id ? { ...item, [key]: checked } : item))}
                              />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3"><InlineInput value={row.notes} onChange={(value) => setShiftRequirementRows((rows) => rows.map((item) => item.id === row.id ? { ...item, notes: value } : item))} /></td>
                      <td className="px-3 py-3 text-right">
                        <RowDeleteButton onClick={() => setShiftRequirementRows((rows) => rows.length === 1 ? rows : rows.filter((item) => item.id !== row.id))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StructuredTableCard>
        );
      case 'staff-standards':
        return (
          <StructuredTableCard
            title="Bảng tiêu chuẩn nhân sự"
            description="Dùng để khai báo điều kiện mà bảo vệ phải đáp ứng trước khi được bố trí vào ca/chốt."
            actionLabel="Thêm tiêu chuẩn"
            onAdd={() => setStaffStandardRows((rows) => [...rows, createStaffStandardRow()])}
          >
            <div className="overflow-x-auto">
              <table className={opsTableClass}>
                <thead>
                  <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase text-[var(--color-text-muted)]">
                    <th className="px-3 py-3">Mã</th>
                    <th className="px-3 py-3">Tiêu chuẩn</th>
                    <th className="px-3 py-3">Bắt buộc</th>
                    <th className="px-3 py-3">Chốt áp dụng</th>
                    <th className="px-3 py-3">Nhãn hiển thị</th>
                    <th className="px-3 py-3">Diễn giải / Tiêu chuẩn</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {staffStandardRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="px-3 py-3"><InlineInput value={row.standardCode || ''} onChange={(value) => setStaffStandardRows((rows) => rows.map((item) => item.id === row.id ? { ...item, standardCode: value } : item))} /></td>
                      <td className="px-3 py-3"><InlineInput value={row.standardName} onChange={(value) => setStaffStandardRows((rows) => rows.map((item) => item.id === row.id ? { ...item, standardName: value } : item))} /></td>
                      <td className="px-3 py-3"><InlineToggle checked={row.required} onChange={(checked) => setStaffStandardRows((rows) => rows.map((item) => item.id === row.id ? { ...item, required: checked } : item))} /></td>
                      <td className="px-3 py-3">
                        <InlineSelect
                          value={row.appliesToGuardPostId || ''}
                          onChange={(value) => setStaffStandardRows((rows) => rows.map((item) => item.id === row.id ? {
                            ...item,
                            appliesToGuardPostId: value,
                            appliesTo: value ? (contractSitePosts.find((post) => post.id === value)?.postName || item.appliesTo) : 'Tất cả chốt/ca',
                          } : item))}
                          options={['', ...contractSitePosts.map((post) => post.id)]}
                          labels={{ '': 'Tất cả chốt/ca', ...Object.fromEntries(contractSitePosts.map((post) => [post.id, post.postName])) }}
                        />
                      </td>
                      <td className="px-3 py-3"><InlineInput value={row.appliesTo} onChange={(value) => setStaffStandardRows((rows) => rows.map((item) => item.id === row.id ? { ...item, appliesTo: value } : item))} /></td>
                      <td className="px-3 py-3"><InlineInput value={row.details} onChange={(value) => setStaffStandardRows((rows) => rows.map((item) => item.id === row.id ? { ...item, details: value } : item))} /></td>
                      <td className="px-3 py-3 text-right">
                        <RowDeleteButton onClick={() => setStaffStandardRows((rows) => rows.length === 1 ? rows : rows.filter((item) => item.id !== row.id))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StructuredTableCard>
        );
      case 'penalties':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Phạt thiếu người" type="number" value={contractForm.missingGuardPenalty} onChange={(v) => setContractForm({ ...contractForm, missingGuardPenalty: Number(v) })} />
              <Field label="Phạt bỏ tuần tra" type="number" value={contractForm.missedPatrolPenalty} onChange={(v) => setContractForm({ ...contractForm, missedPatrolPenalty: Number(v) })} />
              <Field label="Phạt sự cố quá SLA" type="number" value={contractForm.unresolvedIncidentPenalty} onChange={(v) => setContractForm({ ...contractForm, unresolvedIncidentPenalty: Number(v) })} />
            </div>
            <StructuredTableCard
              title="Bảng điều khoản phạt"
              description="Quản lý quy tắc phạt theo từng loại lỗi, mức phạt, thời gian gia hạn và trần theo tháng mà không cần nhập JSON."
              actionLabel="Thêm điều khoản phạt"
              onAdd={() => setPenaltyRuleRows((rows) => [...rows, createPenaltyRuleRow()])}
            >
              <OpsSavedViews storageKey="scmd.vendor.views.contracts" defaultViews={["Tất cả", "Active", "Sắp hết hạn", "Thiếu rule phạt"]} />
              <div className="overflow-x-auto">
                <table className={opsTableClass}>
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase text-[var(--color-text-muted)]">
                      <th className="px-3 py-3">Mã lỗi</th>
                      <th className="px-3 py-3">Lỗi</th>
                      <th className="px-3 py-3">Mức phạt</th>
                      <th className="px-3 py-3">Đơn vị phạt</th>
                      <th className="px-3 py-3">Gia hạn</th>
                      <th className="px-3 py-3">Trần tháng</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {penaltyRuleRows.map((row) => (
                      <tr key={row.id} className="border-b border-white/5">
                        <td className="px-3 py-3"><InlineInput value={row.violationCode} onChange={(value) => setPenaltyRuleRows((rows) => rows.map((item) => item.id === row.id ? { ...item, violationCode: value } : item))} /></td>
                        <td className="px-3 py-3"><InlineInput value={row.violationName} onChange={(value) => setPenaltyRuleRows((rows) => rows.map((item) => item.id === row.id ? { ...item, violationName: value } : item))} /></td>
                        <td className="px-3 py-3"><InlineInput type="number" value={row.penaltyAmount} onChange={(value) => setPenaltyRuleRows((rows) => rows.map((item) => item.id === row.id ? { ...item, penaltyAmount: Number(value) } : item))} /></td>
                        <td className="px-3 py-3">
                          <InlineSelect
                            value={row.penaltyUnit}
                            onChange={(value) => setPenaltyRuleRows((rows) => rows.map((item) => item.id === row.id ? { ...item, penaltyUnit: value as PenaltyRuleRow['penaltyUnit'] } : item))}
                            options={['CASE', 'SHIFT', 'DAY', 'MONTH']}
                            labels={{ CASE: 'Theo lỗi', SHIFT: 'Theo ca', DAY: 'Theo ngày', MONTH: 'Theo tháng' }}
                          />
                        </td>
                        <td className="px-3 py-3"><InlineInput type="number" value={row.graceMinutes} onChange={(value) => setPenaltyRuleRows((rows) => rows.map((item) => item.id === row.id ? { ...item, graceMinutes: Number(value) } : item))} /></td>
                        <td className="px-3 py-3"><InlineInput type="number" value={row.monthlyCap} onChange={(value) => setPenaltyRuleRows((rows) => rows.map((item) => item.id === row.id ? { ...item, monthlyCap: Number(value) } : item))} /></td>
                        <td className="px-3 py-3 text-right">
                          <RowDeleteButton onClick={() => setPenaltyRuleRows((rows) => rows.length === 1 ? rows : rows.filter((item) => item.id !== row.id))} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </StructuredTableCard>
          </div>
        );
      case 'checklist':
        return (
          <StructuredTableCard
            title="Checklist / nội quy vận hành"
            description="Chuẩn hóa đầu vào thực địa: loại dữ liệu nào phải có, tần suất và có bắt buộc ảnh hay không."
            actionLabel="Thêm checklist"
            onAdd={() => setChecklistRows((rows) => [...rows, createChecklistRow()])}
          >
            <div className="overflow-x-auto">
              <table className={opsTableClass}>
                <thead>
                  <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase text-[var(--color-text-muted)]">
                    <th className="px-3 py-3">Checklist</th>
                    <th className="px-3 py-3">Loại dữ liệu</th>
                    <th className="px-3 py-3">Bắt buộc ảnh?</th>
                    <th className="px-3 py-3">Tần suất</th>
                    <th className="px-3 py-3">Ghi chú</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {checklistRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="px-3 py-3"><InlineInput value={row.itemName} onChange={(value) => setChecklistRows((rows) => rows.map((item) => item.id === row.id ? { ...item, itemName: value } : item))} /></td>
                      <td className="px-3 py-3">
                        <InlineSelect
                          value={row.dataType}
                          onChange={(value) => setChecklistRows((rows) => rows.map((item) => item.id === row.id ? { ...item, dataType: value as ChecklistRow['dataType'] } : item))}
                          options={['PHOTO', 'NOTE', 'QR', 'GPS', 'SIGNATURE']}
                        />
                      </td>
                      <td className="px-3 py-3"><InlineToggle checked={row.photoRequired} onChange={(checked) => setChecklistRows((rows) => rows.map((item) => item.id === row.id ? { ...item, photoRequired: checked } : item))} /></td>
                      <td className="px-3 py-3"><InlineInput value={row.frequency} onChange={(value) => setChecklistRows((rows) => rows.map((item) => item.id === row.id ? { ...item, frequency: value } : item))} /></td>
                      <td className="px-3 py-3"><InlineInput value={row.notes} onChange={(value) => setChecklistRows((rows) => rows.map((item) => item.id === row.id ? { ...item, notes: value } : item))} /></td>
                      <td className="px-3 py-3 text-right">
                        <RowDeleteButton onClick={() => setChecklistRows((rows) => rows.length === 1 ? rows : rows.filter((item) => item.id !== row.id))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StructuredTableCard>
        );
      case 'files':
        return (
          <StructuredTableCard
            title="File hợp đồng / phụ lục"
            description="Dùng bảng để gắn URL tệp, loại tài liệu và ghi chú. Không bắt quản trị viên nhập đối tượng JSON thô."
            actionLabel="Thêm tệp"
            onAdd={() => setContractFiles((rows) => [...rows, createContractFileRow()])}
          >
            <div className="overflow-x-auto">
              <table className={opsTableClass}>
                <thead>
                  <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase text-[var(--color-text-muted)]">
                    <th className="px-3 py-3">Tên tệp</th>
                    <th className="px-3 py-3">URL</th>
                    <th className="px-3 py-3">Loại</th>
                    <th className="px-3 py-3">Ghi chú</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {contractFiles.map((row) => (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="px-3 py-3"><InlineInput value={row.fileName} onChange={(value) => setContractFiles((rows) => rows.map((item) => item.id === row.id ? { ...item, fileName: value } : item))} /></td>
                      <td className="px-3 py-3"><InlineInput value={row.fileUrl} onChange={(value) => setContractFiles((rows) => rows.map((item) => item.id === row.id ? { ...item, fileUrl: value } : item))} /></td>
                      <td className="px-3 py-3">
                        <InlineSelect
                          value={row.fileType}
                          onChange={(value) => setContractFiles((rows) => rows.map((item) => item.id === row.id ? { ...item, fileType: value as ContractFileRow['fileType'] } : item))}
                          options={['CONTRACT_SCAN', 'APPENDIX', 'SLA', 'PENALTY', 'OTHER']}
                          labels={{ CONTRACT_SCAN: 'Scan hợp đồng', APPENDIX: 'Phụ lục', SLA: 'SLA', PENALTY: 'Phạt', OTHER: 'Khác' }}
                        />
                      </td>
                      <td className="px-3 py-3"><InlineInput value={row.notes} onChange={(value) => setContractFiles((rows) => rows.map((item) => item.id === row.id ? { ...item, notes: value } : item))} /></td>
                      <td className="px-3 py-3 text-right">
                        <RowDeleteButton onClick={() => setContractFiles((rows) => rows.length === 1 ? rows : rows.filter((item) => item.id !== row.id))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StructuredTableCard>
        );
      case 'versions':
        return (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-normal text-[var(--color-text-muted)]">Ghi chú phiên bản khởi tạo</span>
              <textarea
                value={versionNote}
                onChange={(event) => setVersionNote(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[var(--color-border)]/20 bg-[#0D1324]/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#2563EB]"
                placeholder="Ví dụ: áp dụng đơn giá mới từ 01/06, bổ sung quy tắc phạt thiếu quân..."
              />
            </label>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200">
              Hệ thống hiện chưa có bảng `ContractVersion` riêng. Tab này dùng để chuẩn hóa dữ liệu và hiển thị lịch sử phiên bản mô phỏng từ ảnh chụp cấu hình để quản trị viên làm quen với quy trình mới.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-normal text-[var(--color-text-muted)]">Bản xem trước của phiên bản sẽ được lưu</p>
              <div className="mt-3 grid grid-cols-4 gap-3 text-sm font-black text-white">
                <Metric label="Phiên bản" value="Rev.1" />
                <Metric label="Trạng thái" value={contractForm.status} />
                <Metric label="Hiệu lực từ" value={contractForm.startDate || 'Chưa chọn'} />
                <Metric label="Hiệu lực đến" value={contractForm.endDate || 'Chưa chọn'} />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderContractDetail = () => {
    if (!selectedContract) {
      return (
        <SCMDCard className="p-6">
          <p className="text-sm font-bold text-[var(--color-text-secondary)]">Chưa có hợp đồng để xem chi tiết.</p>
        </SCMDCard>
      );
    }

    const lineItems = getContractLineItems(selectedContract);
    const shiftRequirements = getShiftRequirements(selectedContract);
    const staffStandards = getStaffStandards(selectedContract);
    const penaltyRules = getPenaltyRules(selectedContract);
    const checklistRequirements = getChecklistRequirements(selectedContract);
    const fileRows = getContractFiles(selectedContract);
    const versionHistory = getVersionHistory(selectedContract);

    return (
      <SCMDCard className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-xl font-black uppercase text-white">{selectedContract.contractName || selectedContract.siteName}</h3>
            <p className="mt-1 text-xs font-bold uppercase text-[var(--color-text-muted)]">
              {selectedContract.contractCode || selectedContract.id} · {selectedContract.vendor?.name || vendors.find((v) => v.id === selectedContract.vendorId)?.name || 'Nhà thầu'}
            </p>
          </div>
          <Badge value={selectedContract.status} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-6">
          <Metric label="Mục tiêu" value={selectedContract.site?.siteName || selectedContract.siteName} />
          <Metric label="Bảo vệ/ca" value={selectedContract.guardCountPerShift} />
          <Metric label="Từ ngày" value={new Date(selectedContract.startDate).toLocaleDateString('vi-VN')} />
          <Metric label="Đến ngày" value={new Date(selectedContract.endDate).toLocaleDateString('vi-VN')} />
          <Metric label="Giá trị" value={Number(selectedContract.value || 0).toLocaleString('vi-VN')} />
          <Metric label="Nghiệm thu tối thiểu" value={`${selectedContract.acceptancePolicy?.minimumCompliancePercent || 95}%`} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#0D1324]/60 p-2">
          {CONTRACT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setContractDetailTab(tab.id)}
              className={cn(
                'min-h-10 rounded-lg px-3 text-[10px] font-black uppercase transition',
                contractDetailTab === tab.id ? 'bg-[#2563EB] text-white' : 'text-[var(--color-text-muted)] hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {contractDetailTab === 'overview' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Policy icon={Route} label="Tuần tra" value={`${selectedContract.slaConfig?.patrolCompletionTargetPercent || selectedContract.slaConfig?.min_patrol_compliance || 0}% hoàn thành`} />
              <Policy icon={AlertTriangle} label="Sự cố" value={`${selectedContract.slaConfig?.incidentResponseMinutes || selectedContract.slaConfig?.max_incident_response_minutes || 0} phút phản hồi`} />
              <Policy icon={FileText} label="Bằng chứng" value={(selectedContract.evidencePolicy?.requiredEvidenceTypes || selectedContract.slaConfig?.requiredEvidenceTypes || ['PHOTO']).join(', ')} />
            </div>
          )}

          {contractDetailTab === 'pricing' && <DetailTablePricing rows={lineItems} guardPosts={guardPosts} />}
          {contractDetailTab === 'posts' && <DetailTablePosts rows={shiftRequirements} guardPosts={guardPosts} />}
          {contractDetailTab === 'staff-standards' && <DetailTableStandards rows={staffStandards} />}
          {contractDetailTab === 'penalties' && <DetailTablePenalties rows={penaltyRules} />}
          {contractDetailTab === 'checklist' && <DetailTableChecklist rows={checklistRequirements} />}
          {contractDetailTab === 'files' && <DetailTableFiles rows={fileRows} />}
          {contractDetailTab === 'versions' && <DetailTableVersions rows={versionHistory} />}
        </div>
      </SCMDCard>
    );
  };

  return (
    <div className="space-y-5 pb-20">
      <header className="sticky top-0 z-30 -mx-4 border-b border-white/10 bg-slate-950/96 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold tracking-[-0.02em] text-white">Nhà thầu & hợp đồng</h1>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-400">
              Quản lý vendor, mục tiêu, chốt và hợp đồng theo hướng đối soát dịch vụ bảo vệ thuê ngoài.
            </p>
          </div>
          <nav className="flex shrink-0 flex-wrap gap-4 lg:justify-end" aria-label="Điều hướng nhà thầu và hợp đồng">
            {(isVendorActor
              ? [
                  ['scheduler', 'Điều phối ca trực'],
                  ['contracts', 'Hợp đồng / SLA'],
                ]
              : [
                  ['vendors', 'Nhà thầu'],
                  ['sites', 'Mục tiêu / Chốt'],
                  ['contracts', 'Hợp đồng / SLA'],
                  ...(canManageScheduling ? [['scheduler', 'Điều phối ca trực']] : []),
                ]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as WorkspaceTab)}
                className={cn(
                  'min-h-9 border-b-2 px-1 text-[13px] font-semibold transition-colors',
                  activeTab === key ? 'border-[#2563EB] text-white' : 'border-transparent text-slate-400 hover:text-white',
                )}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {aiContractScanAvailability?.status === 'BLOCKED_BY_GOVERNANCE' && (
        <SCMDCard className="border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 text-amber-300" />
            <div>
              <p className="text-sm font-black uppercase text-amber-200">Quét AI cho hợp đồng đang bị chặn ở tầng quản trị</p>
              <p className="mt-1 text-sm font-semibold text-amber-100/90">
                Gói thuê bao có thể bao gồm tính năng này, nhưng môi trường chạy hiện chưa cho phép sử dụng vì bộ quy tắc hợp đồng chưa sẵn sàng.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-normal">
                <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-300">Gói dịch vụ: Đã bật</span>
                <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-200">Môi trường chạy: Bị chặn bởi chính sách quản trị</span>
                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[var(--color-text-secondary)]">Lý do: {aiContractScanAvailability.reason || 'Không có'}</span>
              </div>
            </div>
          </div>
        </SCMDCard>
      )}

      <div className="flex flex-col gap-3 border-b border-white/8 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm nhà thầu, mục tiêu hoặc mã hợp đồng"
            className="min-h-10 w-full rounded-lg border border-[var(--color-border)]/15 bg-[#0D1324]/65 pl-10 pr-4 text-sm font-medium text-white outline-none focus:border-[#2563EB]"
          />
        </div>
        <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-slate-200">{vendors.length} nhà thầu</span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-slate-200">{sites.filter((s) => s.status === 'ACTIVE').length} mục tiêu active</span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-slate-200">{guardPosts.length} chốt</span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-slate-200">{contracts.filter((c) => c.status === 'ACTIVE').length} hợp đồng active</span>
        </div>
      </div>


      {activeTab === 'vendors' && !isVendorActor && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SCMDCard className="overflow-hidden p-0">
            <div className="border-b border-white/8 px-4 py-3">
              <h3 className="text-sm font-bold text-white">Danh sách nhà thầu</h3>
              <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">Ưu tiên nhìn trạng thái, số site, số hợp đồng và mức tuân thủ ngay trên một bảng.</p>
            </div>
            <OpsSavedViews storageKey="scmd.vendor.list.views" defaultViews={["Tất cả", "Rủi ro cao", "Có hợp đồng active", "Cần đánh giá"]} />
            <div className="overflow-x-auto">
              <table className={opsTableClass}>
                <thead>
                  <tr className="border-b border-white/8 text-left">
                    <th className={opsThClass}>Nhà thầu</th>
                    <th className={opsThClass}>Liên hệ</th>
                    <th className={opsThClass}>Site</th>
                    <th className={opsThClass}>Hợp đồng</th>
                    <th className={opsThClass}>Rủi ro</th>
                    <th className={opsThClass}>Tuân thủ</th>
                    <th className={opsThClass}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className={opsTdClass}>
                        <p className="font-semibold text-white">{vendor.name}</p>
                        <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{vendor.serviceScope || 'Dịch vụ bảo vệ thuê ngoài'}</p>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--color-text-secondary)]">
                        <p>{vendor.contactPerson || vendor.contact_person || 'Chưa có liên hệ'}</p>
                        <p className="mt-1">{vendor.phone || 'Chưa có số'}</p>
                      </td>
                      <td className="px-4 py-3 text-white">{sites.filter((s) => s.vendorId === vendor.id || s.vendor?.id === vendor.id).length}</td>
                      <td className="px-4 py-3 text-white">{contracts.filter((c) => c.vendorId === vendor.id && c.status === 'ACTIVE').length}</td>
                      <td className={opsTdClass}>
                        <span className={cn('rounded-full px-2 py-1 text-[11px] font-semibold', vendor.riskLevel === 'HIGH' ? 'bg-red-500/10 text-red-300' : vendor.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300')}>
                          {vendor.riskLevel || 'LOW'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white">{Math.round(vendor.score || 100)}%</td>
                      <td className={opsTdClass}><Badge value={vendor.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SCMDCard>
          <FormPanel title="Tạo nhà thầu" onSubmit={createVendor} isSaving={isSaving}>
            <Field label="Tên nhà thầu" value={vendorForm.name} onChange={(v) => setVendorForm({ ...vendorForm, name: v })} required />
            <Field label="Mã số thuế" value={vendorForm.taxCode} onChange={(v) => setVendorForm({ ...vendorForm, taxCode: v })} />
            <Field label="Người liên hệ" value={vendorForm.contactPerson} onChange={(v) => setVendorForm({ ...vendorForm, contactPerson: v })} required />
            <Field label="Điện thoại" value={vendorForm.phone} onChange={(v) => setVendorForm({ ...vendorForm, phone: v })} required />
            <Field label="Email" value={vendorForm.email} onChange={(v) => setVendorForm({ ...vendorForm, email: v })} required type="email" />
            <Select label="Mức độ rủi ro" value={vendorForm.riskLevel} onChange={(v) => setVendorForm({ ...vendorForm, riskLevel: v })} options={['LOW', 'MEDIUM', 'HIGH']} labels={{ LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao' }} />
          </FormPanel>
        </div>
      )}

      {activeTab === 'sites' && !isVendorActor && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SCMDCard className="overflow-hidden p-0">
            <div className="border-b border-white/8 px-4 py-3">
              <h3 className="text-sm font-bold text-white">Danh sách mục tiêu / chốt</h3>
              <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">Bảng này ưu tiên site, vendor, số chốt và hợp đồng active để thao tác nhanh.</p>
            </div>
            <OpsSavedViews storageKey="scmd.site.list.views" defaultViews={["Tất cả", "Đang active", "Thiếu chốt", "Cần cấu hình"]} />
            <div className="overflow-x-auto">
              <table className={opsTableClass}>
                <thead>
                  <tr className="border-b border-white/8 text-left">
                    <th className={opsThClass}>Mục tiêu</th>
                    <th className={opsThClass}>Nhà thầu</th>
                    <th className={opsThClass}>Chốt</th>
                    <th className={opsThClass}>Hợp đồng</th>
                    <th className={opsThClass}>Loại</th>
                    <th className={opsThClass}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map((site) => {
                    const sitePosts = guardPosts.filter((post) => post.siteId === site.id);
                    const activeContract = contracts.find((contract) => contract.siteId === site.id && contract.status === 'ACTIVE');
                    return (
                      <tr key={site.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                        <td className={opsTdClass}>
                          <button onClick={() => setSelectedSiteId(site.id)} className="text-left font-semibold text-white hover:text-[#93C5FD]">
                            {site.siteName}
                          </button>
                          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{site.address}</p>
                        </td>
                        <td className="px-4 py-3 text-white">{site.vendor?.name || activeContract?.vendor?.name || 'Chưa gán'}</td>
                        <td className="px-4 py-3 text-white">{sitePosts.length}</td>
                        <td className="px-4 py-3 text-white">{activeContract ? activeContract.contractCode || 'Có' : 'Chưa có'}</td>
                        <td className="px-4 py-3 text-white">{site.siteType}</td>
                        <td className={opsTdClass}><Badge value={site.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {selectedSite?.id && selectedSitePosts.length > 0 ? (
              <div className="border-t border-white/8 px-4 py-3">
                <p className="mb-3 text-[12px] font-semibold text-white">Chốt thuộc mục tiêu đang chọn</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {selectedSitePosts.map((post) => (
                    <div key={post.id} className="rounded-lg border border-white/8 bg-white/[0.03] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">{post.postName}</p>
                          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{post.postType} · {post.requiredGuardCount} bảo vệ/ca · {post.radiusMeters}m</p>
                        </div>
                        <Badge value={post.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </SCMDCard>
          <div className="space-y-5">
            <FormPanel title="Tạo mục tiêu" onSubmit={createSite} isSaving={isSaving}>
              <Field label="Tên mục tiêu" value={siteForm.siteName} onChange={(v) => setSiteForm({ ...siteForm, siteName: v })} required />
              <Field label="Địa chỉ" value={siteForm.address} onChange={(v) => setSiteForm({ ...siteForm, address: v })} required />
              <Select label="Loại mục tiêu" value={siteForm.siteType} onChange={(v) => setSiteForm({ ...siteForm, siteType: v })} options={['FACTORY', 'OFFICE', 'WAREHOUSE', 'BUILDING', 'RETAIL', 'OTHER']} />
              <Select label="Nhà thầu phụ trách" value={siteForm.vendorId} onChange={(v) => setSiteForm({ ...siteForm, vendorId: v })} options={['', ...vendors.map((v) => v.id)]} labels={{ '': 'Chọn sau', ...Object.fromEntries(vendors.map((v) => [v.id, v.name])) }} />
              <Field label="Quản lý mục tiêu" value={siteForm.managerName} onChange={(v) => setSiteForm({ ...siteForm, managerName: v })} />
              <Field label="Số điện thoại quản lý" value={siteForm.managerPhone} onChange={(v) => setSiteForm({ ...siteForm, managerPhone: v })} />
            </FormPanel>

            <FormPanel title="Tạo chốt bảo vệ" onSubmit={createGuardPost} isSaving={isSaving || !selectedSiteId}>
              <Select label="Mục tiêu" value={selectedSiteId} onChange={setSelectedSiteId} options={sites.map((s) => s.id)} labels={Object.fromEntries(sites.map((s) => [s.id, s.siteName]))} />
              <Field label="Tên chốt" value={guardPostForm.postName} onChange={(v) => setGuardPostForm({ ...guardPostForm, postName: v })} required />
              <Select label="Loại chốt" value={guardPostForm.postType} onChange={(v) => setGuardPostForm({ ...guardPostForm, postType: v })} options={['GATE', 'LOBBY', 'PARKING', 'WAREHOUSE', 'PERIMETER', 'CONTROL_ROOM', 'OTHER']} />
              <Field label="Quân số yêu cầu" type="number" value={guardPostForm.requiredGuardCount} onChange={(v) => setGuardPostForm({ ...guardPostForm, requiredGuardCount: Number(v) })} required />
              <div className="grid grid-cols-3 gap-3">
                <Field label="Lat" value={guardPostForm.gpsLat} onChange={(v) => setGuardPostForm({ ...guardPostForm, gpsLat: v })} />
                <Field label="Lng" value={guardPostForm.gpsLng} onChange={(v) => setGuardPostForm({ ...guardPostForm, gpsLng: v })} />
                <Field label="Bán kính" type="number" value={guardPostForm.radiusMeters} onChange={(v) => setGuardPostForm({ ...guardPostForm, radiusMeters: Number(v) })} />
              </div>
            </FormPanel>
          </div>
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            <SCMDCard className="overflow-hidden p-0">
              <div className="border-b border-white/8 px-4 py-3">
                <h3 className="text-sm font-bold text-white">Danh sách hợp đồng / SLA</h3>
                <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">Ưu tiên nhìn mục tiêu, vendor, trạng thái, số hạng mục và phiên bản.</p>
              </div>
              <OpsSavedViews storageKey="scmd.contract.list.views" defaultViews={["Tất cả", "Active", "Sắp hết hạn", "Thiếu rule phạt"]} />
              <div className="overflow-x-auto">
                <table className={opsTableClass}>
                  <thead>
                    <tr className="border-b border-white/8 text-left">
                      <th className={opsThClass}>Hợp đồng</th>
                      <th className={opsThClass}>Mục tiêu</th>
                      <th className={opsThClass}>Bảo vệ/ca</th>
                      <th className={opsThClass}>Hạng mục</th>
                      <th className={opsThClass}>Phiên bản</th>
                      <th className={opsThClass}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((contract) => (
                      <tr key={contract.id} className={cn(opsRowClass, selectedContract?.id === contract.id && 'bg-white/[0.04]')}>
                        <td className={opsTdClass}>
                          <button onClick={() => setSelectedContractId(contract.id)} className="text-left font-semibold text-white hover:text-[#93C5FD]">
                            {contract.contractName || contract.siteName}
                          </button>
                          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{contract.contractCode || contract.id} · {contract.vendor?.name || vendors.find((v) => v.id === contract.vendorId)?.name || 'Nhà thầu'}</p>
                        </td>
                        <td className="px-4 py-3 text-white">{contract.site?.siteName || contract.siteName}</td>
                        <td className="px-4 py-3 text-white">{contract.guardCountPerShift}</td>
                        <td className="px-4 py-3 text-white">{getContractLineItems(contract).length}</td>
                        <td className="px-4 py-3 text-white">Rev.{getVersionHistory(contract)[0]?.versionNo || 1}</td>
                        <td className={opsTdClass}><Badge value={contract.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SCMDCard>

            {!isVendorActor && renderContractDetail()}
          </div>
          <div className="space-y-4">
          {!isVendorActor ? (
            <SCMDCard className="p-5">
              <form className="space-y-5" onSubmit={createContract}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase text-white">Biểu mẫu cấu hình hợp đồng nâng cao</h3>
                    <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">Nhập theo bảng nghiệp vụ; hệ thống sẽ tự chuyển thành cấu hình JSON ở nền sau.</p>
                  </div>
                  <Plus size={18} className="text-[#2563EB]" />
                </div>

                <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#0D1324]/60 p-2">
                  {CONTRACT_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setContractEditorTab(tab.id)}
                      className={cn(
                        'min-h-10 rounded-lg px-3 text-[10px] font-black uppercase transition',
                        contractEditorTab === tab.id ? 'bg-[#2563EB] text-white' : 'text-[var(--color-text-muted)] hover:text-white'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {renderContractEditorTab()}

                <SCMDButton type="submit" isLoading={isSaving} className="min-h-12 w-full !rounded-xl !bg-[#2563EB]">
                  Lưu cấu hình hợp đồng
                </SCMDButton>
              </form>
            </SCMDCard>
          ) : (
            <SCMDCard className="p-5">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black uppercase text-white">Phạm vi hợp đồng được phân công</h3>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Chỉ huy chỉ được xem hợp đồng/SLA trong phạm vi nhà thầu để phân ca và đối chiếu, không được chỉnh sửa hợp đồng.
                  </p>
                </div>
                {renderContractDetail()}
              </div>
            </SCMDCard>
          )}
          </div>
        </div>
      )}

      {activeTab === 'scheduler' && <ShiftSchedulerView />}
    </div>
  );
};

const FormPanel = ({ title, children, onSubmit, isSaving }: { title: string; children: React.ReactNode; onSubmit: (event: React.FormEvent) => void; isSaving: boolean }) => (
  <SCMDCard className="p-5">
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black uppercase text-white">{title}</h3>
        <Plus size={18} className="text-[#2563EB]" />
      </div>
      {children}
      <SCMDButton type="submit" isLoading={isSaving} className="min-h-12 w-full !rounded-xl !bg-[#2563EB]">
        Lưu cấu hình
      </SCMDButton>
    </form>
  </SCMDCard>
);

const StructuredTableCard = ({
  title,
  description,
  actionLabel,
  onAdd,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-black uppercase text-white">{title}</p>
        <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">{description}</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/10 px-4 text-[10px] font-black uppercase text-[#93C5FD] transition hover:bg-[#2563EB]/20"
      >
        {actionLabel}
      </button>
    </div>
    <div className="rounded-2xl border border-white/10 bg-[#0D1324]/55">{children}</div>
  </div>
);

const Field = ({ label, value, onChange, type = 'text', required = false }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; required?: boolean }) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-black uppercase tracking-normal text-[var(--color-text-muted)]">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      className="min-h-12 w-full rounded-xl border border-[var(--color-border)]/20 bg-[#0D1324]/70 px-4 text-sm font-bold text-white outline-none focus:border-[#2563EB]"
    />
  </label>
);

const Select = ({ label, value, onChange, options, labels = {} }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-black uppercase tracking-normal text-[var(--color-text-muted)]">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-12 w-full rounded-xl border border-[var(--color-border)]/20 bg-[#0D1324]/70 px-4 text-sm font-bold text-white outline-none focus:border-[#2563EB]"
    >
      {options.map((option) => (
        <option key={option || 'empty'} value={option}>{labels[option] || option}</option>
      ))}
    </select>
  </label>
);

const Badge = ({ value }: { value: string }) => <OpsStatusBadge value={value} />;

const Metric = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
    <p className="text-[10px] font-black uppercase tracking-normal text-[var(--color-text-muted)]">{label}</p>
    <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
  </div>
);

const Policy = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
    <Icon size={18} className="text-[#2563EB]" />
    <div>
      <p className="text-[10px] font-black uppercase tracking-normal text-[var(--color-text-muted)]">{label}</p>
      <p className="text-sm font-black text-white">{value}</p>
    </div>
  </div>
);

const InlineInput = ({ value, onChange, type = 'text' }: { value: string | number; onChange: (value: string) => void; type?: string }) => (
  <input
    type={type}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="min-h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-bold text-white outline-none focus:border-[#2563EB]"
  />
);

const InlineSelect = ({ value, onChange, options, labels = {} }: { value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="min-h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-bold text-white outline-none focus:border-[#2563EB]"
  >
    {options.map((option) => (
      <option key={option || 'empty'} value={option}>
        {labels[option] || option}
      </option>
    ))}
  </select>
);

const InlineToggle = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={cn(
      'inline-flex min-h-10 min-w-20 items-center justify-center rounded-lg border px-3 text-[10px] font-black uppercase transition',
      checked ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-[var(--color-text-muted)]'
    )}
  >
    {checked ? 'Có' : 'Không'}
  </button>
);

const RowDeleteButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase text-red-300 transition hover:bg-red-500/20"
  >
    Xóa
  </button>
);

const DetailEmpty = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-center">
    <p className="text-sm font-black uppercase text-white">{title}</p>
    <p className="mt-2 text-xs font-semibold text-[var(--color-text-secondary)]">{description}</p>
  </div>
);

const DetailTablePricing = ({ rows, guardPosts }: { rows: PricingRow[]; guardPosts: GuardPostRecord[] }) => {
  if (rows.length === 0) {
    return <DetailEmpty title="Chưa có bảng đơn giá" description="Hợp đồng này chưa được chuẩn hóa hạng mục theo chốt/ca." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className={opsTableClass}>
        <thead>
          <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase text-[var(--color-text-muted)]">
            <th className="px-3 py-3">Chốt</th>
            <th className="px-3 py-3">Ca</th>
            <th className="px-3 py-3">Số người</th>
            <th className="px-3 py-3">Đơn giá</th>
            <th className="px-3 py-3">Chu kỳ</th>
            <th className="px-3 py-3">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-white/5">
              <td className="px-3 py-3 text-white">{guardPosts.find((post) => post.id === row.guardPostId)?.postName || row.guardPostId}</td>
              <td className="px-3 py-3 text-white">{row.shiftLabel}</td>
              <td className="px-3 py-3 text-white">{row.requiredCount}</td>
              <td className="px-3 py-3 text-white">{Number(row.unitPrice || 0).toLocaleString('vi-VN')}</td>
              <td className="px-3 py-3 text-white">{row.billingCycle === 'SHIFT' ? 'Theo ca' : 'Theo tháng'}</td>
              <td className="px-3 py-3 text-[var(--color-text-secondary)]">{row.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DetailTablePosts = ({ rows, guardPosts }: { rows: ShiftRequirementRow[]; guardPosts: GuardPostRecord[] }) => {
  if (rows.length === 0) {
    return <DetailEmpty title="Chưa có bảng chốt / ca" description="Hợp đồng này chưa được tách yêu cầu vận hành theo chốt/ca." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className={opsTableClass}>
        <thead>
          <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase text-[var(--color-text-muted)]">
            <th className="px-3 py-3">Chốt</th>
            <th className="px-3 py-3">Ca</th>
            <th className="px-3 py-3">Thời gian</th>
            <th className="px-3 py-3">Số người</th>
            <th className="px-3 py-3">Tuần tra</th>
            <th className="px-3 py-3">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-white/5">
              <td className="px-3 py-3 text-white">{guardPosts.find((post) => post.id === row.guardPostId)?.postName || row.guardPostId}</td>
              <td className="px-3 py-3 text-white">{row.shiftLabel}</td>
              <td className="px-3 py-3 text-white">{row.startTime} - {row.endTime}</td>
              <td className="px-3 py-3 text-white">{row.requiredCount}</td>
              <td className="px-3 py-3 text-white">{row.patrolRequired ? 'Có' : 'Không'}</td>
              <td className="px-3 py-3 text-[var(--color-text-secondary)]">
                {[
                  row.appliesOnMonday !== false ? 'T2' : null,
                  row.appliesOnTuesday !== false ? 'T3' : null,
                  row.appliesOnWednesday !== false ? 'T4' : null,
                  row.appliesOnThursday !== false ? 'T5' : null,
                  row.appliesOnFriday !== false ? 'T6' : null,
                  row.appliesOnSaturday !== false ? 'T7' : null,
                  row.appliesOnSunday !== false ? 'CN' : null,
                ].filter(Boolean).join(', ')}{row.notes ? ` · ${row.notes}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DetailTableStandards = ({ rows }: { rows: StaffStandardRow[] }) => {
  if (rows.length === 0) {
    return <DetailEmpty title="Chưa có tiêu chuẩn nhân sự" description="Hợp đồng này chưa khai báo tiêu chuẩn bảo vệ theo chốt/ca." />;
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-black uppercase text-white">{row.standardName}</p>
              <p className="mt-1 text-[10px] font-black uppercase text-[var(--color-text-muted)]">{row.standardCode || 'STD'}</p>
            </div>
            <span className={cn('rounded-lg px-2 py-1 text-[10px] font-black uppercase', row.required ? 'bg-rose-500/10 text-rose-300' : 'bg-amber-500/10 text-amber-300')}>
              {row.required ? 'BẮT BUỘC' : 'CẢNH BÁO'}
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-[var(--color-text-secondary)]">Áp dụng: {row.appliesTo || 'Tất cả'}</p>
          <p className="mt-2 text-sm font-semibold text-white">{row.details || 'Không có diễn giải bổ sung.'}</p>
        </div>
      ))}
    </div>
  );
};

const DetailTablePenalties = ({ rows }: { rows: PenaltyRuleRow[] }) => {
  if (rows.length === 0) {
    return <DetailEmpty title="Chưa có điều khoản phạt" description="Hợp đồng này chưa chuẩn hóa quy tắc phạt theo dạng bảng." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className={opsTableClass}>
        <thead>
          <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase text-[var(--color-text-muted)]">
            <th className="px-3 py-3">Mã lỗi</th>
            <th className="px-3 py-3">Lỗi</th>
            <th className="px-3 py-3">Mức phạt</th>
            <th className="px-3 py-3">Đơn vị</th>
            <th className="px-3 py-3">Gia hạn</th>
            <th className="px-3 py-3">Trần tháng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-white/5">
              <td className="px-3 py-3 text-white">{row.violationCode || '—'}</td>
              <td className="px-3 py-3 text-white">{row.violationName}</td>
              <td className="px-3 py-3 text-white">{Number(row.penaltyAmount || 0).toLocaleString('vi-VN')}</td>
              <td className="px-3 py-3 text-white">{row.penaltyUnit}</td>
              <td className="px-3 py-3 text-white">{row.graceMinutes} phút</td>
              <td className="px-3 py-3 text-white">{Number(row.monthlyCap || 0).toLocaleString('vi-VN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DetailTableChecklist = ({ rows }: { rows: ChecklistRow[] }) => {
  if (rows.length === 0) {
    return <DetailEmpty title="Chưa có danh mục kiểm tra / nội quy" description="Hợp đồng này chưa cấu hình danh mục kiểm tra dữ liệu thực địa." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className={opsTableClass}>
        <thead>
          <tr className="border-b border-white/10 text-left text-[10px] font-black uppercase text-[var(--color-text-muted)]">
            <th className="px-3 py-3">Checklist</th>
            <th className="px-3 py-3">Loại dữ liệu</th>
            <th className="px-3 py-3">Bắt buộc ảnh?</th>
            <th className="px-3 py-3">Tần suất</th>
            <th className="px-3 py-3">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-white/5">
              <td className="px-3 py-3 text-white">{row.itemName}</td>
              <td className="px-3 py-3 text-white">{row.dataType}</td>
              <td className="px-3 py-3 text-white">{row.photoRequired ? 'Có' : 'Không'}</td>
              <td className="px-3 py-3 text-white">{row.frequency}</td>
              <td className="px-3 py-3 text-[var(--color-text-secondary)]">{row.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DetailTableFiles = ({ rows }: { rows: ContractFileRow[] }) => {
  if (rows.length === 0) {
    return <DetailEmpty title="Chưa có tệp hợp đồng" description="Hợp đồng này chưa khai báo bản quét hợp đồng hoặc phụ lục." />;
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2">
            <Paperclip size={16} className="text-[#2563EB]" />
            <p className="font-black uppercase text-white">{row.fileName}</p>
          </div>
          <p className="mt-2 text-xs font-bold text-[var(--color-text-secondary)]">{row.fileType}</p>
          <a href={row.fileUrl} target="_blank" rel="noreferrer" className="mt-3 block truncate text-sm font-bold text-[#93C5FD] hover:text-white">
            {row.fileUrl}
          </a>
          <p className="mt-2 text-sm font-semibold text-[var(--color-text-secondary)]">{row.notes || 'Không có ghi chú'}</p>
        </div>
      ))}
    </div>
  );
};

const DetailTableVersions = ({ rows }: { rows: VersionRow[] }) => {
  if (rows.length === 0) {
    return <DetailEmpty title="Chưa có lịch sử phiên bản" description="Tính năng `ContractVersion` ở hệ thống chưa được kích hoạt cho bản ghi này." />;
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
                <Clock3 size={18} />
              </div>
              <div>
                <p className="font-black uppercase text-white">Rev.{row.versionNo}</p>
                <p className="text-xs font-bold text-[var(--color-text-secondary)]">{row.effectiveFrom || '—'} → {row.effectiveTo || '—'}</p>
              </div>
            </div>
            <Badge value={row.status} />
          </div>
          <p className="mt-3 text-sm font-semibold text-[var(--color-text-secondary)]">{row.note || 'Không có ghi chú phiên bản.'}</p>
        </div>
      ))}
    </div>
  );
};

