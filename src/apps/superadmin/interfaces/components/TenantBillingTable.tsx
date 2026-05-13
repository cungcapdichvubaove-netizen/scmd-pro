import { useBillingStore, type TenantBillingSummary } from '../../store/billing.store.js'
import { Calendar, Users, Zap, Clock } from 'lucide-react'

interface Props {
  onRefresh?: () => void
}

export function TenantBillingTable({}: Props) {
  const { tenants, isLoading, selectTenant, setActivating, filter, setFilter } = useBillingStore()

  const getStatusBadge = (t: TenantBillingSummary) => {
    if (t.plan === 'FREE') return <span className="px-2 py-0.5 rounded text-[10px] bg-gray-500/10 text-gray-400 border border-gray-500/20 uppercase font-black tracking-widest">Free</span>
    if ((t.daysLeft ?? 0) <= 0) return <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 uppercase font-black tracking-widest">Expired</span>
    if ((t.daysLeft ?? 0) <= 7) return <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 uppercase font-black tracking-widest">Expiring</span>
    return <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-black tracking-widest">Active</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {(['all', 'active', 'expiring', 'expired', 'free'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-9 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all uppercase tracking-widest ${
              filter === f ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/20' : 'bg-[#112240] text-[#8892B0] hover:text-[#CCD6F6] border border-white/5'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-[#112240] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-4 text-[10px] font-black text-[#566280] uppercase tracking-widest">Tenant</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#566280] uppercase tracking-widest">Plan & Traffic</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#566280] uppercase tracking-widest">Expiration</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#566280] uppercase tracking-widest">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tenants.map((t) => (
                <tr 
                  key={t.id}
                  onClick={() => selectTenant(t)}
                  className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[#CCD6F6] font-bold text-sm tracking-tight">{t.tenant.name}</span>
                      <span className="text-[#495670] text-[10px] font-mono">{t.tenant.subdomain}.scmd.pro</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Zap size={12} className="text-blue-400" />
                        <span className="text-[11px] font-black text-[#CCD6F6] uppercase tracking-wider">{t.plan}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8892B0] font-bold">
                        <Users size={12} />
                        <span>{t.activeUsers} / {t.paidUsers} user slots</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {t.expiresAt ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-[#CCD6F6]">
                          <Calendar size={12} className="text-blue-400" />
                          <span className="text-xs font-bold">{new Date(t.expiresAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <span className={`text-[10px] font-black mt-0.5 ${(t.daysLeft ?? 0) < 7 ? 'text-red-400' : 'text-[#495670]'}`}>
                          {(t.daysLeft ?? 0) <= 0 ? 'HẾT HẠN' : `CÒN ${t.daysLeft} NGÀY`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-[#495670] uppercase">Unlimited</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(t)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          selectTenant(t)
                        }}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 text-[#8892B0] hover:text-white transition-all"
                        title="Lịch sử thanh toán"
                      >
                        <Clock size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          selectTenant(t)
                          setActivating(true)
                        }}
                        className="h-9 px-4 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                      >
                        Renew
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <p className="text-[#495670] text-xs font-black uppercase tracking-widest">No matching tenants found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
