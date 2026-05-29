import type { ActiveTab } from '../types';

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterField =
  | { type: 'search'; key: string; placeholder: string; label?: string }
  | { type: 'select'; key: string; label: string; options: FilterOption[] }
  | { type: 'dateRange'; key: string; label: string }
  | { type: 'boolean'; key: string; label: string };

export type TabFilterConfig = {
  tab: ActiveTab;
  title: string;
  defaults: Record<string, string>;
  primary: FilterField[];
  advanced?: FilterField[];
  persist: 'url+localStorage' | 'url' | 'memory';
};

export type TabFilterState = {
  values: Record<string, string>;
  debouncedValues: Record<string, string>;
  activeChips: Array<{ key: string; label: string; value: string }>;
  hasChanges: boolean;
  setValue: (key: string, value: string) => void;
  reset: () => void;
};
