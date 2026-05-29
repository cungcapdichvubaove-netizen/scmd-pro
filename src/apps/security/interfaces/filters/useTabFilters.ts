import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { ActiveTab } from '../types';
import type { FilterField, TabFilterConfig, TabFilterState } from './filterTypes';

const FIELD_KEYS_TO_IGNORE = new Set(['tab', 'focusId', 'focusType', 'priorityOnly']);

const getStorageKey = (tab: ActiveTab) => `tenantAdmin.filters.${tab}`;

const getFields = (config: TabFilterConfig | null) => [...(config?.primary ?? []), ...(config?.advanced ?? [])];

const getFieldKeys = (config: TabFilterConfig | null) => new Set(getFields(config).map((field) => field.key));

const getFieldsByKey = (config: TabFilterConfig | null) =>
  getFields(config).reduce<Record<string, FilterField>>((next, field) => {
    next[field.key] = field;
    return next;
  }, {});

const normalizeFilterValue = (field: FilterField | undefined, value: string, fallback = '') => {
  if (!field) return value ?? fallback;
  if (field.type === 'select') {
    return field.options.some((option) => option.value === value) ? value : fallback;
  }
  if (field.type === 'boolean') {
    return value === 'true' || value === 'false' ? value : fallback;
  }
  return value ?? fallback;
};

const cleanFilters = (values: Record<string, string>, config: TabFilterConfig | null) => {
  if (!config) return {};
  const fieldKeys = getFieldKeys(config);
  const fieldsByKey = getFieldsByKey(config);
  return Object.entries({ ...config.defaults, ...values }).reduce<Record<string, string>>((next, [key, value]) => {
    if (fieldKeys.has(key) || key in config.defaults) {
      next[key] = normalizeFilterValue(fieldsByKey[key], value, config.defaults[key] ?? '');
    }
    return next;
  }, {});
};

export const parseFiltersFromQuery = (params: URLSearchParams, config: TabFilterConfig | null) => {
  if (!config) return {};
  const fieldKeys = getFieldKeys(config);
  const parsed: Record<string, string> = {};
  params.forEach((value, key) => {
    if (fieldKeys.has(key) || key in config.defaults) parsed[key] = value;
  });
  return parsed;
};

export const serializeFiltersToQuery = (values: Record<string, string>, config: TabFilterConfig | null) => {
  if (!config) return {};
  const fieldKeys = getFieldKeys(config);
  return Object.entries(values).reduce<Record<string, string>>((next, [key, value]) => {
    if ((fieldKeys.has(key) || key in config.defaults) && (value ?? '') !== (config.defaults[key] ?? '')) next[key] = value;
    return next;
  }, {});
};

export const buildApiParams = (filters: Record<string, string>) =>
  Object.entries(filters).reduce<Record<string, string>>((next, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') next[key] = value;
    return next;
  }, {});

const readStoredFilters = (tab: ActiveTab, config: TabFilterConfig | null) => {
  if (!config || config.persist === 'memory' || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(getStorageKey(tab));
    if (!raw) return {};
    return cleanFilters(JSON.parse(raw), config);
  } catch {
    return {};
  }
};

const getDisplayValue = (field: FilterField | undefined, value: string) => {
  if (!field) return value;
  if (field.type === 'select') return field.options.find((option) => option.value === value)?.label ?? value;
  if (field.type === 'boolean') return value === 'true' ? 'Có' : 'Không';
  return value;
};

const getFieldLabel = (field: FilterField | undefined, key: string) => {
  if (!field) return key;
  return 'label' in field && field.label ? field.label : 'Tìm kiếm';
};

export function useTabFilters(tab: ActiveTab, config: TabFilterConfig | null): TabFilterState {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!config) return {};
    const fromUrl = parseFiltersFromQuery(searchParams, config);
    const hasUrlFilters = Object.keys(fromUrl).length > 0;
    const fromStorage = hasUrlFilters ? {} : readStoredFilters(tab, config);
    return cleanFilters({ ...config.defaults, ...fromStorage, ...fromUrl }, config);
  });
  const [debouncedValues, setDebouncedValues] = useState(values);

  useEffect(() => {
    if (!config) {
      setValues({});
      setDebouncedValues({});
      return;
    }
    const fromUrl = parseFiltersFromQuery(searchParams, config);
    const hasUrlFilters = Object.keys(fromUrl).length > 0;
    const fromStorage = hasUrlFilters ? {} : readStoredFilters(tab, config);
    const next = cleanFilters({ ...config.defaults, ...fromStorage, ...fromUrl }, config);
    setValues(next);
    setDebouncedValues(next);
  }, [tab, config, searchKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValues(values), 350);
    return () => window.clearTimeout(timer);
  }, [values]);

  useEffect(() => {
    if (!config || config.persist === 'memory') return;
    const serialized = serializeFiltersToQuery(values, config);
    const next = new URLSearchParams(location.search);
    const fieldKeys = getFieldKeys(config);
    Array.from(next.keys()).forEach((key) => {
      if (!FIELD_KEYS_TO_IGNORE.has(key) && (fieldKeys.has(key) || key in config.defaults)) next.delete(key);
    });
    Object.entries(serialized).forEach(([key, value]) => next.set(key, value));

    const nextSearch = next.toString();
    const currentSearch = new URLSearchParams(location.search).toString();
    if (nextSearch !== currentSearch) {
      navigate({
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      }, { replace: true });
    }

    if (config.persist === 'url+localStorage' && typeof window !== 'undefined') {
      window.localStorage.setItem(getStorageKey(tab), JSON.stringify(values));
    }
  }, [values, config, location.pathname, location.search, navigate, tab]);

  const fieldsByKey = useMemo(() => {
    return getFieldsByKey(config);
  }, [config]);

  const activeChips = useMemo(() => {
    if (!config) return [];
    return Object.entries(values)
      .filter(([key, value]) => value !== '' && value !== (config.defaults[key] ?? ''))
      .map(([key, value]) => ({
        key,
        label: getFieldLabel(fieldsByKey[key], key),
        value: getDisplayValue(fieldsByKey[key], value),
      }));
  }, [config, fieldsByKey, values]);

  const hasChanges = activeChips.length > 0;

  return {
    values,
    debouncedValues,
    activeChips,
    hasChanges,
    setValue: (key, value) => setValues((current) => cleanFilters({ ...current, [key]: value === '' ? (config?.defaults[key] ?? '') : value }, config)),
    reset: () => setValues(cleanFilters(config?.defaults ?? {}, config)),
  };
}

