export const FEATURE_FLAG_KEYS = [
  'contract_compliance',
  'vendor_management',
  'vendor_commander',
  'shift_planning',
  'patrol_route',
  'incident_sla',
  'penalty_engine',
  'vendor_scorecard',
  'monthly_acceptance_report',
  'export_pdf',
  'evidence_storage',
  'ai_contract_scan',
  'predictive_guard',
  'usage_analytics',
  'benchmark_mode',
  'sos_button',
] as const;

export const FEATURE_MODULE_KEYS = [
  'contract_management',
  'vendor_management',
  'vendor_commander',
  'shift_cutting',
  'patrol',
  'incident_sla',
  'penalty_engine',
  'vendor_scorecard',
  'monthly_acceptance_report',
  'export_pdf',
  'evidence_storage',
  'ai_contract_scan',
] as const;

export type FeatureFlagKey = typeof FEATURE_FLAG_KEYS[number];
export type FeatureModuleKey = typeof FEATURE_MODULE_KEYS[number];

export type FeatureFlagMap = Record<FeatureFlagKey, boolean>;
export type FeatureFlagOverrideMap = Partial<FeatureFlagMap>;
export type FeatureRuntimeAvailabilityStatus = 'ENABLED' | 'BLOCKED_BY_GOVERNANCE' | 'DISABLED_BY_PLAN';

export interface FeatureRuntimeAvailability {
  feature: FeatureFlagKey;
  enabledByPlan: boolean;
  blockedByGovernance: boolean;
  runtimeEnabled: boolean;
  status: FeatureRuntimeAvailabilityStatus;
  reason: string | null;
}

export interface FeatureDependencyValidationIssue {
  feature: FeatureFlagKey;
  missing: FeatureFlagKey[];
}

export const FEATURE_FLAG_LABELS: Record<FeatureFlagKey, string> = {
  contract_compliance: 'Đối soát hợp đồng',
  vendor_management: 'Quản lý nhà thầu',
  vendor_commander: 'Chỉ huy nhà thầu',
  shift_planning: 'Lập kế hoạch ca trực',
  patrol_route: 'Tuyến tuần tra',
  incident_sla: 'Sự cố SLA',
  penalty_engine: 'Cơ chế tính phạt',
  vendor_scorecard: 'Bảng điểm nhà thầu',
  monthly_acceptance_report: 'Nghiệm thu theo tháng',
  export_pdf: 'Xuất PDF',
  evidence_storage: 'Kho bằng chứng',
  ai_contract_scan: 'AI quét hợp đồng',
  predictive_guard: 'Giám sát dự báo',
  usage_analytics: 'Phân tích mức độ sử dụng',
  benchmark_mode: 'Chế độ benchmark',
  sos_button: 'Nút SOS',
};

export const FEATURE_MODULE_LABELS: Record<FeatureModuleKey, string> = {
  contract_management: 'Quản lý hợp đồng',
  vendor_management: 'Quản lý nhà thầu',
  vendor_commander: 'Chỉ huy nhà thầu',
  shift_cutting: 'Cắt ca',
  patrol: 'Tuần tra',
  incident_sla: 'Sự cố SLA',
  penalty_engine: 'Penalty Engine',
  vendor_scorecard: 'Vendor Scorecard',
  monthly_acceptance_report: 'Báo cáo nghiệm thu tháng',
  export_pdf: 'Xuất PDF',
  evidence_storage: 'Kho bằng chứng',
  ai_contract_scan: 'AI Scan hợp đồng',
};

export const FEATURE_MODULE_TO_FLAGS: Record<FeatureModuleKey, FeatureFlagKey[]> = {
  contract_management: ['contract_compliance'],
  vendor_management: ['vendor_management'],
  vendor_commander: ['vendor_commander'],
  shift_cutting: ['shift_planning'],
  patrol: ['patrol_route'],
  incident_sla: ['incident_sla'],
  penalty_engine: ['penalty_engine'],
  vendor_scorecard: ['vendor_scorecard'],
  monthly_acceptance_report: ['monthly_acceptance_report'],
  export_pdf: ['export_pdf'],
  evidence_storage: ['evidence_storage'],
  ai_contract_scan: ['ai_contract_scan'],
};

export function resolveFeatureModules(flags: FeatureFlagMap): Record<FeatureModuleKey, boolean> {
  return FEATURE_MODULE_KEYS.reduce((acc, moduleKey) => {
    const mappedFlags = FEATURE_MODULE_TO_FLAGS[moduleKey];
    acc[moduleKey] = mappedFlags.every((flag) => flags[flag] === true);
    return acc;
  }, {} as Record<FeatureModuleKey, boolean>);
}

const FEATURE_DEPENDENCIES: Partial<Record<FeatureFlagKey, FeatureFlagKey[]>> = {
  vendor_commander: ['vendor_management', 'contract_compliance', 'shift_planning'],
  shift_planning: ['contract_compliance'],
  penalty_engine: ['contract_compliance'],
  vendor_scorecard: ['vendor_management', 'contract_compliance'],
  monthly_acceptance_report: ['contract_compliance', 'vendor_management', 'penalty_engine', 'vendor_scorecard'],
  export_pdf: ['monthly_acceptance_report'],
  ai_contract_scan: ['contract_compliance'],
  predictive_guard: ['patrol_route', 'usage_analytics'],
  benchmark_mode: ['patrol_route'],
};

const FREE_DEFAULTS: FeatureFlagMap = {
  contract_compliance: false,
  vendor_management: false,
  vendor_commander: false,
  shift_planning: false,
  patrol_route: true,
  incident_sla: false,
  penalty_engine: false,
  vendor_scorecard: false,
  monthly_acceptance_report: false,
  export_pdf: false,
  evidence_storage: true,
  ai_contract_scan: false,
  predictive_guard: false,
  usage_analytics: false,
  benchmark_mode: false,
  sos_button: true,
};

const PRO_DEFAULTS: FeatureFlagMap = {
  contract_compliance: true,
  vendor_management: true,
  vendor_commander: true,
  shift_planning: true,
  patrol_route: true,
  incident_sla: true,
  penalty_engine: true,
  vendor_scorecard: true,
  monthly_acceptance_report: true,
  export_pdf: true,
  evidence_storage: true,
  ai_contract_scan: false,
  predictive_guard: false,
  usage_analytics: true,
  benchmark_mode: true,
  sos_button: true,
};

const ENTERPRISE_DEFAULTS: FeatureFlagMap = {
  ...PRO_DEFAULTS,
  ai_contract_scan: false,
  predictive_guard: true,
};

export function getDefaultFeatureFlagsByPlan(plan?: string | null): FeatureFlagMap {
  const normalized = String(plan || '').trim().toUpperCase();
  if (normalized === 'ENTERPRISE') {
    return applyFeatureDependencies({ ...ENTERPRISE_DEFAULTS });
  }
  if (normalized === 'PRO') {
    return applyFeatureDependencies({ ...PRO_DEFAULTS });
  }
  return applyFeatureDependencies({ ...FREE_DEFAULTS });
}

export function normalizeFeatureFlagOverrides(value: unknown): FeatureFlagOverrideMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  return FEATURE_FLAG_KEYS.reduce((acc, key) => {
    if (typeof source[key] === 'boolean') {
      acc[key] = source[key] as boolean;
    }
    return acc;
  }, {} as FeatureFlagOverrideMap);
}

export function getFeatureDependencies(feature: FeatureFlagKey): FeatureFlagKey[] {
  return [...(FEATURE_DEPENDENCIES[feature] ?? [])];
}

export function validateFeatureDependencies(
  requested: FeatureFlagKey | FeatureFlagKey[],
  flags: Partial<FeatureFlagMap>,
): FeatureDependencyValidationIssue[] {
  const requestedFeatures = Array.isArray(requested) ? requested : [requested];
  const uniqueRequestedFeatures = [...new Set(requestedFeatures)];

  return uniqueRequestedFeatures.reduce((issues, feature) => {
    if (flags[feature] !== true) {
      return issues;
    }

    const missing = getFeatureDependencies(feature).filter((dependency) => flags[dependency] !== true);
    if (missing.length > 0) {
      issues.push({ feature, missing });
    }

    return issues;
  }, [] as FeatureDependencyValidationIssue[]);
}

export function applyFeatureDependencies(flags: FeatureFlagMap): FeatureFlagMap {
  const resolved = { ...flags };
  let changed = true;

  while (changed) {
    changed = false;
    for (const feature of FEATURE_FLAG_KEYS) {
      if (!resolved[feature]) {
        continue;
      }

      const dependencies = FEATURE_DEPENDENCIES[feature] ?? [];
      for (const dependency of dependencies) {
        if (!resolved[dependency]) {
          resolved[dependency] = true;
          changed = true;
        }
      }
    }
  }

  return resolved;
}

export function resolveTenantFeatureFlags(plan?: string | null, overrides?: unknown): FeatureFlagMap {
  return applyFeatureDependencies({
    ...getDefaultFeatureFlagsByPlan(plan),
    ...normalizeFeatureFlagOverrides(overrides),
  });
}

export interface FeatureFlagResolutionDetail {
  feature: FeatureFlagKey;
  rawConfigEnabled: boolean; // Without auto-enable
  effectiveEnabled: boolean; // With auto-enable
  autoEnabledDependencies: FeatureFlagKey[];
  dependencyWarnings: string[];
}

export interface FeatureFlagResolutionResult {
  resolvedForRuntime: FeatureFlagMap; // The effective flags
  resolvedForDisplay: FeatureFlagMap; // Raw config flags
  details: Record<FeatureFlagKey, FeatureFlagResolutionDetail>;
}

export function resolveTenantFeatureFlagsDetailed(plan?: string | null, overrides?: unknown): FeatureFlagResolutionResult {
  const planDefaults = getDefaultFeatureFlagsByPlan(plan);
  const normalizedOverrides = normalizeFeatureFlagOverrides(overrides);
  const rawConfig = { ...planDefaults, ...normalizedOverrides };
  const effectiveConfig = applyFeatureDependencies(rawConfig);

  const details = {} as Record<FeatureFlagKey, FeatureFlagResolutionDetail>;

  for (const feature of FEATURE_FLAG_KEYS) {
    const rawConfigEnabled = rawConfig[feature] === true;
    const effectiveEnabled = effectiveConfig[feature] === true;
    
    let autoEnabledDependencies: FeatureFlagKey[] = [];
    const dependencyWarnings: string[] = [];

    if (rawConfigEnabled) {
      const dependencies = getFeatureDependencies(feature);
      autoEnabledDependencies = dependencies.filter(dep => rawConfig[dep] !== true);
      if (autoEnabledDependencies.length > 0) {
        dependencyWarnings.push(`Feature '${feature}' requires dependencies: ${autoEnabledDependencies.join(', ')}. They were auto-enabled.`);
      }
    }

    details[feature] = {
      feature,
      rawConfigEnabled,
      effectiveEnabled,
      autoEnabledDependencies,
      dependencyWarnings,
    };
  }

  return {
    resolvedForRuntime: effectiveConfig,
    resolvedForDisplay: rawConfig,
    details,
  };
}

export function isKnownFeatureFlag(value: string): value is FeatureFlagKey {
  return FEATURE_FLAG_KEYS.includes(value as FeatureFlagKey);
}

export function getAiContractScanAvailability(plan?: string | null, overrides?: unknown): FeatureRuntimeAvailability {
  const planDefaults = getDefaultFeatureFlagsByPlan(plan);
  const resolved = resolveTenantFeatureFlags(plan, overrides);
  const enabledByPlan = planDefaults.ai_contract_scan === true;
  const runtimeEnabled = resolved.ai_contract_scan === true;
  const blockedByGovernance = false;

  return {
    feature: 'ai_contract_scan',
    enabledByPlan,
    blockedByGovernance,
    runtimeEnabled,
    status: runtimeEnabled ? 'ENABLED' : 'DISABLED_BY_PLAN',
    reason: null,
  };
}
