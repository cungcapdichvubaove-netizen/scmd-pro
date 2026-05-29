import { describe, expect, it } from 'vitest';
import {
  getAiContractScanAvailability,
  resolveTenantFeatureFlags,
  validateFeatureDependencies,
} from './feature-flags.js';

describe('feature flag dependency governance', () => {
  it('van giu backward compatibility khi resolve auto-enable dependency', () => {
    const resolved = resolveTenantFeatureFlags('FREE', {
      ai_contract_scan: true,
    });

    expect(resolved.ai_contract_scan).toBe(true);
    expect(resolved.contract_compliance).toBe(true);
  });

  it('tra ve dependency thieu khi feature duoc yeu cau bat nhung raw config chua du', () => {
    const issues = validateFeatureDependencies('ai_contract_scan', {
      ai_contract_scan: true,
      contract_compliance: false,
    });

    expect(issues).toEqual([
      {
        feature: 'ai_contract_scan',
        missing: ['contract_compliance'],
      },
    ]);
  });

  it('khong bao loi khi dependency da du trong raw config', () => {
    const issues = validateFeatureDependencies('ai_contract_scan', {
      ai_contract_scan: true,
      contract_compliance: true,
    });

    expect(issues).toEqual([]);
  });

  it('kiem tra duoc nhieu feature cung luc va tra ve missing theo tung feature', () => {
    const issues = validateFeatureDependencies([
      'ai_contract_scan',
      'monthly_acceptance_report',
    ], {
      ai_contract_scan: true,
      contract_compliance: false,
      monthly_acceptance_report: true,
      vendor_management: true,
      penalty_engine: false,
      vendor_scorecard: false,
    });

    expect(issues).toEqual([
      {
        feature: 'ai_contract_scan',
        missing: ['contract_compliance'],
      },
      {
        feature: 'monthly_acceptance_report',
        missing: ['contract_compliance', 'penalty_engine', 'vendor_scorecard'],
      },
    ]);
  });
  it('phan biet ro feature mac dinh tat o moi plan neu chua enable qua override', () => {
    const availability = getAiContractScanAvailability('ENTERPRISE');

    expect(availability).toEqual({
      feature: 'ai_contract_scan',
      enabledByPlan: false,
      blockedByGovernance: false,
      runtimeEnabled: false,
      status: 'DISABLED_BY_PLAN',
      reason: null,
    });
  });

  it('phan biet ro feature chua duoc bat theo plan', () => {
    const availability = getAiContractScanAvailability('PRO');

    expect(availability).toEqual({
      feature: 'ai_contract_scan',
      enabledByPlan: false,
      blockedByGovernance: false,
      runtimeEnabled: false,
      status: 'DISABLED_BY_PLAN',
      reason: null,
    });
  });
});
