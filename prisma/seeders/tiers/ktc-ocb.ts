/**
 * SCMD Pro — KTC Security x OCB Demo Seed
 * =======================================
 * Mục tiêu: seed dữ liệu staging/pre-deploy cho mô hình giám sát và đối soát
 * chất lượng dịch vụ bảo vệ thuê ngoài tại chuỗi mục tiêu ngân hàng OCB.
 *
 * Chạy trực tiếp:
 *   npx tsx prisma/seeders/index.ts --tier=ktc-ocb --reset-ktc
 *
 * Ghi chú an toàn dữ liệu:
 * - Không sử dụng nhân sự thật, email thật, CCCD thật hoặc lịch trực thật.
 * - Địa điểm có `geoFence.metadata.dataSource` để phân biệt `public_reference`
 *   và `demo_generated`.
 * - Ảnh minh chứng chỉ là path demo, không trỏ tới ảnh thật.
 */

import { db } from '../../../src/server/core/db/prisma.js';
import { logger } from '../utils/logger.js';
import { resolveSeedPassword } from '../../../src/server/modules/auth/seed-password.policy.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PlanTier, SubscriptionPlan, IncidentSeverity, IncidentStatus, IncidentTimelineAction, IncidentEvidenceKind } from '@prisma/client';

const TENANT_ID = 'tenant_ktc_security_ocb_demo';
const VENDOR_ID = 'vendor_ktc_security_demo';
const CONTRACT_ID = 'contract_ktc_ocb_2026_demo';
const CONTRACT_VERSION_ID = 'contract_version_ktc_ocb_2026_v1_demo';
const TENANT_ADMIN_ID = 'staff_ktc_tenant_admin_demo';
const MONTH = '2026-05';
const SEED_START = new Date('2026-04-27T00:00:00+07:00');
const DAYS_TO_SEED = 30;

const SHIFT_DEFS = {
  DAY: { code: 'DAY_0700_1900', shiftType: 'DAY', name: 'Ca ngày 07:00–19:00', startTime: '07:00', endTime: '19:00' },
  NIGHT: { code: 'NIGHT_1900_0700', shiftType: 'NIGHT', name: 'Ca đêm 19:00–07:00', startTime: '19:00', endTime: '07:00' },
  ADMIN: { code: 'ADMIN_0800_1700', shiftType: 'ADMIN', name: 'Ca hành chính 08:00–17:00', startTime: '08:00', endTime: '17:00' },
} as const;

type SiteSeed = {
  code: string;
  name: string;
  type: string;
  address: string;
  province: string;
  district: string;
  region: string;
  lat: number;
  lng: number;
  priority: 'HIGH' | 'MEDIUM';
  dataSource: 'public_reference' | 'demo_generated';
  sourceNote: string;
};

type StaffBundle = {
  dayGuardId: string;
  nightGuardId: string;
  adminId: string;
};

type ShiftBundle = {
  scheduleId: string;
  assignmentId: string;
  sessionId: string;
  staffId: string;
  shiftType: 'DAY' | 'NIGHT' | 'ADMIN';
  startAt: Date;
  endAt: Date;
  siteId: string;
  guardPostId: string;
  status: string;
};

const sites: SiteSeed[] = [
  {
    code: 'ocb-hanoi-catlinh',
    name: 'OCB Chi nhánh Hà Nội',
    type: 'BRANCH',
    address: '28 P. Cát Linh, Cát Linh, Đống Đa, Hà Nội',
    province: 'Hà Nội',
    district: 'Đống Đa',
    region: 'Miền Bắc',
    lat: 21.02936,
    lng: 105.82871,
    priority: 'HIGH',
    dataSource: 'public_reference',
    sourceNote: 'OCB công bố trong thông báo mở rộng thời gian giao dịch 2025.',
  },
  {
    code: 'ocb-cau-giay',
    name: 'OCB Chi nhánh Cầu Giấy',
    type: 'BRANCH',
    address: '69 Hoàng Quốc Việt, Nghĩa Đô, Cầu Giấy, Hà Nội',
    province: 'Hà Nội',
    district: 'Cầu Giấy',
    region: 'Miền Bắc',
    lat: 21.0469,
    lng: 105.7936,
    priority: 'HIGH',
    dataSource: 'public_reference',
    sourceNote: 'OCB công bố khi khai trương CN Cầu Giấy và trong danh sách giao dịch 2025.',
  },
  {
    code: 'ocb-linh-dam',
    name: 'OCB Chi nhánh Linh Đàm',
    type: 'BRANCH',
    address: 'Số 10-BT1 Khu nhà ở Bắc Linh Đàm, Hoàng Mai, Hà Nội',
    province: 'Hà Nội',
    district: 'Hoàng Mai',
    region: 'Miền Bắc',
    lat: 20.9639,
    lng: 105.8297,
    priority: 'MEDIUM',
    dataSource: 'public_reference',
    sourceNote: 'OCB công bố trong thông báo mở rộng thời gian giao dịch 2025.',
  },
  {
    code: 'ocb-hoi-so-le-duan',
    name: 'OCB Hội sở Lê Duẩn',
    type: 'HEAD_OFFICE',
    address: '41-45 Lê Duẩn, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    region: 'Miền Nam',
    lat: 10.78292,
    lng: 106.70062,
    priority: 'HIGH',
    dataSource: 'public_reference',
    sourceNote: 'Địa chỉ hội sở được OCB công bố trong nhiều tài liệu công khai.',
  },
  {
    code: 'ocb-ban-co',
    name: 'OCB Phòng giao dịch Bàn Cờ',
    type: 'TRANSACTION_OFFICE',
    address: '08 Nguyễn Thiện Thuật, Phường 2, Quận 3, TP. Hồ Chí Minh',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 3',
    region: 'Miền Nam',
    lat: 10.76921,
    lng: 106.6845,
    priority: 'MEDIUM',
    dataSource: 'public_reference',
    sourceNote: 'OCB công bố trong thông báo đổi tên PGD tại TP.HCM năm 2018.',
  },
  {
    code: 'ocb-nguyen-chi-thanh',
    name: 'OCB Phòng giao dịch Nguyễn Chí Thanh',
    type: 'TRANSACTION_OFFICE',
    address: '43-45 Nguyễn Chí Thanh, Phường 9, Quận 5, TP. Hồ Chí Minh',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 5',
    region: 'Miền Nam',
    lat: 10.75441,
    lng: 106.66751,
    priority: 'MEDIUM',
    dataSource: 'public_reference',
    sourceNote: 'OCB công bố trong thông báo đổi tên PGD tại TP.HCM năm 2018.',
  },
  {
    code: 'ocb-da-nang-demo',
    name: 'OCB Chi nhánh Đà Nẵng',
    type: 'BRANCH',
    address: 'Tuyến phố trung tâm Hải Châu, Đà Nẵng — địa chỉ demo cần xác minh trước production',
    province: 'Đà Nẵng',
    district: 'Hải Châu',
    region: 'Miền Trung',
    lat: 16.06778,
    lng: 108.22083,
    priority: 'HIGH',
    dataSource: 'demo_generated',
    sourceNote: 'Địa chỉ/tọa độ mô phỏng an toàn để kiểm thử staging.',
  },
  {
    code: 'ocb-hai-phong-demo',
    name: 'OCB Phòng giao dịch Hải Phòng',
    type: 'TRANSACTION_OFFICE',
    address: 'Khu vực trung tâm Ngô Quyền, Hải Phòng — địa chỉ demo cần xác minh trước production',
    province: 'Hải Phòng',
    district: 'Ngô Quyền',
    region: 'Miền Bắc',
    lat: 20.84491,
    lng: 106.68808,
    priority: 'MEDIUM',
    dataSource: 'demo_generated',
    sourceNote: 'Địa chỉ/tọa độ mô phỏng an toàn để kiểm thử staging.',
  },
  {
    code: 'ocb-can-tho-demo',
    name: 'OCB Chi nhánh Cần Thơ',
    type: 'BRANCH',
    address: 'Khu vực Ninh Kiều, Cần Thơ — địa chỉ demo cần xác minh trước production',
    province: 'Cần Thơ',
    district: 'Ninh Kiều',
    region: 'Miền Tây',
    lat: 10.04516,
    lng: 105.74685,
    priority: 'HIGH',
    dataSource: 'demo_generated',
    sourceNote: 'Địa chỉ/tọa độ mô phỏng an toàn để kiểm thử staging.',
  },
  {
    code: 'ocb-binh-duong-demo',
    name: 'OCB Điểm giao dịch Bình Dương',
    type: 'SERVICE_POINT',
    address: 'Khu vực Thủ Dầu Một, Bình Dương — địa chỉ demo cần xác minh trước production',
    province: 'Bình Dương',
    district: 'Thủ Dầu Một',
    region: 'Miền Nam',
    lat: 10.98046,
    lng: 106.65189,
    priority: 'MEDIUM',
    dataSource: 'demo_generated',
    sourceNote: 'Địa chỉ/tọa độ mô phỏng an toàn để kiểm thử staging.',
  },
  {
    code: 'ocb-dong-nai-demo',
    name: 'OCB ATM Biên Hòa',
    type: 'ATM',
    address: 'Khu vực trung tâm Biên Hòa, Đồng Nai — địa chỉ demo cần xác minh trước production',
    province: 'Đồng Nai',
    district: 'Biên Hòa',
    region: 'Miền Nam',
    lat: 10.95741,
    lng: 106.84269,
    priority: 'MEDIUM',
    dataSource: 'demo_generated',
    sourceNote: 'ATM/tọa độ mô phỏng an toàn để kiểm thử staging.',
  },
  {
    code: 'ocb-nha-trang-demo',
    name: 'OCB Phòng giao dịch Nha Trang',
    type: 'TRANSACTION_OFFICE',
    address: 'Khu vực trung tâm Nha Trang, Khánh Hòa — địa chỉ demo cần xác minh trước production',
    province: 'Khánh Hòa',
    district: 'Nha Trang',
    region: 'Miền Trung',
    lat: 12.23879,
    lng: 109.19675,
    priority: 'MEDIUM',
    dataSource: 'demo_generated',
    sourceNote: 'Địa chỉ/tọa độ mô phỏng an toàn để kiểm thử staging.',
  },
];

const firstNames = ['An', 'Bình', 'Cường', 'Dũng', 'Hải', 'Hưng', 'Khang', 'Long', 'Minh', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Thắng', 'Tuấn', 'Việt'];
const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Hồ'];
const middleNames = ['Văn', 'Hữu', 'Đức', 'Minh', 'Quang', 'Thanh', 'Gia', 'Xuân'];

function id(prefix: string, value: string): string {
  return `${prefix}_${value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase()}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

function atTime(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function endAt(date: Date, shiftType: 'DAY' | 'NIGHT' | 'ADMIN'): Date {
  if (shiftType === 'NIGHT') return atTime(addDays(date, 1), '07:00');
  return atTime(date, shiftType === 'DAY' ? '19:00' : '17:00');
}

function deterministicName(index: number): string {
  const last = lastNames[index % lastNames.length];
  const middle = middleNames[Math.floor(index / 2) % middleNames.length];
  const first = firstNames[(index * 3) % firstNames.length];
  return `${last} ${middle} ${first}`;
}

function demoPhone(index: number): string {
  return `0999${String(index).padStart(6, '0')}`;
}

function demoIdNumber(index: number): string {
  return `000079${String(index).padStart(6, '0')}`;
}

function shiftedCoord(lat: number, lng: number, idx: number): { lat: number; lng: number } {
  const delta = 0.00008 * (idx + 1);
  return { lat: Number((lat + delta).toFixed(6)), lng: Number((lng - delta).toFixed(6)) };
}

function toDecimal(n: number): string {
  return n.toFixed(2);
}

async function cleanupKtcTenant() {
  logger.warn('Resetting existing KTC x OCB demo tenant data only...');

  // IMPORTANT: do not run tenant cleanup inside an outer SYSTEM context,
  // otherwise AsyncLocalStorage keeps system bypass enabled and isolation
  // guard will reject tenant-scoped deleteMany calls.
  await db.withTenant(TENANT_ID, async (tenant) => {
    await tenant.penaltyItem.deleteMany();
    await tenant.violationDispute.deleteMany();
    await tenant.monthlyAcceptanceReport.deleteMany();
    await tenant.vendorScorecard.deleteMany();
    await tenant.violationEvent.deleteMany();
    await tenant.incidentEvidence.deleteMany();
    await tenant.incidentTimeline.deleteMany();
    await tenant.incident.deleteMany();
    await tenant.patrolLog.deleteMany();
    await tenant.patrolSession.deleteMany();
    await tenant.shiftSession.deleteMany();
    await tenant.patrolAssignment.deleteMany();
    await tenant.shiftAssignment.deleteMany();
    await tenant.attendanceRecord.deleteMany();
    await tenant.shiftComplianceItem.deleteMany();
    await tenant.shiftSchedule.deleteMany();
    await tenant.patrolRouteCheckpoint.deleteMany();
    await tenant.patrolRoute.deleteMany();
    await tenant.incidentSlaRule.deleteMany();
    await tenant.contractChecklistRequirement.deleteMany();
    await tenant.contractStaffStandard.deleteMany();
    await tenant.contractShiftRequirement.deleteMany();
    await tenant.contractLineItem.deleteMany();
    await tenant.contractPenaltyRule.deleteMany();
    await tenant.contract.updateMany({ data: { activeVersionId: null } });
    await tenant.contractVersion.deleteMany();
    await tenant.contract.deleteMany();
    await tenant.checkpoint.deleteMany();
    await tenant.guardPost.deleteMany();
    await tenant.site.deleteMany();
    await tenant.attachment.deleteMany();
    await tenant.auditLog.deleteMany();
    await tenant.notification.deleteMany();
    await tenant.staff.deleteMany();
    await tenant.vendor.deleteMany();
  }, { timeout: 120000 });

  await db.withTenant('SYSTEM', async (sys) => {
    await sys.tenantSubscription.deleteMany({ where: { tenantId: TENANT_ID } });
    await sys.tenant.deleteMany({ where: { id: TENANT_ID } });
  }, { timeout: 120000 });
}

async function createCheckpointRaw(
  sys: Awaited<ReturnType<typeof db.system>>,
  checkpoint: { id: string; tenantId: string; name: string; siteId: string; guardPostId: string; lat: number; lng: number; qrHash: string; checkItems: unknown },
) {
  await sys.$executeRawUnsafe(
    `INSERT INTO "checkpoints"
      (id, tenant_id, name, status, site_id, guard_post_id, qr_hash, check_items, location, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', $4, $5, $6, $7::jsonb, ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      site_id = EXCLUDED.site_id,
      guard_post_id = EXCLUDED.guard_post_id,
      qr_hash = EXCLUDED.qr_hash,
      check_items = EXCLUDED.check_items,
      location = EXCLUDED.location,
      updated_at = NOW();`,
    checkpoint.id,
    checkpoint.tenantId,
    checkpoint.name,
    checkpoint.siteId,
    checkpoint.guardPostId,
    checkpoint.qrHash,
    JSON.stringify(checkpoint.checkItems),
    checkpoint.lng,
    checkpoint.lat,
  );
}

function incidentContent(index: number): { type: string; severity: IncidentSeverity; description: string; action: string; status: IncidentStatus } {
  const items = [
    {
      type: 'CUSTOMER_COMPLAINT',
      severity: IncidentSeverity.LOW,
      description: 'Khách hàng tranh cãi nhẹ tại khu vực giao dịch, nhân viên bảo vệ đã mời ra khu vực chờ và báo cán bộ phụ trách hỗ trợ.',
      action: 'Điều tiết khu vực giao dịch, ghi nhận diễn biến và bàn giao ca sau tiếp tục quan sát.',
      status: IncidentStatus.CLOSED,
    },
    {
      type: 'PARKING_ANOMALY',
      severity: IncidentSeverity.LOW,
      description: 'Phát hiện xe máy gửi quá thời gian quy định tại bãi xe, biển số được ghi nhận dạng demo trong sổ bàn giao.',
      action: 'Dán nhãn theo dõi, thông báo giám sát khu vực và đưa vào ghi chú bàn giao ca đêm.',
      status: IncidentStatus.RESOLVED_PENDING_APPROVAL,
    },
    {
      type: 'ATM_ANOMALY',
      severity: IncidentSeverity.MEDIUM,
      description: 'Khu vực ATM có cảnh báo giao dịch lỗi liên tục, nhân viên đã kiểm tra ngoại quan và chưa phát hiện dấu hiệu cạy phá.',
      action: 'Khoanh vùng quan sát, báo bộ phận kỹ thuật theo quy trình demo và tăng tần suất tuần tra quanh ATM.',
      status: IncidentStatus.WAITING_VENDOR_RESPONSE,
    },
    {
      type: 'DOOR_NOT_SECURED',
      severity: IncidentSeverity.MEDIUM,
      description: 'Cửa phụ khu vực kỹ thuật chưa khóa chặt trong lượt tuần tra cuối ca ngày.',
      action: 'Khóa lại cửa, chụp ảnh minh chứng demo và yêu cầu ca đêm kiểm tra lại ở lượt 22:30.',
      status: IncidentStatus.CLOSED,
    },
    {
      type: 'CAMERA_SIGNAL_LOSS',
      severity: IncidentSeverity.HIGH,
      description: 'Thiết bị camera khu vực bãi xe mất tín hiệu tạm thời, chưa ghi nhận ảnh hưởng đến an ninh khu vực.',
      action: 'Báo giám sát khu vực, lập biên bản demo và chuyển kỹ thuật kiểm tra đường truyền.',
      status: IncidentStatus.ESCALATED,
    },
    {
      type: 'FALSE_ALARM',
      severity: IncidentSeverity.LOW,
      description: 'Báo động giả tại cửa ra vào do cảm biến nhận sai chuyển động ngoài giờ cao điểm.',
      action: 'Kiểm tra hiện trường, xác nhận không có xâm nhập và cập nhật timeline sự cố.',
      status: IncidentStatus.CLOSED,
    },
  ];
  return items[index % items.length];
}

export async function runKtcOcbSeed(options: { resetKtc?: boolean } = {}) {
  logger.step('Seeding KTC Security x OCB Contract Compliance Demo');

  const password = '123456789';
  const passwordHash = await bcrypt.hash(password, 10);

  if (options.resetKtc) {
    await cleanupKtcTenant();
  }

  await db.withTenant('SYSTEM', async (sys) => {
    await sys.tenant.upsert({
      where: { subdomain: 'ktcsecurity' },
      update: {
        name: 'Công ty Cổ phần Dịch vụ Bảo vệ Chuyên nghiệp KTC Việt Nam',
        subdomain: 'ktcsecurity',
        plan: 'PRO_MAX',
        subscriptionPlan: SubscriptionPlan.ENTERPRISE,
        contactEmail: 'admin@ktcsecurity.local',
        status: 'active',
        maxEmployees: 200,
        featuresEnabled: {
          contractComplianceEngine: true,
          vendorScorecard: true,
          monthlyAcceptanceReport: true,
          patrolSession: true,
          incidentSla: true,
        },
      },
      create: {
        id: TENANT_ID,
        name: 'Công ty Cổ phần Dịch vụ Bảo vệ Chuyên nghiệp KTC Việt Nam',
        subdomain: 'ktcsecurity',
        plan: 'PRO_MAX',
        subscriptionPlan: SubscriptionPlan.ENTERPRISE,
        contactEmail: 'admin@ktcsecurity.local',
        contactPhone: '0999000000',
        ownerName: 'KTC Security Demo Admin',
        address: 'Dữ liệu demo staging — không dùng làm thông tin pháp lý',
        maxEmployees: 200,
        paidUsers: 48,
        status: 'active',
        featuresEnabled: {
          contractComplianceEngine: true,
          vendorScorecard: true,
          monthlyAcceptanceReport: true,
          patrolSession: true,
          incidentSla: true,
        },
      },
    });

    await sys.tenantSubscription.upsert({
      where: { tenantId: TENANT_ID },
      update: { plan: PlanTier.PRO_MAX, paidUsers: 48, activeUsers: 45, autoDowngrade: false },
      create: {
        tenantId: TENANT_ID,
        plan: PlanTier.PRO_MAX,
        paidUsers: 48,
        activeUsers: 45,
        gracePeriodDays: 30,
        autoDowngrade: false,
      },
    });

    await sys.vendor.upsert({
      where: { id: VENDOR_ID },
      update: {
        name: 'Công ty Cổ phần Dịch vụ Bảo vệ Chuyên nghiệp KTC Việt Nam',
        status: 'ACTIVE',
        riskLevel: 'LOW',
        score: 91.5,
      },
      create: {
        id: VENDOR_ID,
        tenantId: TENANT_ID,
        name: 'Công ty Cổ phần Dịch vụ Bảo vệ Chuyên nghiệp KTC Việt Nam',
        taxCode: 'DEMO-KTC-SECURITY',
        address: 'Địa chỉ demo dùng cho staging/pre-deploy',
        managerName: 'Ban điều hành KTC Security Demo',
        contactPerson: 'Đại diện vận hành KTC Demo',
        email: 'vendor-representative@ktc-demo.local',
        phone: '0999000001',
        serviceScope: 'Cung cấp dịch vụ bảo vệ thuê ngoài cho chuỗi chi nhánh, phòng giao dịch và ATM ngân hàng OCB trong dữ liệu demo.',
        riskLevel: 'LOW',
        notes: 'Dữ liệu vendor demo; không dùng thông tin pháp lý thật.',
        score: 91.5,
        status: 'ACTIVE',
      },
    });

    await sys.staff.upsert({
      where: { username: 'admin' },
      update: {
        password: passwordHash,
        email: 'admin@ktcsecurity.local',
        status: 'active',
        role: 'tenant-admin',
        tokenVersion: { increment: 1 },
      },
      create: {
        id: TENANT_ADMIN_ID,
        tenantId: TENANT_ID,
        username: 'admin',
        email: 'admin@ktcsecurity.local',
        password: passwordHash,
        fullName: 'Quản trị KTC Security Demo',
        staffId: 'KTC-ADM-000',
        phone: '0999000002',
        role: 'tenant-admin',
        status: 'active',
        tokenVersion: 1,
        qualifications: ['Quản trị hợp đồng dịch vụ bảo vệ', 'Đối soát SLA nhà thầu'],
        idNumber: demoIdNumber(1),
      },
    });

    const supervisors: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const staffId = `staff_ktc_supervisor_${i + 1}`;
      const username = `ktc_supervisor_${i + 1}`;
      await sys.staff.upsert({
        where: { username },
        update: { password: passwordHash, status: 'active', assignedVendorId: VENDOR_ID },
        create: {
          id: staffId,
          tenantId: TENANT_ID,
          username,
          email: `${username}@ktc-demo.local`,
          password: passwordHash,
          fullName: deterministicName(100 + i),
          staffId: `KTC-SUP-${String(i + 1).padStart(3, '0')}`,
          phone: demoPhone(100 + i),
          role: 'supervisor',
          assignedVendorId: VENDOR_ID,
          status: 'active',
          tokenVersion: 1,
          qualifications: ['Giám sát khu vực', 'Xử lý sự cố ngân hàng', 'Đối soát ca trực'],
          idNumber: demoIdNumber(100 + i),
        },
      });
      supervisors.push(staffId);
    }

    const siteIds: string[] = [];
    const guardPostsBySite = new Map<string, string[]>();
    const checkpointsBySite = new Map<string, string[]>();
    const routeIdBySite = new Map<string, string>();
    const routeCheckpointIdsBySite = new Map<string, string[]>();
    const staffBySite = new Map<string, StaffBundle>();

    for (const [siteIndex, site] of sites.entries()) {
      const siteId = id('site', site.code);
      siteIds.push(siteId);

      await sys.site.upsert({
        where: { id: siteId },
        update: {
          siteName: site.name,
          address: site.address,
          siteType: site.type,
          vendorId: VENDOR_ID,
          status: 'ACTIVE',
          geoFence: {
            center: { lat: site.lat, lng: site.lng },
            radiusMeters: site.type === 'ATM' ? 35 : 60,
            province: site.province,
            district: site.district,
            region: site.region,
            priority: site.priority,
            dataSource: site.dataSource,
            sourceNote: site.sourceNote,
            demoSafety: 'Không chứa sơ đồ bảo vệ, tài sản, camera hoặc thông tin nội bộ OCB.',
          },
        },
        create: {
          id: siteId,
          tenantId: TENANT_ID,
          siteName: site.name,
          address: site.address,
          siteType: site.type,
          geoFence: {
            center: { lat: site.lat, lng: site.lng },
            radiusMeters: site.type === 'ATM' ? 35 : 60,
            province: site.province,
            district: site.district,
            region: site.region,
            priority: site.priority,
            dataSource: site.dataSource,
            sourceNote: site.sourceNote,
            demoSafety: 'Không chứa sơ đồ bảo vệ, tài sản, camera hoặc thông tin nội bộ OCB.',
          },
          status: 'ACTIVE',
          managerName: `Quản lý điểm ${site.province} Demo`,
          managerPhone: demoPhone(200 + siteIndex),
          vendorId: VENDOR_ID,
        },
      });

      const posts = [
        { suffix: 'main-door', name: 'Cửa chính', type: 'GATE', skill: 'Điều tiết khách hàng và kiểm soát lối vào' },
        { suffix: 'atm-area', name: 'Khu vực ATM', type: 'ATM', skill: 'Quan sát ATM và xử lý bất thường nhẹ' },
        { suffix: 'parking', name: 'Bãi xe', type: 'PARKING', skill: 'Điều phối bãi xe' },
        { suffix: 'technical-room', name: 'Phòng kỹ thuật', type: 'CONTROL_ROOM', skill: 'Kiểm tra cửa/kỹ thuật ở mức quan sát' },
        { suffix: 'transaction-area', name: 'Khu vực giao dịch', type: 'LOBBY', skill: 'Giữ trật tự sảnh giao dịch' },
        { suffix: 'emergency-exit', name: 'Lối thoát hiểm', type: 'PERIMETER', skill: 'Kiểm tra thông thoáng lối thoát hiểm' },
      ];

      const guardPostIds: string[] = [];
      const checkpointIds: string[] = [];
      for (const [postIndex, post] of posts.entries()) {
        const coord = shiftedCoord(site.lat, site.lng, postIndex);
        const guardPostId = id('guard_post', `${site.code}_${post.suffix}`);
        guardPostIds.push(guardPostId);
        await sys.guardPost.upsert({
          where: { id: guardPostId },
          update: {
            postName: post.name,
            postType: post.type,
            gpsLat: coord.lat,
            gpsLng: coord.lng,
            radiusMeters: site.type === 'ATM' ? 35 : 50,
            requiredSkill: post.skill,
            status: 'ACTIVE',
          },
          create: {
            id: guardPostId,
            tenantId: TENANT_ID,
            siteId,
            postName: post.name,
            postType: post.type,
            requiredGuardCount: 1,
            requiredSkill: post.skill,
            gpsLat: coord.lat,
            gpsLng: coord.lng,
            radiusMeters: site.type === 'ATM' ? 35 : 50,
            status: 'ACTIVE',
          },
        });

        const checkpointId = id('checkpoint', `${site.code}_${post.suffix}`);
        checkpointIds.push(checkpointId);
        await createCheckpointRaw(sys, {
          id: checkpointId,
          tenantId: TENANT_ID,
          name: `${site.name} - ${post.name}`,
          siteId,
          guardPostId,
          lat: coord.lat,
          lng: coord.lng,
          qrHash: crypto.createHash('sha256').update(`${TENANT_ID}:${checkpointId}`).digest('hex'),
          checkItems: [
            { code: 'VISUAL_CHECK', label: 'Kiểm tra ngoại quan khu vực', required: true },
            { code: 'DOOR_LOCK', label: 'Kiểm tra khóa/cửa nếu áp dụng', required: post.type !== 'PARKING' },
            { code: 'SAFETY_NOTE', label: 'Ghi chú dấu hiệu bất thường nếu có', required: false },
          ],
        });
      }
      guardPostsBySite.set(siteId, guardPostIds);
      checkpointsBySite.set(siteId, checkpointIds);

      const staffBundle: StaffBundle = {
        dayGuardId: `staff_${site.code}_day_guard`,
        nightGuardId: `staff_${site.code}_night_guard`,
        adminId: `staff_${site.code}_admin`,
      };
      staffBySite.set(siteId, staffBundle);

      const staffDefs = [
        { id: staffBundle.dayGuardId, username: `${site.code}_day_guard`, role: 'guard', staffCode: `KTC-DAY-${String(siteIndex + 1).padStart(3, '0')}`, title: 'Nhân viên bảo vệ ca ngày', qualifications: ['Ca ngày ngân hàng', 'Tuần tra QR/GPS'] },
        { id: staffBundle.nightGuardId, username: `${site.code}_night_guard`, role: 'guard', staffCode: `KTC-NGT-${String(siteIndex + 1).padStart(3, '0')}`, title: 'Nhân viên bảo vệ ca đêm', qualifications: ['Ca đêm ngân hàng', 'Tuần tra đêm', 'Bàn giao xuyên ngày'] },
        { id: staffBundle.adminId, username: `${site.code}_admin_staff`, role: 'technician', staffCode: `KTC-ADM-SITE-${String(siteIndex + 1).padStart(3, '0')}`, title: 'Nhân viên hành chính/giám sát hành chính tại mục tiêu', qualifications: ['Kiểm tra hồ sơ ban ngày', 'Xác nhận checklist vận hành'] },
      ];
      for (const [offset, staff] of staffDefs.entries()) {
        await sys.staff.upsert({
          where: { username: staff.username },
          update: {
            password: passwordHash,
            fullName: deterministicName(siteIndex * 3 + offset),
            assignedVendorId: VENDOR_ID,
            assignedSiteId: siteId,
            assignedContractId: CONTRACT_ID,
            status: 'active',
          },
          create: {
            id: staff.id,
            tenantId: TENANT_ID,
            username: staff.username,
            email: `${staff.username}@ktc-demo.local`,
            password: passwordHash,
            fullName: deterministicName(siteIndex * 3 + offset),
            staffId: staff.staffCode,
            phone: demoPhone(siteIndex * 10 + offset + 1),
            role: staff.role,
            assignedVendorId: VENDOR_ID,
            assignedSiteId: siteId,
            assignedContractId: CONTRACT_ID,
            status: 'active',
            tokenVersion: 1,
            qualifications: staff.qualifications,
            idNumber: demoIdNumber(1000 + siteIndex * 10 + offset),
          },
        });
      }

      const routeId = id('patrol_route', `${site.code}_daily_route`);
      routeIdBySite.set(siteId, routeId);
      await sys.patrolRoute.upsert({
        where: { id: routeId },
        update: {
          name: `${site.name} - Tuyến tuần tra chuẩn`,
          siteId,
          contractId: CONTRACT_ID,
          vendorId: VENDOR_ID,
          status: 'ACTIVE',
          requiredCompletionPercent: site.priority === 'HIGH' ? 100 : 90,
          estimatedMinutes: 25,
        },
        create: {
          id: routeId,
          tenantId: TENANT_ID,
          name: `${site.name} - Tuyến tuần tra chuẩn`,
          description: 'Tuyến tuần tra demo bao phủ cửa chính, ATM, bãi xe, kỹ thuật, khu giao dịch và lối thoát hiểm.',
          siteId,
          contractId: CONTRACT_ID,
          vendorId: VENDOR_ID,
          positionName: 'Tuyến tuần tra ngân hàng',
          status: 'ACTIVE',
          estimatedMinutes: 25,
          requiredCompletionPercent: site.priority === 'HIGH' ? 100 : 90,
          repeatIntervalMinutes: 150,
          complianceConfig: {
            scoreBase: 100,
            missedRequiredPointPenalty: 20,
            gpsViolationPenalty: 10,
            evidenceMissingPenalty: 10,
            lateCompletionPenalty: 8,
          },
          createdBy: TENANT_ADMIN_ID,
        },
      });

      const routeCheckpointIds: string[] = [];
      for (const [checkpointIndex, checkpointId] of checkpointIds.entries()) {
        const routeCheckpointId = id('route_checkpoint', `${site.code}_${checkpointIndex + 1}`);
        routeCheckpointIds.push(routeCheckpointId);
        await sys.patrolRouteCheckpoint.upsert({
          where: { tenantId_routeId_sequence: { tenantId: TENANT_ID, routeId, sequence: checkpointIndex + 1 } },
          update: {
            checkpointId,
            guardPostId: guardPostIds[checkpointIndex],
            isRequired: checkpointIndex < 5,
            gpsRequired: true,
            photoRequired: checkpointIndex === 1 || checkpointIndex === 3,
            noteRequired: checkpointIndex === 3,
          },
          create: {
            id: routeCheckpointId,
            tenantId: TENANT_ID,
            routeId,
            checkpointId,
            guardPostId: guardPostIds[checkpointIndex],
            sequence: checkpointIndex + 1,
            isRequired: checkpointIndex < 5,
            minOffsetMinutes: checkpointIndex * 3,
            maxOffsetMinutes: checkpointIndex * 5 + 10,
            geoRadiusMeters: 50,
            gpsRequired: true,
            photoRequired: checkpointIndex === 1 || checkpointIndex === 3,
            noteRequired: checkpointIndex === 3,
          },
        });
      }
      routeCheckpointIdsBySite.set(siteId, routeCheckpointIds);
    }

    const slaConfig = {
      patrolCompletionTargetPercent: 95,
      incidentResponseMinutes: 15,
      incidentResolutionMinutes: 240,
      lateCheckInGraceMinutes: 5,
      missingGuardPenalty: 500000,
      missedPatrolPenalty: 300000,
      unresolvedIncidentPenalty: 1000000,
      requiredEvidenceTypes: ['PHOTO', 'GPS', 'NOTE'],
    };

    await sys.contract.upsert({
      where: { id: CONTRACT_ID },
      update: {
        vendorId: VENDOR_ID,
        siteId: siteIds[0],
        contractName: 'Hợp đồng dịch vụ bảo vệ thuê ngoài KTC Security cho chuỗi mục tiêu OCB',
        siteName: 'Chuỗi mục tiêu Ngân hàng Phương Đông OCB',
        status: 'ACTIVE',
        slaConfig,
      },
      create: {
        id: CONTRACT_ID,
        tenantId: TENANT_ID,
        vendorId: VENDOR_ID,
        siteId: siteIds[0],
        contractName: 'Hợp đồng dịch vụ bảo vệ thuê ngoài KTC Security cho chuỗi mục tiêu OCB',
        contractCode: 'KTC-OCB-DEMO-2026-001',
        siteName: 'Chuỗi mục tiêu Ngân hàng Phương Đông OCB',
        startDate: new Date('2026-04-01T00:00:00+07:00'),
        endDate: new Date('2027-03-31T23:59:59+07:00'),
        value: toDecimal(3_600_000_000),
        currency: 'VND',
        guardCountPerShift: 1,
        status: 'ACTIVE',
        slaConfig,
        acceptancePolicy: {
          monthlyAcceptanceRequired: true,
          clientApprovalRoles: ['tenant-admin', 'supervisor'],
          vendorCanDispute: true,
          finalizedReportLocked: true,
        },
        evidencePolicy: {
          attendance: ['GPS', 'QR', 'PHOTO_OPTIONAL'],
          patrol: ['GPS', 'QR', 'PHOTO_FOR_ATM_AND_TECHNICAL_ROOM'],
          incident: ['PHOTO_OR_NOTE', 'TIMELINE'],
        },
        penaltyPolicy: {
          currency: 'VND',
          mode: 'suggestion_before_client_approval',
          repeatedViolationMultiplier: 1.25,
        },
        activatedAt: new Date('2026-04-01T08:00:00+07:00'),
      },
    });

    await sys.contractVersion.upsert({
      where: { id: CONTRACT_VERSION_ID },
      update: {
        status: 'ACTIVE',
        totalContractValue: toDecimal(3_600_000_000),
        slaConfig,
      },
      create: {
        id: CONTRACT_VERSION_ID,
        tenantId: TENANT_ID,
        contractId: CONTRACT_ID,
        versionNumber: 1,
        status: 'ACTIVE',
        versionLabel: 'KTC x OCB Demo v1',
        changeSummary: 'Phiên bản hợp đồng demo cho staging/pre-deploy, không phải hợp đồng thật.',
        effectiveFrom: new Date('2026-04-01T00:00:00+07:00'),
        effectiveTo: new Date('2027-03-31T23:59:59+07:00'),
        currency: 'VND',
        totalContractValue: toDecimal(3_600_000_000),
        guardCountPerShift: 1,
        acceptancePolicy: { monthlyAcceptanceRequired: true, vendorCanDispute: true },
        evidencePolicy: { attendance: ['GPS', 'QR'], patrol: ['GPS', 'QR', 'PHOTO'], incident: ['PHOTO', 'NOTE'] },
        penaltyPolicy: { missingGuard: 500000, missedPatrol: 300000, incidentSlaBreach: 1000000 },
        slaConfig,
        metadata: { serviceClient: 'Ngân hàng Phương Đông OCB', dataSafety: 'demo_only' },
        activatedAt: new Date('2026-04-01T08:00:00+07:00'),
      },
    });
    await sys.contract.update({ where: { id: CONTRACT_ID }, data: { activeVersionId: CONTRACT_VERSION_ID } });

    const penaltyRules = [
      { code: 'LATE_CHECKIN', name: 'Đi trễ sau thời gian ân hạn', amount: 100000 },
      { code: 'MISSING_GUARD', name: 'Thiếu nhân sự theo ca', amount: 500000 },
      { code: 'MISSED_PATROL', name: 'Bỏ lượt tuần tra bắt buộc', amount: 300000 },
      { code: 'INCOMPLETE_PATROL', name: 'Tuần tra thiếu điểm bắt buộc', amount: 200000 },
      { code: 'INCIDENT_RESPONSE_BREACH', name: 'Phản hồi sự cố quá SLA', amount: 1000000 },
    ];
    for (const [idx, rule] of penaltyRules.entries()) {
      const penaltyRuleId = id('penalty_rule', rule.code);
      await sys.contractPenaltyRule.upsert({
        where: { id: penaltyRuleId },
        update: {
          clauseCode: `DEMO-${idx + 1}`,
          ruleName: rule.name,
          violationCode: rule.code,
          amount: toDecimal(rule.amount),
          isActive: true,
        },
        create: {
          id: penaltyRuleId,
          tenantId: TENANT_ID,
          contractId: CONTRACT_ID,
          contractVersionId: CONTRACT_VERSION_ID,
          clauseCode: `DEMO-${idx + 1}`,
          ruleName: rule.name,
          violationCode: rule.code,
          penaltyUnit: 'PER_OCCURRENCE',
          amount: toDecimal(rule.amount),
          graceCount: rule.code === 'LATE_CHECKIN' ? 2 : 0,
          evidenceRequired: true,
          sortOrder: idx + 1,
          metadata: { demo: true, note: 'Mức phạt đề xuất để kiểm thử, không phải điều khoản thật.' },
        },
      });
    }

    for (const [siteIndex, siteId] of siteIds.entries()) {
      const guardPostIds = guardPostsBySite.get(siteId) ?? [];
      for (const [postIndex, guardPostId] of guardPostIds.entries()) {
        for (const shiftType of ['DAY', 'NIGHT', 'ADMIN'] as const) {
          const shift = SHIFT_DEFS[shiftType];
          const reqId = id('contract_shift_req', `${sites[siteIndex].code}_${guardPostId}_${shiftType}`);
          await sys.contractShiftRequirement.upsert({
            where: { id: reqId },
            update: { isActive: true, requiredStaffCount: 1, patrolRequired: shiftType !== 'ADMIN' },
            create: {
              id: reqId,
              tenantId: TENANT_ID,
              contractId: CONTRACT_ID,
              contractVersionId: CONTRACT_VERSION_ID,
              siteId,
              guardPostId,
              shiftType,
              shiftName: shift.name,
              startTime: shift.startTime,
              endTime: shift.endTime,
              requiredStaffCount: 1,
              appliesOnSunday: shiftType !== 'ADMIN',
              positionName: `${sites[siteIndex].name} - ${shift.name}`,
              patrolRequired: shiftType !== 'ADMIN',
              sortOrder: postIndex * 10 + (shiftType === 'DAY' ? 1 : shiftType === 'NIGHT' ? 2 : 3),
              metadata: { shiftCode: shift.code, demo: true },
            },
          });
        }

        const lineId = id('contract_line_item', `${sites[siteIndex].code}_${postIndex + 1}`);
        await sys.contractLineItem.upsert({
          where: { id: lineId },
          update: { isActive: true, requiredStaffCount: 3 },
          create: {
            id: lineId,
            tenantId: TENANT_ID,
            contractVersionId: CONTRACT_VERSION_ID,
            contractId: CONTRACT_ID,
            siteId,
            guardPostId,
            shiftType: 'DAILY_COVERAGE',
            shiftName: 'Bảo vệ mục tiêu ngân hàng theo ngày',
            startTime: '00:00',
            endTime: '23:59',
            positionName: 'Chốt bảo vệ/tuần tra ngân hàng',
            requiredStaffCount: 3,
            unitPrice: toDecimal(15000000),
            billingCycle: 'MONTHLY',
            totalAmount: toDecimal(45000000),
            isActive: true,
            sortOrder: postIndex + 1,
            metadata: { demo: true, includes: ['DAY', 'NIGHT', 'ADMIN_EXCEPT_SUNDAY'] },
          },
        });

        const checklistId = id('contract_checklist_req', `${sites[siteIndex].code}_${postIndex + 1}`);
        await sys.contractChecklistRequirement.upsert({
          where: { tenantId_contractVersionId_requirementCode_guardPostId: { tenantId: TENANT_ID, contractVersionId: CONTRACT_VERSION_ID, requirementCode: `CHK-${sites[siteIndex].code.toUpperCase()}-${postIndex + 1}`, guardPostId } },
          update: { isActive: true },
          create: {
            id: checklistId,
            tenantId: TENANT_ID,
            contractId: CONTRACT_ID,
            contractVersionId: CONTRACT_VERSION_ID,
            siteId,
            guardPostId,
            lineItemId: lineId,
            requirementCode: `CHK-${sites[siteIndex].code.toUpperCase()}-${postIndex + 1}`,
            requirementName: `Checklist an ninh ${sites[siteIndex].name} - chốt ${postIndex + 1}`,
            description: 'Checklist demo gồm cửa/lối ra vào, ATM, khu vực giao dịch, bãi xe, kỹ thuật và lối thoát hiểm theo ngữ cảnh từng chốt.',
            checkpointCode: `CP-${postIndex + 1}`,
            requiredEvidenceTypes: postIndex === 1 || postIndex === 3 ? ['PHOTO', 'GPS', 'NOTE'] : ['GPS', 'NOTE'],
            isMandatory: true,
            sortOrder: postIndex + 1,
            metadata: {
              questions: [
                'Khu vực có dấu hiệu bất thường không?',
                'Cửa/lối ra vào liên quan có đúng trạng thái quy định không?',
                'Có người lạ lưu lại bất thường không?',
                'Có vật thể lạ hoặc tài sản bỏ quên không?',
              ],
            },
          },
        });
      }
    }

    for (const severity of [IncidentSeverity.LOW, IncidentSeverity.MEDIUM, IncidentSeverity.HIGH, IncidentSeverity.CRITICAL]) {
      for (const incidentType of ['CUSTOMER_COMPLAINT', 'ATM_ANOMALY', 'DOOR_NOT_SECURED', 'CAMERA_SIGNAL_LOSS']) {
        const responseDueMinutes = severity === IncidentSeverity.CRITICAL ? 5 : severity === IncidentSeverity.HIGH ? 10 : 15;
        const resolutionDueMinutes = severity === IncidentSeverity.CRITICAL ? 60 : severity === IncidentSeverity.HIGH ? 120 : 240;
        await sys.incidentSlaRule.upsert({
          where: { id: id('incident_sla', `${severity}_${incidentType}`) },
          update: { status: 'ACTIVE', responseDueMinutes, resolutionDueMinutes },
          create: {
            id: id('incident_sla', `${severity}_${incidentType}`),
            tenantId: TENANT_ID,
            contractId: CONTRACT_ID,
            severity,
            incidentType,
            responseDueMinutes,
            resolutionDueMinutes,
            escalationAfterMinutes: responseDueMinutes + 10,
            penaltyPolicy: { violationCode: 'INCIDENT_RESPONSE_BREACH', amount: 1000000, demo: true },
            requiredEvidenceTypes: ['PHOTO', 'NOTE'],
            status: 'ACTIVE',
          },
        });
      }
    }

    const allShiftBundles: ShiftBundle[] = [];
    const violationEvents: { violationEventId: string; type: string; amount: number; reason: string }[] = [];
    let incidentCounter = 0;
    let evidenceCounter = 0;

    for (let dayOffset = 0; dayOffset < DAYS_TO_SEED; dayOffset += 1) {
      const currentDate = addDays(SEED_START, dayOffset);
      const currentDateKey = dateKey(currentDate);
      const sunday = isSunday(currentDate);

      for (const [siteIndex, siteId] of siteIds.entries()) {
        const staff = staffBySite.get(siteId);
        const guardPosts = guardPostsBySite.get(siteId) ?? [];
        const mainPostId = guardPosts[0];
        if (!staff || !mainPostId) continue;

        const shiftPlans: { shiftType: 'DAY' | 'NIGHT' | 'ADMIN'; staffId: string; guardPostId: string }[] = [
          { shiftType: 'DAY', staffId: staff.dayGuardId, guardPostId: mainPostId },
          { shiftType: 'NIGHT', staffId: staff.nightGuardId, guardPostId: mainPostId },
        ];
        if (!sunday) {
          shiftPlans.push({ shiftType: 'ADMIN', staffId: staff.adminId, guardPostId: mainPostId });
        }

        for (const plan of shiftPlans) {
          const shiftDef = SHIFT_DEFS[plan.shiftType];
          const scheduleId = id('shift_schedule', `${sites[siteIndex].code}_${currentDateKey}_${plan.shiftType}`);
          const assignmentId = id('shift_assignment', `${scheduleId}_${plan.staffId}`);
          const sessionId = id('shift_session', `${scheduleId}_${plan.staffId}`);
          const plannedStart = atTime(currentDate, shiftDef.startTime);
          const plannedEnd = endAt(currentDate, plan.shiftType);
          const lateCase = (siteIndex + dayOffset + (plan.shiftType === 'NIGHT' ? 2 : 0)) % 17 === 0;
          const earlyCase = (siteIndex * 2 + dayOffset + (plan.shiftType === 'ADMIN' ? 3 : 0)) % 23 === 0;
          const missingCheckIn = plan.shiftType !== 'ADMIN' && (siteIndex + dayOffset) % 67 === 0;
          const missingCheckOut = (siteIndex + dayOffset + (plan.shiftType === 'DAY' ? 5 : 0)) % 59 === 0;
          const absentCase = plan.shiftType === 'DAY' && (siteIndex + dayOffset) % 89 === 0;
          const checkInAt = missingCheckIn || absentCase ? null : addMinutes(plannedStart, lateCase ? 12 : -randomMinute(siteIndex, dayOffset, 5));
          const checkOutAt = missingCheckOut || absentCase ? null : addMinutes(plannedEnd, earlyCase ? -18 : randomMinute(siteIndex + 2, dayOffset, 7));
          const status = absentCase ? 'ABSENT' : lateCase ? 'LATE' : earlyCase ? 'EARLY_LEAVE' : missingCheckIn ? 'MISSING_CHECK_IN' : missingCheckOut ? 'MISSING_CHECK_OUT' : 'COMPLETED';
          const exceptionCodes = [
            ...(lateCase ? ['LATE_CHECKIN'] : []),
            ...(earlyCase ? ['EARLY_LEAVE'] : []),
            ...(missingCheckIn ? ['MISSING_CHECK_IN'] : []),
            ...(missingCheckOut ? ['MISSING_CHECK_OUT'] : []),
            ...(absentCase ? ['ABSENT'] : []),
          ];
          const notes = makeAttendanceNote(status);

          await sys.shiftSchedule.upsert({
            where: { tenantId_contractId_siteId_guardPostId_date_shiftType_startTime_endTime_positionName: { tenantId: TENANT_ID, contractId: CONTRACT_ID, siteId, guardPostId: plan.guardPostId, date: currentDateKey, shiftType: plan.shiftType, startTime: shiftDef.startTime, endTime: shiftDef.endTime, positionName: shiftDef.name } },
            update: { requiredCount: 1 },
            create: {
              id: scheduleId,
              tenantId: TENANT_ID,
              contractId: CONTRACT_ID,
              guardPostId: plan.guardPostId,
              date: currentDateKey,
              shiftType: plan.shiftType,
              startTime: shiftDef.startTime,
              endTime: shiftDef.endTime,
              requiredCount: 1,
              positionName: shiftDef.name,
              siteId,
            },
          });

          await sys.shiftAssignment.upsert({
            where: { tenantId_shiftScheduleId_staffId: { tenantId: TENANT_ID, shiftScheduleId: scheduleId, staffId: plan.staffId } },
            update: { status: absentCase ? 'ABSENT' : 'ASSIGNED', notes },
            create: {
              id: assignmentId,
              tenantId: TENANT_ID,
              shiftScheduleId: scheduleId,
              staffId: plan.staffId,
              vendorId: VENDOR_ID,
              contractId: CONTRACT_ID,
              siteId,
              status: absentCase ? 'ABSENT' : 'ASSIGNED',
              assignedBy: TENANT_ADMIN_ID,
              assignedAt: addMinutes(plannedStart, -720),
              notes,
              metadata: { shiftCode: shiftDef.code, plannedStart, plannedEnd, demo: true },
            },
          });

          await sys.shiftComplianceItem.upsert({
            where: { id: id('shift_compliance', `${scheduleId}_${plan.shiftType}`) },
            update: { actualCount: absentCase ? 0 : 1, missingCount: absentCase ? 1 : 0, status: absentCase ? 'PENALIZED' : 'RESOLVED' },
            create: {
              id: id('shift_compliance', `${scheduleId}_${plan.shiftType}`),
              tenantId: TENANT_ID,
              shiftScheduleId: scheduleId,
              contractId: CONTRACT_ID,
              date: currentDateKey,
              requiredCount: 1,
              actualCount: absentCase ? 0 : 1,
              missingCount: absentCase ? 1 : 0,
              excessCount: 0,
              complianceRate: absentCase ? 0 : 100,
              penaltyAmount: toDecimal(absentCase ? 500000 : 0),
              status: absentCase ? 'PENALIZED' : 'RESOLVED',
              notes: absentCase ? 'Vắng mặt demo để kiểm thử báo cáo thiếu nhân sự.' : 'Đủ nhân sự theo lịch demo.',
            },
          });

          await sys.shiftSession.upsert({
            where: { id: sessionId },
            update: {
              status,
              openedAt: checkInAt ?? plannedStart,
              closedAt: checkOutAt,
              exceptionCodes,
              metadata: {
                plannedStart,
                plannedEnd,
                handover: buildHandover(plan.shiftType, status, sites[siteIndex].name),
                demo: true,
              },
            },
            create: {
              id: sessionId,
              tenantId: TENANT_ID,
              staffId: plan.staffId,
              shiftScheduleId: scheduleId,
              status,
              openedAt: checkInAt ?? plannedStart,
              closedAt: checkOutAt,
              exceptionCodes,
              metadata: {
                plannedStart,
                plannedEnd,
                handover: buildHandover(plan.shiftType, status, sites[siteIndex].name),
                demo: true,
              },
            },
          });

          if (checkInAt) {
            const checkInId = id('attendance', `${scheduleId}_${plan.staffId}_in`);
            await sys.attendanceRecord.upsert({
              where: { id: checkInId },
              update: { notes },
              create: {
                id: checkInId,
                tenantId: TENANT_ID,
                staffId: plan.staffId,
                type: 'CHECK_IN',
                location: { lat: sites[siteIndex].lat + 0.00005, lon: sites[siteIndex].lng - 0.00005, accuracyMeters: lateCase ? 18 : 8 },
                imageUri: `/demo/evidence/${sites[siteIndex].code}-${currentDateKey}-${plan.shiftType.toLowerCase()}-checkin.jpg`,
                isValid: !missingCheckIn,
                notes,
                shiftScheduleId: scheduleId,
                shiftSessionId: sessionId,
                checkInAt,
                lateMinutes: lateCase ? 12 : 0,
                metadata: { method: lateCase ? 'GPS_WITH_SUPERVISOR_NOTE' : 'GPS_QR', status, dataSource: 'demo_generated' },
                createdAt: checkInAt,
              },
            });
          }
          if (checkOutAt) {
            const checkOutId = id('attendance', `${scheduleId}_${plan.staffId}_out`);
            await sys.attendanceRecord.upsert({
              where: { id: checkOutId },
              update: { notes },
              create: {
                id: checkOutId,
                tenantId: TENANT_ID,
                staffId: plan.staffId,
                type: 'CHECK_OUT',
                location: { lat: sites[siteIndex].lat + 0.00004, lon: sites[siteIndex].lng - 0.00004, accuracyMeters: 10 },
                imageUri: `/demo/evidence/${sites[siteIndex].code}-${currentDateKey}-${plan.shiftType.toLowerCase()}-checkout.jpg`,
                isValid: !missingCheckOut,
                notes,
                shiftScheduleId: scheduleId,
                shiftSessionId: sessionId,
                checkOutAt,
                workedMinutes: Math.max(0, Math.round((checkOutAt.getTime() - (checkInAt ?? plannedStart).getTime()) / 60_000)),
                earlyLeaveMinutes: earlyCase ? 18 : 0,
                metadata: { method: 'GPS_QR', status, dataSource: 'demo_generated' },
                createdAt: checkOutAt,
              },
            });
          }

          allShiftBundles.push({ scheduleId, assignmentId, sessionId, staffId: plan.staffId, shiftType: plan.shiftType, startAt: plannedStart, endAt: plannedEnd, siteId, guardPostId: plan.guardPostId, status });

          if (lateCase || absentCase || missingCheckIn || missingCheckOut) {
            const violationType = absentCase ? 'MISSING_GUARD' : lateCase ? 'LATE_CHECKIN' : missingCheckIn ? 'MISSING_CHECKIN' : 'MISSING_CHECKOUT';
            const violationEventId = id('violation', `${scheduleId}_${violationType}`);
            await sys.violationEvent.upsert({
              where: { tenantId_idempotencyKey: { tenantId: TENANT_ID, idempotencyKey: `${TENANT_ID}:${scheduleId}:${violationType}` } },
              update: { status: absentCase ? 'CONFIRMED' : 'PENDING_REVIEW' },
              create: {
                id: violationEventId,
                tenantId: TENANT_ID,
                vendorId: VENDOR_ID,
                contractId: CONTRACT_ID,
                siteId,
                guardPostId: plan.guardPostId,
                staffId: plan.staffId,
                sourceType: 'SHIFT',
                violationType,
                severity: absentCase ? 'HIGH' : 'MEDIUM',
                status: absentCase ? 'CONFIRMED' : 'PENDING_REVIEW',
                occurredAt: plannedStart,
                idempotencyKey: `${TENANT_ID}:${scheduleId}:${violationType}`,
                evidence: { attendanceStatus: status, note: notes },
                penaltyAmount: toDecimal(absentCase ? 500000 : lateCase ? 100000 : 0),
                metadata: { shiftScheduleId: scheduleId, shiftSessionId: sessionId, demo: true },
              },
            });
            violationEvents.push({ violationEventId, type: violationType, amount: absentCase ? 500000 : lateCase ? 100000 : 0, reason: notes });
          }
        }
      }
    }

    const patrolTimes = {
      DAY: ['08:00', '10:30', '13:30', '16:00', '18:30'],
      NIGHT: ['20:00', '22:30', '00:30', '03:00', '05:30'],
      ADMIN: ['09:00', '14:00', '16:30'],
    } as const;

    for (const shift of allShiftBundles) {
      if (shift.status === 'ABSENT') continue;
      const siteIndex = siteIds.indexOf(shift.siteId);
      const routeId = routeIdBySite.get(shift.siteId);
      const checkpointIds = checkpointsBySite.get(shift.siteId) ?? [];
      const routeCheckpointIds = routeCheckpointIdsBySite.get(shift.siteId) ?? [];
      if (!routeId) continue;

      const times = patrolTimes[shift.shiftType];
      for (const [roundIndex, time] of times.entries()) {
        const patrolDate = shift.shiftType === 'NIGHT' && ['00:30', '03:00', '05:30'].includes(time) ? addDays(shift.startAt, 1) : shift.startAt;
        const plannedAt = atTime(patrolDate, time);
        if (plannedAt < shift.startAt || plannedAt > shift.endAt) continue;

        const assignmentId = id('patrol_assignment', `${shift.scheduleId}_${roundIndex + 1}`);
        const patrolSessionId = id('patrol_session', `${shift.scheduleId}_${roundIndex + 1}`);
        const missedRound = (siteIndex + roundIndex + shift.startAt.getDate()) % 53 === 0;
        const partialRound = (siteIndex * 3 + roundIndex + shift.startAt.getDate()) % 31 === 0;
        const lateRound = (siteIndex + roundIndex * 2 + shift.startAt.getDate()) % 19 === 0;
        const anomalyRound = (siteIndex + roundIndex + shift.startAt.getDate()) % 47 === 0;
        const scannedCount = missedRound ? 0 : partialRound ? Math.max(3, checkpointIds.length - 2) : checkpointIds.length;
        const completionPercent = Math.round((scannedCount / checkpointIds.length) * 100);
        const complianceScore = missedRound ? 0 : Math.max(45, 100 - (partialRound ? 25 : 0) - (lateRound ? 8 : 0) - (anomalyRound ? 10 : 0));
        const status = missedRound ? 'MISSED' : partialRound ? 'PARTIAL' : 'COMPLETED';

        await sys.patrolAssignment.upsert({
          where: { id: assignmentId },
          update: { status: missedRound ? 'MISSED' : 'COMPLETED' },
          create: {
            id: assignmentId,
            tenantId: TENANT_ID,
            routeId,
            staffId: shift.staffId,
            shiftScheduleId: shift.scheduleId,
            contractId: CONTRACT_ID,
            vendorId: VENDOR_ID,
            assignmentDate: dateKey(shift.startAt),
            startAt: plannedAt,
            endAt: addMinutes(plannedAt, 30),
            status: missedRound ? 'MISSED' : 'COMPLETED',
            assignedBy: TENANT_ADMIN_ID,
            metadata: { plannedPatrolTime: time, shiftType: shift.shiftType, demo: true },
          },
        });

        await sys.patrolSession.upsert({
          where: { id: patrolSessionId },
          update: {
            status,
            completionPercent,
            complianceScore,
            scannedCheckpointCount: scannedCount,
            missedCheckpointCount: checkpointIds.length - scannedCount,
            lateCheckpointCount: lateRound ? 1 : 0,
            evidenceMissingCount: partialRound ? 1 : 0,
          },
          create: {
            id: patrolSessionId,
            tenantId: TENANT_ID,
            routeId,
            staffId: shift.staffId,
            vendorId: VENDOR_ID,
            contractId: CONTRACT_ID,
            siteId: shift.siteId,
            shiftSessionId: shift.sessionId,
            patrolAssignmentId: assignmentId,
            status,
            startedAt: missedRound ? plannedAt : addMinutes(plannedAt, lateRound ? 14 : randomMinute(siteIndex, roundIndex, 4)),
            completedAt: missedRound ? null : addMinutes(plannedAt, lateRound ? 42 : 25),
            expectedCheckpointCount: checkpointIds.length,
            scannedCheckpointCount: scannedCount,
            completionPercent,
            missedCheckpointCount: checkpointIds.length - scannedCount,
            lateCheckpointCount: lateRound ? 1 : 0,
            outOfOrderCount: 0,
            gpsViolationCount: anomalyRound ? 1 : 0,
            evidenceMissingCount: partialRound ? 1 : 0,
            complianceScore,
            exceptionSummary: {
              lateRound,
              partialRound,
              missedRound,
              anomalyRound,
              note: makePatrolNote({ missedRound, partialRound, lateRound, anomalyRound }),
            },
            metadata: { shiftType: shift.shiftType, plannedPatrolTime: time, demo: true },
          },
        });

        for (let cpIndex = 0; cpIndex < scannedCount; cpIndex += 1) {
          const patrolLogId = id('patrol_log', `${patrolSessionId}_${cpIndex + 1}`);
          const scannedAt = addMinutes(plannedAt, (lateRound ? 14 : 0) + cpIndex * 3 + 2);
          await sys.patrolLog.upsert({
            where: { id: patrolLogId },
            update: { validationStatus: anomalyRound && cpIndex === 1 ? 'GPS_FLAGGED' : 'VALID' },
            create: {
              id: patrolLogId,
              tenantId: TENANT_ID,
              staffId: shift.staffId,
              checkpointId: checkpointIds[cpIndex],
              patrolSessionId,
              routeCheckpointId: routeCheckpointIds[cpIndex],
              sequenceActual: cpIndex + 1,
              scannedAt,
              photoEvidenceIds: cpIndex === 1 || cpIndex === 3 ? [`/demo/evidence/${sites[siteIndex].code}-patrol-${dateKey(scannedAt)}-${cpIndex + 1}.jpg`] : [],
              note: anomalyRound && cpIndex === 1 ? 'GPS lệch nhẹ so với bán kính, chờ giám sát xác nhận bổ sung.' : 'Khu vực bình thường, không ghi nhận bất thường.',
              validationStatus: anomalyRound && cpIndex === 1 ? 'GPS_FLAGGED' : 'VALID',
              exceptionCodes: anomalyRound && cpIndex === 1 ? ['GPS_MISMATCH'] : [],
              metadata: { plannedPatrolTime: time, result: 'Đạt', demo: true },
              createdAt: scannedAt,
            },
          });
        }

        if (missedRound || partialRound || lateRound || anomalyRound) {
          const violationType = missedRound ? 'MISSED_PATROL' : partialRound ? 'INCOMPLETE_PATROL' : anomalyRound ? 'GPS_MISMATCH' : 'LATE_PATROL';
          const violationEventId = id('violation', `${patrolSessionId}_${violationType}`);
          await sys.violationEvent.upsert({
            where: { tenantId_idempotencyKey: { tenantId: TENANT_ID, idempotencyKey: `${TENANT_ID}:${patrolSessionId}:${violationType}` } },
            update: { status: missedRound || partialRound ? 'CONFIRMED' : 'PENDING_REVIEW' },
            create: {
              id: violationEventId,
              tenantId: TENANT_ID,
              vendorId: VENDOR_ID,
              contractId: CONTRACT_ID,
              siteId: shift.siteId,
              guardPostId: shift.guardPostId,
              staffId: shift.staffId,
              patrolSessionId,
              sourceType: 'PATROL',
              violationType,
              severity: missedRound ? 'HIGH' : 'MEDIUM',
              status: missedRound || partialRound ? 'CONFIRMED' : 'PENDING_REVIEW',
              occurredAt: plannedAt,
              idempotencyKey: `${TENANT_ID}:${patrolSessionId}:${violationType}`,
              evidence: { patrolSessionId, completionPercent, complianceScore, note: makePatrolNote({ missedRound, partialRound, lateRound, anomalyRound }) },
              penaltyAmount: toDecimal(missedRound ? 300000 : partialRound ? 200000 : 0),
              metadata: { demo: true },
            },
          });
          violationEvents.push({ violationEventId, type: violationType, amount: missedRound ? 300000 : partialRound ? 200000 : 0, reason: makePatrolNote({ missedRound, partialRound, lateRound, anomalyRound }) });
        }

        if (anomalyRound && incidentCounter < 72) {
          const incidentSeed = incidentContent(incidentCounter);
          const incidentId = id('incident', `${shift.siteId}_${dateKey(plannedAt)}_${roundIndex}_${incidentCounter}`);
          const reportedAt = addMinutes(plannedAt, 18);
          const responseDueAt = addMinutes(reportedAt, incidentSeed.severity === IncidentSeverity.HIGH ? 10 : 15);
          const resolutionDueAt = addMinutes(reportedAt, incidentSeed.severity === IncidentSeverity.HIGH ? 120 : 240);
          const breached = incidentSeed.status === IncidentStatus.ESCALATED;

          await sys.incident.upsert({
            where: { id: incidentId },
            update: { status: incidentSeed.status, slaBreached: breached },
            create: {
              id: incidentId,
              tenantId: TENANT_ID,
              staffId: shift.staffId,
              vendorId: VENDOR_ID,
              contractId: CONTRACT_ID,
              siteId: shift.siteId,
              type: incidentSeed.type,
              severity: incidentSeed.severity,
              severityWeight: incidentSeed.severity === IncidentSeverity.HIGH ? 3 : incidentSeed.severity === IncidentSeverity.MEDIUM ? 2 : 1,
              description: incidentSeed.description,
              imageUri: `/demo/evidence/${sites[siteIndex].code}-incident-${dateKey(reportedAt)}-${incidentCounter}.jpg`,
              location: { lat: sites[siteIndex].lat + 0.00006, lon: sites[siteIndex].lng - 0.00003 },
              status: incidentSeed.status,
              assignedToId: supervisors[siteIndex % supervisors.length],
              resolutionNotes: incidentSeed.status === IncidentStatus.CLOSED ? incidentSeed.action : null,
              resolutionImages: incidentSeed.status === IncidentStatus.CLOSED ? [`/demo/evidence/${sites[siteIndex].code}-incident-resolution-${incidentCounter}.jpg`] : [],
              slaDeadline: resolutionDueAt,
              slaBreached: breached,
              slaMinutes: Math.round((resolutionDueAt.getTime() - reportedAt.getTime()) / 60_000),
              responseDueAt,
              resolutionDueAt,
              responseAcknowledgedAt: addMinutes(reportedAt, breached ? 25 : 8),
              resolutionSubmittedAt: incidentSeed.status === IncidentStatus.CLOSED ? addMinutes(reportedAt, 90) : null,
              requiredEvidenceTypes: ['PHOTO', 'NOTE'],
              escalatedAt: breached ? addMinutes(responseDueAt, 20) : null,
              resolvedById: incidentSeed.status === IncidentStatus.CLOSED ? supervisors[siteIndex % supervisors.length] : null,
              approvedById: incidentSeed.status === IncidentStatus.CLOSED ? TENANT_ADMIN_ID : null,
              closedById: incidentSeed.status === IncidentStatus.CLOSED ? TENANT_ADMIN_ID : null,
              reportedAt,
              investigatingAt: addMinutes(reportedAt, 12),
              resolvedAt: incidentSeed.status === IncidentStatus.CLOSED ? addMinutes(reportedAt, 110) : null,
              closedAt: incidentSeed.status === IncidentStatus.CLOSED ? addMinutes(reportedAt, 130) : null,
            },
          });

          const timelineId = id('incident_timeline', `${incidentId}_reported`);
          await sys.incidentTimeline.upsert({
            where: { id: timelineId },
            update: { notes: incidentSeed.description },
            create: {
              id: timelineId,
              tenantId: TENANT_ID,
              incidentId,
              actorId: shift.staffId,
              actorRole: 'guard',
              action: IncidentTimelineAction.REPORTED,
              toStatus: IncidentStatus.REPORTED,
              notes: incidentSeed.description,
              evidenceIds: [],
              traceId: `seed-trace-${incidentId}`,
              metadata: { patrolSessionId, demo: true },
              createdAt: reportedAt,
            },
          });

          const evidenceId = id('incident_evidence', `${incidentId}_photo`);
          await sys.incidentEvidence.upsert({
            where: { id: evidenceId },
            update: { status: 'ACTIVE' },
            create: {
              id: evidenceId,
              tenantId: TENANT_ID,
              incidentId,
              timelineId,
              actorId: shift.staffId,
              sourceType: 'PATROL',
              sourceId: patrolSessionId,
              uploadedBy: shift.staffId,
              kind: IncidentEvidenceKind.PHOTO,
              uri: `/demo/evidence/${sites[siteIndex].code}-incident-${dateKey(reportedAt)}-${incidentCounter}.jpg`,
              fileType: 'image/jpeg',
              fileUrl: `/demo/evidence/${sites[siteIndex].code}-incident-${dateKey(reportedAt)}-${incidentCounter}.jpg`,
              thumbnailUrl: `/demo/evidence/thumbs/${sites[siteIndex].code}-incident-${dateKey(reportedAt)}-${incidentCounter}.jpg`,
              capturedAt: reportedAt,
              gpsLat: sites[siteIndex].lat + 0.00006,
              gpsLng: sites[siteIndex].lng - 0.00003,
              checksum: crypto.createHash('sha256').update(`${incidentId}:photo`).digest('hex'),
              note: 'Ảnh minh chứng demo, không phải ảnh thật của ngân hàng hoặc khách hàng.',
              status: 'ACTIVE',
              metadata: { demo: true, safety: 'path_only' },
              createdAt: reportedAt,
            },
          });
          evidenceCounter += 1;

          if (breached) {
            const violationType = 'INCIDENT_RESPONSE_BREACH';
            const violationEventId = id('violation', `${incidentId}_${violationType}`);
            await sys.violationEvent.upsert({
              where: { tenantId_idempotencyKey: { tenantId: TENANT_ID, idempotencyKey: `${TENANT_ID}:${incidentId}:${violationType}` } },
              update: { status: 'CONFIRMED' },
              create: {
                id: violationEventId,
                tenantId: TENANT_ID,
                vendorId: VENDOR_ID,
                contractId: CONTRACT_ID,
                siteId: shift.siteId,
                guardPostId: shift.guardPostId,
                staffId: shift.staffId,
                sourceType: 'INCIDENT',
                violationType,
                severity: 'HIGH',
                status: 'CONFIRMED',
                occurredAt: reportedAt,
                idempotencyKey: `${TENANT_ID}:${incidentId}:${violationType}`,
                evidence: { incidentId, responseDueAt, acknowledgedAt: addMinutes(reportedAt, 25) },
                penaltyAmount: toDecimal(1000000),
                metadata: { demo: true },
              },
            });
            violationEvents.push({ violationEventId, type: violationType, amount: 1000000, reason: 'Phản hồi sự cố quá SLA trong dữ liệu demo.' });
          }

          incidentCounter += 1;
        }
      }
    }

    for (const [idx, violation] of violationEvents.slice(0, 6).entries()) {
      await sys.violationDispute.upsert({
        where: { id: id('violation_dispute', `${violation.violationEventId}_${idx}`) },
        update: { status: idx % 2 === 0 ? 'OPEN' : 'REJECTED' },
        create: {
          id: id('violation_dispute', `${violation.violationEventId}_${idx}`),
          tenantId: TENANT_ID,
          violationEventId: violation.violationEventId,
          vendorId: VENDOR_ID,
          contractId: CONTRACT_ID,
          siteId: siteIds[idx % siteIds.length],
          submittedBy: supervisors[idx % supervisors.length],
          resolvedBy: idx % 2 === 0 ? null : TENANT_ADMIN_ID,
          status: idx % 2 === 0 ? 'OPEN' : 'REJECTED',
          reason: 'Nhà thầu gửi giải trình demo để kiểm thử workflow dispute và đối soát nghiệm thu tháng.',
          responseNote: idx % 2 === 0 ? null : 'Giải trình chưa đủ bằng chứng nên giữ nguyên vi phạm demo.',
          resolution: idx % 2 === 0 ? null : 'REJECTED',
          metadata: { demo: true },
        },
      });
    }

    const confirmedViolations = violationEvents.filter(v => v.amount > 0);
    const totalPenalty = confirmedViolations.reduce((sum, item) => sum + item.amount, 0);

    await sys.vendorScorecard.upsert({
      where: { id: 'scorecard_ktc_ocb_2026_05_demo' },
      update: { totalScore: 88.6, violationsCount: violationEvents.length, totalPenaltySuggested: toDecimal(totalPenalty) },
      create: {
        id: 'scorecard_ktc_ocb_2026_05_demo',
        tenantId: TENANT_ID,
        vendorId: VENDOR_ID,
        contractId: CONTRACT_ID,
        siteId: null,
        month: MONTH,
        status: 'DRAFT',
        patrolRate: 94.2,
        incidentRate: 91.1,
        disciplineRate: 96.5,
        shiftCoverageRate: 97.8,
        patrolComplianceRate: 92.4,
        incidentSlaRate: 90.3,
        evidenceCompletenessRate: 93.7,
        manualAuditRate: 95.0,
        totalScore: 88.6,
        scoreBreakdown: {
          shiftCoverage: 29.1,
          patrolCompliance: 27.7,
          incidentSla: 22.6,
          evidenceReporting: 9.1,
          manualAudit: 4.8,
          note: 'Scorecard demo cho kiểm thử UI và báo cáo nghiệm thu.',
        },
        confirmedViolationsCount: confirmedViolations.length,
        pendingViolationsCount: Math.max(0, violationEvents.length - confirmedViolations.length),
        violationsCount: violationEvents.length,
        totalPenaltySuggested: toDecimal(totalPenalty),
        metrics: {
          sites: sites.length,
          seededDays: DAYS_TO_SEED,
          attendanceTarget: '>= 2000 records',
          incidentCounter,
          evidenceCounter,
        },
      },
    });

    await sys.monthlyAcceptanceReport.upsert({
      where: { id: 'monthly_report_ktc_ocb_2026_05_demo' },
      update: { totalPenaltyAmount: toDecimal(totalPenalty), totalConfirmedViolations: confirmedViolations.length, totalPendingViolations: Math.max(0, violationEvents.length - confirmedViolations.length) },
      create: {
        id: 'monthly_report_ktc_ocb_2026_05_demo',
        tenantId: TENANT_ID,
        vendorId: VENDOR_ID,
        contractId: CONTRACT_ID,
        contractVersionId: CONTRACT_VERSION_ID,
        siteId: null,
        month: MONTH,
        status: 'PENDING_REVIEW',
        scorecardId: 'scorecard_ktc_ocb_2026_05_demo',
        revisionNumber: 1,
        revisionRootId: 'monthly_report_ktc_ocb_2026_05_demo',
        generatedAt: new Date('2026-05-26T08:00:00+07:00'),
        generatedBy: TENANT_ADMIN_ID,
        totalPenaltyAmount: toDecimal(totalPenalty),
        totalConfirmedViolations: confirmedViolations.length,
        totalPendingViolations: Math.max(0, violationEvents.length - confirmedViolations.length),
        summary: {
          conclusion: 'Đủ dữ liệu để kiểm thử báo cáo nghiệm thu tháng, SLA, vi phạm và phản hồi nhà thầu.',
          serviceClient: 'Ngân hàng Phương Đông OCB',
          sites: sites.length,
          seededDays: DAYS_TO_SEED,
        },
        contractSnapshot: { contractCode: 'KTC-OCB-DEMO-2026-001', status: 'ACTIVE', slaConfig },
        vendorSnapshot: { vendorName: 'KTC Security', status: 'ACTIVE', dataSafety: 'demo_only' },
        siteSnapshot: { siteCount: sites.length, regions: Array.from(new Set(sites.map(s => s.region))) },
        slaPolicySnapshot: slaConfig,
        penaltyPolicySnapshot: { missingGuard: 500000, missedPatrol: 300000, incidentSlaBreach: 1000000 },
        scoreFormulaVersion: 'ktc-ocb-demo-v1',
        violationSnapshots: confirmedViolations.slice(0, 50).map(v => ({ id: v.violationEventId, type: v.type, amount: v.amount, reason: v.reason })),
        evidenceSnapshots: { pathPrefix: '/demo/evidence', count: evidenceCounter, safety: 'path_only_no_real_images' },
        penaltyCalculationDetails: { totalPenalty, itemCount: confirmedViolations.length, mode: 'suggestion_before_client_approval' },
        generatedDataHash: crypto.createHash('sha256').update(`${TENANT_ID}:${MONTH}:${totalPenalty}:${violationEvents.length}`).digest('hex'),
      },
    });

    for (const [idx, violation] of confirmedViolations.slice(0, 25).entries()) {
      await sys.penaltyItem.upsert({
        where: { id: id('penalty_item', `${violation.violationEventId}_${idx}`) },
        update: { amount: toDecimal(violation.amount), finalAmount: toDecimal(violation.amount) },
        create: {
          id: id('penalty_item', `${violation.violationEventId}_${idx}`),
          tenantId: TENANT_ID,
          reportId: 'monthly_report_ktc_ocb_2026_05_demo',
          violationEventId: violation.violationEventId,
          vendorId: VENDOR_ID,
          contractId: CONTRACT_ID,
          siteId: siteIds[idx % siteIds.length],
          type: violation.type,
          status: 'SUGGESTED',
          baseAmount: toDecimal(violation.amount),
          unit: 'PER_OCCURRENCE',
          quantity: toDecimal(1),
          finalAmount: toDecimal(violation.amount),
          amount: toDecimal(violation.amount),
          reason: violation.reason,
          calculationDetail: { demo: true, source: violation.violationEventId, formula: 'baseAmount * quantity' },
          contractVersionSnapshot: { contractVersionId: CONTRACT_VERSION_ID, demo: true },
          metadata: { demo: true },
        },
      });
    }

    await sys.auditLog.create({
      data: {
        id: `audit_ktc_ocb_seed_${Date.now()}`,
        tenantId: TENANT_ID,
        userId: TENANT_ADMIN_ID,
        action: 'SEED_KTC_OCB_DEMO',
        resource: 'database_seed',
        payload: {
          tenant: TENANT_ID,
          sites: sites.length,
          days: DAYS_TO_SEED,
          purpose: 'staging/pre-deploy demo data',
        },
        status: 'SUCCESS',
        traceId: `seed-ktc-ocb-${Date.now()}`,
        timestamp: BigInt(Date.now()),
      },
    });

    logger.success(`KTC x OCB seed completed: ${sites.length} sites, ${allShiftBundles.length} shift sessions, ${incidentCounter} incidents, ${violationEvents.length} violations.`);
  }, { timeout: 120000 });
}

function randomMinute(a: number, b: number, max: number): number {
  return (a * 7 + b * 11) % (max + 1);
}

function makeAttendanceNote(status: string): string {
  switch (status) {
    case 'LATE':
      return 'Nhân viên vào ca trễ 12 phút do kẹt xe, đã báo ca trưởng và chờ giám sát xác nhận.';
    case 'EARLY_LEAVE':
      return 'Nhân viên ra ca sớm 18 phút do điều phối bàn giao, đã ghi nhận để đối soát.';
    case 'MISSING_CHECK_IN':
      return 'Thiếu check-in do lỗi thiết bị tại chốt, giám sát cần xác nhận bổ sung.';
    case 'MISSING_CHECK_OUT':
      return 'Thiếu check-out do thiết bị mất kết nối cuối ca, đã đưa vào ghi chú bàn giao.';
    case 'ABSENT':
      return 'Vắng mặt demo để kiểm thử thiếu nhân sự theo hợp đồng, cần điều phối trực thay.';
    default:
      return 'Chấm công đúng giờ, dữ liệu GPS/QR hợp lệ trong bán kính mục tiêu.';
  }
}

function makePatrolNote(input: { missedRound: boolean; partialRound: boolean; lateRound: boolean; anomalyRound: boolean }): string {
  if (input.missedRound) return 'Bỏ lượt tuần tra theo lịch, hệ thống ghi nhận vi phạm để đối soát SLA.';
  if (input.partialRound) return 'Lượt tuần tra thiếu điểm bắt buộc, cần giám sát xác nhận và yêu cầu bổ sung bằng chứng.';
  if (input.lateRound) return 'Lượt tuần tra hoàn thành trễ do hỗ trợ điều tiết khách tại khu vực ATM.';
  if (input.anomalyRound) return 'Phát hiện bất thường nhẹ trong lúc tuần tra, đã tạo sự cố hoặc flag chờ xác nhận.';
  return 'Lượt tuần tra hoàn thành đúng giờ, đủ điểm và không phát hiện bất thường.';
}

function buildHandover(shiftType: 'DAY' | 'NIGHT' | 'ADMIN', status: string, siteName: string) {
  const base = shiftType === 'DAY'
    ? `Ca ngày tại ${siteName} hoạt động bình thường, khu vực ATM đông khách cuối giờ và cần ca đêm tiếp tục quan sát.`
    : shiftType === 'NIGHT'
      ? `Ca đêm tại ${siteName} đã kiểm tra các điểm trọng yếu, bàn giao lại cho ca ngày danh sách khu vực cần chú ý.`
      : `Ca hành chính tại ${siteName} đã rà soát hồ sơ bàn giao, checklist vận hành và tình trạng khu vực giao dịch.`;
  return {
    summary: base,
    status: status === 'COMPLETED' ? 'Đã xác nhận' : 'Cần bổ sung',
    openIssues: status === 'COMPLETED' ? [] : ['Có ngoại lệ chấm công/ca trực cần giám sát xác nhận.'],
    notes: status === 'MISSING_CHECK_OUT'
      ? 'Thiếu check-out do lỗi thiết bị, ca sau cần xác nhận bổ sung.'
      : 'Không ghi nhận thông tin nhạy cảm hoặc nội bộ ngân hàng.',
  };
}
