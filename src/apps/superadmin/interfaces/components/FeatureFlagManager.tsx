import React, { useMemo, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import {
  FEATURE_MODULE_KEYS,
  FEATURE_MODULE_LABELS,
  FEATURE_MODULE_TO_FLAGS,
  getDefaultFeatureFlagsByPlan,
  resolveFeatureModules,
  resolveTenantFeatureFlags,
  type FeatureModuleKey,
} from '../../../../shared/business/feature-flags';

type TenantRecord = {
  id: string;
  name: string;
  subdomain: string;
  plan?: string;
  subscriptionPlan?: 'FREE' | 'PRO' | 'ENTERPRISE';
  features_enabled?: Record<string, boolean>;
};

interface FeatureFlagManagerProps {
  tenants: TenantRecord[];
  onUpdateTenantFeatures: (tenantId: string, featuresEnabled: Record<string, boolean>) => Promise<void>;
}

const planOptions = ['ALL', 'FREE', 'PRO', 'ENTERPRISE'] as const;

export const FeatureFlagManager: React.FC<FeatureFlagManagerProps> = ({
  tenants,
  onUpdateTenantFeatures,
}) => {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<(typeof planOptions)[number]>('ALL');
  const [featureSearch, setFeatureSearch] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const visibleModules = useMemo(() => {
    const normalized = featureSearch.trim().toLowerCase();
    return FEATURE_MODULE_KEYS.filter((key) => {
      if (!normalized) return true;
      return key.includes(normalized) || FEATURE_MODULE_LABELS[key].toLowerCase().includes(normalized);
    });
  }, [featureSearch]);

  const filteredTenants = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const effectivePlan = String(tenant.subscriptionPlan || tenant.plan || 'FREE').toUpperCase();
      if (planFilter !== 'ALL' && effectivePlan !== planFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return tenant.name.toLowerCase().includes(normalizedSearch) || tenant.subdomain.toLowerCase().includes(normalizedSearch);
    });
  }, [tenants, search, planFilter]);

  const handleToggle = async (tenant: TenantRecord, moduleKey: FeatureModuleKey) => {
    const effectivePlan = String(tenant.subscriptionPlan || tenant.plan || 'FREE').toUpperCase();
    const current = resolveTenantFeatureFlags(effectivePlan, tenant.features_enabled);
    const currentModules = resolveFeatureModules(current);
    const nextValue = !currentModules[moduleKey];
    const next = { ...current };

    for (const feature of FEATURE_MODULE_TO_FLAGS[moduleKey]) {
      next[feature] = nextValue;
    }

    setSavingKey(`${tenant.id}:${moduleKey}`);
    try {
      await onUpdateTenantFeatures(tenant.id, next);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="space-y-2">
        <h2 className="text-3xl font-black tracking-tight text-white uppercase">Ma trận cờ tính năng</h2>
        <p className="text-slate-400 font-medium">
          Super Admin quản trị feature theo tenant và plan. Feature flag ở đây là nguồn điều khiển cho cả UI và API guard.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_220px_1fr]">
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <Search size={18} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tenant theo tên hoặc subdomain"
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500"
          />
        </label>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as (typeof planOptions)[number])}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none"
        >
          {planOptions.map((plan) => (
            <option key={plan} value={plan} className="bg-slate-900">
              {plan === 'ALL' ? 'Tất cả plan' : plan}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <ShieldCheck size={18} className="text-slate-500" />
          <input
            value={featureSearch}
            onChange={(e) => setFeatureSearch(e.target.value)}
            placeholder="Lọc feature theo mã hoặc nhãn"
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-scmd-navy/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="sticky left-0 z-20 bg-[#172034] px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tenant</th>
                <th className="sticky left-[260px] z-20 bg-[#172034] px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Plan</th>
                {visibleModules.map((moduleKey) => (
                  <th key={moduleKey} className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <div className="min-w-[180px]">
                      <p>{FEATURE_MODULE_LABELS[moduleKey]}</p>
                      <p className="mt-1 text-[9px] text-slate-500">{moduleKey}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => {
                const effectivePlan = String(tenant.subscriptionPlan || tenant.plan || 'FREE').toUpperCase();
                const resolved = resolveTenantFeatureFlags(effectivePlan, tenant.features_enabled);
                const resolvedModules = resolveFeatureModules(resolved);
                const defaults = getDefaultFeatureFlagsByPlan(effectivePlan);
                const defaultModules = resolveFeatureModules(defaults);

                return (
                  <tr key={tenant.id} className="border-t border-white/5">
                    <td className="sticky left-0 z-10 bg-[#11192b] px-4 py-4 align-top">
                      <p className="font-black text-white">{tenant.name}</p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-slate-500">{tenant.subdomain}</p>
                    </td>
                    <td className="sticky left-[260px] z-10 bg-[#11192b] px-4 py-4 align-top">
                      <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-sky-300">
                        {effectivePlan}
                      </span>
                    </td>
                    {visibleModules.map((moduleKey) => {
                      const active = resolvedModules[moduleKey];
                      const defaultActive = defaultModules[moduleKey];
                      const mappedFlags = FEATURE_MODULE_TO_FLAGS[moduleKey];
                      const isSaving = savingKey === `${tenant.id}:${moduleKey}`;

                      return (
                        <td key={moduleKey} className="px-4 py-4 align-top">
                          <button
                            onClick={() => void handleToggle(tenant, moduleKey)}
                            disabled={isSaving}
                            className={`flex min-w-[160px] items-center justify-between rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                              active
                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                : 'border-slate-700 bg-slate-900/60 text-slate-400'
                            } ${isSaving ? 'opacity-60' : 'hover:scale-[1.02]'}`}
                          >
                            <span>{active ? 'ON' : 'OFF'}</span>
                            <span className="text-right text-[9px] text-slate-500">
                              {defaultActive ? 'Default: ON' : 'Default: OFF'}
                              <br />
                              {mappedFlags.join(', ')}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
