import React, { useEffect, useState, useCallback } from 'react';
import { useBillingStore } from './billing.store.js';
import { BillingStatCards } from './BillingStatCards.js';
import { TenantBillingTable } from './TenantBillingTable.js';
import { ActivatePanel } from './ActivatePanel.js';
import { PaymentHistoryPanel } from './PaymentHistoryPanel.js';
import { apiFetch } from '../../../lib/api.js';
import { Plus, RefreshCcw } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export const BillingManagementTab: React.FC = () => {
  const { 
    setTenants, 
    isActivating, 
    selectedTenant, 
    setActivating, 
    filter, 
    selectTenant 
  } = useBillingStore();
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/sys-manage/billing/tenants?status=${filter}&take=100`);
      const now = new Date();
      const items = res.items.map((i: any) => {
        const expiresAt = i.expiresAt ? new Date(i.expiresAt) : null;
        const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
        return { ...i, daysLeft };
      });
      setTenants(items);
    } catch (err: any) {
      toast.error('Lỗi khi tải danh sách billing');
    } finally {
      setLoading(false);
    }
  }, [filter, setTenants]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants, refreshKey]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#CCD6F6]">Billing & Subscriptions (v2.0)</h1>
          <p className="text-sm text-[#8892B0] mt-1">
            Quản lý tài chính, kích hoạt thuê bao và giám sát doanh thu.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            className="h-12 w-12 flex items-center justify-center rounded-xl bg-[#112240] border border-white/5 text-[#8892B0] hover:text-white transition-all"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          {!isActivating && (
            <button
              onClick={() => {
                selectTenant(null);
                setActivating(true);
              }}
              className="h-12 px-6 rounded-xl bg-[#2563EB] text-white hover:bg-blue-600 transition-colors font-bold flex items-center gap-2"
            >
              <Plus size={20} />
              Kích hoạt mới
            </button>
          )}
        </div>
      </div>

      <BillingStatCards />
      
      <TenantBillingTable onRefresh={() => setRefreshKey(k => k + 1)} />

      {/* Overlays */}
      {isActivating && <ActivatePanel />}
      {selectedTenant && !isActivating && <PaymentHistoryPanel />}
    </div>
  );
};
