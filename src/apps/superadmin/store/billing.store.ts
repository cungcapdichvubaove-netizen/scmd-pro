import { create } from 'zustand'

export interface TenantBillingSummary {
  id:         string
  tenantId:   string
  tenant: {
    name: string
    subdomain: string
    status: string
  }
  plan:       'FREE' | 'PRO' | 'PRO_MAX'
  paidUsers:  number
  activeUsers: number
  expiresAt:  string | null
  daysLeft?:   number
}

interface BillingStore {
  tenants:         TenantBillingSummary[]
  selectedTenant:  TenantBillingSummary | null
  isActivating:    boolean
  isLoading:       boolean
  filter:          'all' | 'active' | 'expiring' | 'expired' | 'free'

  setTenants:       (tenants: TenantBillingSummary[]) => void
  selectTenant:     (tenant: TenantBillingSummary | null) => void
  setActivating:    (v: boolean) => void
  setLoading:       (v: boolean) => void
  setFilter:        (f: BillingStore['filter']) => void
}

export const useBillingStore = create<BillingStore>((set) => ({
  tenants:        [],
  selectedTenant: null,
  isActivating:   false,
  isLoading:      false,
  filter:         'all',

  setTenants:    (tenants)       => set({ tenants }),
  selectTenant:  (selectedTenant) => set({ selectedTenant }),
  setActivating: (isActivating)  => set({ isActivating }),
  setLoading:    (isLoading)     => set({ isLoading }),
  setFilter:     (filter)        => set({ filter }),
}))
