export type ShiftRequirementRule = {
  id?: string;
  guardPostId?: string;
  shiftType?: string;
  shiftName?: string;
  shiftLabel?: string;
  startTime?: string;
  endTime?: string;
  requiredCount?: number;
  requiredStaffCount?: number;
  patrolRequired?: boolean;
  appliesOnMonday?: boolean;
  appliesOnTuesday?: boolean;
  appliesOnWednesday?: boolean;
  appliesOnThursday?: boolean;
  appliesOnFriday?: boolean;
  appliesOnSaturday?: boolean;
  appliesOnSunday?: boolean;
  positionName?: string;
  sortOrder?: number;
  notes?: string;
};

export type StaffStandardRule = {
  id?: string;
  standardCode?: string;
  standardName?: string;
  required?: boolean;
  blockingLevel?: 'BLOCK' | 'WARN' | string;
  appliesTo?: string;
  appliesToGuardPostId?: string;
  requiredQualifications?: string[];
  details?: string;
  sortOrder?: number;
};

function parseJsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function normalizeText(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

export function parseShiftRequirements(contract: any): ShiftRequirementRule[] {
  if (Array.isArray(contract?.activeVersion?.shiftRequirements) && contract.activeVersion.shiftRequirements.length > 0) {
    return contract.activeVersion.shiftRequirements
      .filter((item: any) => item && item.startTime && item.endTime)
      .map((item: any) => ({
        id: item.id,
        guardPostId: item.guardPostId || undefined,
        shiftType: item.shiftType || undefined,
        shiftName: item.shiftName || undefined,
        shiftLabel: item.shiftName || item.positionName || undefined,
        startTime: item.startTime,
        endTime: item.endTime,
        requiredCount: Number(item.requiredStaffCount || 0),
        requiredStaffCount: Number(item.requiredStaffCount || 0),
        patrolRequired: Boolean(item.patrolRequired),
        appliesOnMonday: Boolean(item.appliesOnMonday),
        appliesOnTuesday: Boolean(item.appliesOnTuesday),
        appliesOnWednesday: Boolean(item.appliesOnWednesday),
        appliesOnThursday: Boolean(item.appliesOnThursday),
        appliesOnFriday: Boolean(item.appliesOnFriday),
        appliesOnSaturday: Boolean(item.appliesOnSaturday),
        appliesOnSunday: Boolean(item.appliesOnSunday),
        positionName: item.positionName || undefined,
        sortOrder: Number(item.sortOrder || 0),
        notes: typeof item.metadata?.notes === 'string' ? item.metadata.notes : undefined,
      }));
  }

  return parseJsonArray<ShiftRequirementRule>(contract?.acceptancePolicy?.shiftRequirements)
    .filter((item) => item && item.guardPostId && item.startTime && item.endTime)
    .map((item, index) => ({
      ...item,
      requiredCount: Number(item.requiredCount ?? item.requiredStaffCount ?? 0),
      sortOrder: Number(item.sortOrder ?? index),
    }));
}

export function parseStaffStandards(contract: any): StaffStandardRule[] {
  if (Array.isArray(contract?.activeVersion?.staffStandards) && contract.activeVersion.staffStandards.length > 0) {
    return contract.activeVersion.staffStandards.map((item: any) => ({
      id: item.id,
      standardCode: item.standardCode,
      standardName: item.standardName || item.standardCode,
      blockingLevel: item.blockingLevel || 'WARN',
      required: String(item.blockingLevel || 'WARN').toUpperCase() === 'BLOCK',
      appliesToGuardPostId: item.appliesToGuardPostId || undefined,
      appliesTo: item.appliesToGuardPost?.postName || item.appliesToGuardPostId || 'Tất cả chốt/ca',
      requiredQualifications: Array.isArray(item.requiredQualifications)
        ? item.requiredQualifications.filter((value: unknown) => typeof value === 'string')
        : [],
      details: Array.isArray(item.requiredQualifications) ? item.requiredQualifications.join(', ') : '',
      sortOrder: Number(item.sortOrder || 0),
    }));
  }

  return parseJsonArray<StaffStandardRule>(contract?.acceptancePolicy?.staffStandards).map((item, index) => ({
    ...item,
    blockingLevel: item.required ? 'BLOCK' : 'WARN',
    requiredQualifications: item.details ? [item.details] : [],
    sortOrder: Number(item.sortOrder ?? index),
  }));
}

export function dateRange(dateFrom: string, dateTo: string): string[] {
  const start = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T00:00:00.000Z`);
  const dates: string[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }

  return dates;
}

export function deriveShiftType(shiftLabel?: string, startTime?: string): string {
  const normalized = String(shiftLabel || '').trim().toUpperCase();
  if (normalized.includes('ĐÊM') || normalized.includes('DEM') || normalized.includes('NIGHT')) return 'NIGHT';
  if (normalized.includes('CHIỀU') || normalized.includes('CHIEU') || normalized.includes('AFTERNOON')) return 'AFTERNOON';
  if (normalized.includes('SÁNG') || normalized.includes('SANG') || normalized.includes('MORNING')) return 'MORNING';

  if (startTime) {
    const hour = Number(startTime.split(':')[0] || 0);
    if (hour >= 18 || hour < 5) return 'NIGHT';
    if (hour >= 12) return 'AFTERNOON';
  }

  return 'MORNING';
}

export function buildShiftDateTime(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00`);
}

function standardAppliesToSchedule(standard: StaffStandardRule, schedule: any, guardPostName?: string | null) {
  const appliesTo = normalizeText(standard.appliesTo);
  if (!appliesTo || appliesTo.includes('tất cả') || appliesTo.includes('tat ca') || appliesTo.includes('all')) {
    return true;
  }

  const haystacks = [
    normalizeText(schedule.positionName),
    normalizeText(schedule.shiftType),
    normalizeText(schedule.metadata?.shiftLabel),
    normalizeText(guardPostName),
    normalizeText(schedule.guardPostId),
  ];

  return haystacks.some((item) => item && appliesTo.includes(item));
}

export function validateGuardAgainstStandards(staff: any, standards: StaffStandardRule[], schedule: any, guardPostName?: string | null) {
  const warnings: Array<{ code: string; message: string; blocking: boolean }> = [];
  const qualifications = Array.isArray(staff?.qualifications) ? staff.qualifications.map((item: string) => normalizeText(item)) : [];

  for (const standard of standards) {
    if (!standard?.required) continue;
    if (!standardAppliesToSchedule(standard, schedule, guardPostName)) continue;

    const standardText = `${standard.standardName || ''} ${standard.details || ''}`.toLowerCase();
    let matched = true;
    let blocking = false;
    let code = 'STANDARD_WARNING';
    let message = `Guard chưa đáp ứng tiêu chuẩn bắt buộc: ${standard.standardName || 'Không rõ tiêu chuẩn'}`;

    if (standardText.includes('cccd') || standardText.includes('cmnd') || standardText.includes('id')) {
      matched = Boolean(staff?.idNumber) && (!staff?.idExpiry || new Date(staff.idExpiry) >= new Date());
      blocking = true;
      code = 'IDENTITY_STANDARD_MISSING';
      message = `${staff?.fullName || 'Guard'} thiếu CCCD/ID hợp lệ cho ca này.`;
    } else if (standardText.includes('chứng chỉ') || standardText.includes('chung chi') || standardText.includes('license') || standardText.includes('giấy phép') || standardText.includes('giay phep') || standardText.includes('nghiệp vụ') || standardText.includes('nghiep vu')) {
      const normalizedStandard = normalizeText(standard.standardName || standard.details);
      matched = Boolean(staff?.licenseNumber) || qualifications.some((item: string) => normalizedStandard && item.includes(normalizedStandard));
      blocking = true;
      code = 'LICENSE_STANDARD_MISSING';
      message = `${staff?.fullName || 'Guard'} thiếu chứng chỉ/giấy phép phù hợp cho ca này.`;
    } else {
      const normalizedStandard = normalizeText(standard.standardName || standard.details);
      matched = qualifications.some((item: string) => normalizedStandard && item.includes(normalizedStandard));
      blocking = false;
      code = 'QUALIFICATION_WARNING';
      message = `${staff?.fullName || 'Guard'} chưa có qualification khớp với tiêu chuẩn "${standard.standardName || 'không rõ'}".`;
    }

    if (!matched) {
      warnings.push({ code, message, blocking });
    }
  }

  return warnings;
}
