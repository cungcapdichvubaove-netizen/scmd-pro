import { CheckCircle, AlertTriangle, XCircle, CreditCard } from 'lucide-react'
import { useBillingStore } from '../../store/billing.store.js'

export function BillingStatCards() {
  const { tenants } = useBillingStore()

  const activePro = tenants.filter(t => t.plan !== 'FREE' && (t.daysLeft ?? 0) > 7).length
  const expiring  = tenants.filter(t => t.plan !== 'FREE' && (t.daysLeft ?? 0) <= 7 && (t.daysLeft ?? 0) > 0).length
  const expired   = tenants.filter(t => (t.plan !== 'FREE' && (t.daysLeft ?? 0) <= 0) || t.plan === 'FREE').length // Expired pro or free
  
  const mrr = tenants.reduce((acc, t) => {
    if (t.plan === 'FREE') return acc
    return acc + (t.paidUsers * 99000)
  }, 0)

  const stats = [
    { label: 'Active PRO', value: activePro, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Expiring soon', value: expiring, icon: AlertTriangle, color: 'text-yellow-400' },
    { label: 'Expired / Free', value: expired, icon: XCircle, color: 'text-red-400' },
    { label: 'Estimated MRR', value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(mrr), icon: CreditCard, color: 'text-blue-400' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <div key={i} className="bg-[#112240] p-5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all group shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#8892B0] text-xs font-semibold uppercase">{s.label}</p>
              <h3 className={`mt-2 text-2xl font-bold text-[#CCD6F6] ${s.label.includes('MRR') ? 'font-mono' : ''}`}>
                {s.value}
              </h3>
            </div>
            <div className={`p-2 rounded-lg bg-[#1E2A3A] ${s.color}`}>
              <s.icon size={18} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
