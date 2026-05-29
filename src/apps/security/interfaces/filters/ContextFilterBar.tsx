import React, { useState } from 'react';
import { RefreshCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import {
  dashboardInputClass,
  dashboardSelectClass,
  dashboardToolbarClass,
} from '../../../common/interfaces/components/DashboardUI';
import type { FilterField, TabFilterConfig, TabFilterState } from './filterTypes';

interface ContextFilterBarProps {
  config: TabFilterConfig;
  state: TabFilterState;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

const FieldShell = ({ field, children }: { field: FilterField; children: React.ReactNode }) => (
  <label className={cn('min-w-[180px] flex-1 space-y-1.5', field.type === 'search' && 'min-w-[220px] xl:max-w-[320px]')}>
    {'label' in field && field.label ? (
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{field.label}</span>
    ) : (
      <span className="sr-only">{field.type === 'search' ? field.placeholder : field.key}</span>
    )}
    {children}
  </label>
);

const FilterFieldControl = ({
  field,
  value,
  onChange,
}: {
  field: FilterField;
  value: string;
  onChange: (key: string, value: string) => void;
}) => {
  if (field.type === 'search') {
    return (
      <FieldShell field={field}>
        <span className="relative block">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={value ?? ''}
            onChange={(event) => onChange(field.key, event.target.value)}
            className={cn(dashboardInputClass, 'pl-9')}
            placeholder={field.placeholder}
          />
        </span>
      </FieldShell>
    );
  }

  if (field.type === 'select') {
    return (
      <FieldShell field={field}>
        <select
          value={value ?? ''}
          onChange={(event) => onChange(field.key, event.target.value)}
          className={dashboardSelectClass}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  if (field.type === 'dateRange') {
    return (
      <FieldShell field={field}>
        <input
          type="date"
          value={value ?? ''}
          onChange={(event) => onChange(field.key, event.target.value)}
          className={dashboardInputClass}
        />
      </FieldShell>
    );
  }

  return (
    <label className="inline-flex min-h-9 items-center gap-2 rounded-[10px] border border-white/10 bg-slate-950/25 px-3 text-[12px] font-semibold text-slate-300">
      <input
        type="checkbox"
        checked={value === 'true'}
        onChange={(event) => onChange(field.key, event.target.checked ? 'true' : '')}
        className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500/30"
      />
      {field.label}
    </label>
  );
};

export const FilterChips = ({ state }: { state: TabFilterState }) => {
  if (state.activeChips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/6 pt-2">
      {state.activeChips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => state.setValue(chip.key, '')}
          className="inline-flex h-8 items-center gap-2 rounded-full border border-blue-400/18 bg-blue-500/10 px-3 text-[11px] font-semibold text-blue-100 transition-colors hover:bg-blue-500/16"
          aria-label={`Xóa bộ lọc ${chip.label}`}
        >
          <span className="text-blue-300">{chip.label}:</span>
          <span>{chip.value}</span>
          <X size={12} />
        </button>
      ))}
      <button
        type="button"
        onClick={state.reset}
        className="h-8 rounded-full border border-white/10 px-3 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.045] hover:text-white"
      >
        Xóa tất cả
      </button>
    </div>
  );
};

export const AdvancedFilterDrawer = ({
  open,
  fields,
  state,
  onClose,
}: {
  open: boolean;
  fields: FilterField[];
  state: TabFilterState;
  onClose: () => void;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/65 backdrop-blur-sm md:absolute md:inset-auto md:right-2 md:top-[calc(100%+8px)] md:w-[520px] md:bg-transparent md:backdrop-blur-0">
      <section
        className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-[18px] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/40 md:relative md:rounded-[14px]"
        aria-label="Bộ lọc nâng cao"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Bộ lọc nâng cao</h3>
            <p className="mt-1 text-[12px] text-slate-500">Áp dụng cho danh sách ngay bên dưới toolbar này.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 text-slate-400 hover:bg-white/[0.05] hover:text-white"
            aria-label="Đóng bộ lọc nâng cao"
          >
            <X size={15} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <FilterFieldControl
              key={field.key}
              field={field}
              value={state.values[field.key] ?? ''}
              onChange={state.setValue}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export const ContextFilterBar: React.FC<ContextFilterBarProps> = ({
  config,
  state,
  onRefresh,
  isRefreshing,
  className,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedFields = config.advanced ?? [];

  return (
    <section className={cn(dashboardToolbarClass, 'relative space-y-2', className)} aria-label={config.title}>
      <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
          {config.primary.map((field) => (
            <FilterFieldControl
              key={field.key}
              field={field}
              value={state.values[field.key] ?? ''}
              onChange={state.setValue}
            />
          ))}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {advancedFields.length > 0 ? (
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              className="flex h-9 items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.035] px-3 text-[12px] font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-expanded={advancedOpen}
            >
              <SlidersHorizontal size={14} />
              Bộ lọc nâng cao
            </button>
          ) : null}
          {state.hasChanges ? (
            <button
              type="button"
              onClick={state.reset}
              className="h-9 rounded-[10px] border border-white/10 px-3 text-[12px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.045] hover:text-white"
            >
              Xóa bộ lọc
            </button>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex h-9 items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.035] px-3 text-[12px] font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : undefined} />
              Làm mới
            </button>
          ) : null}
        </div>
      </div>

      <FilterChips state={state} />
      <AdvancedFilterDrawer
        open={advancedOpen}
        fields={advancedFields}
        state={state}
        onClose={() => setAdvancedOpen(false)}
      />
    </section>
  );
};
