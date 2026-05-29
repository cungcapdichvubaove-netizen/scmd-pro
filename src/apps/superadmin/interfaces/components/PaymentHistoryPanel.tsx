import { useState, useEffect } from 'react'
import { X, CreditCard, History, Calendar, Clock } from 'lucide-react'
import { useBillingStore } from '../../store/billing.store.js'
import { apiFetch } from '../../../../lib/api.js'
import { motion } from 'motion/react'

export function PaymentHistoryPanel() {
  const { selectedTenant, selectTenant } = useBillingStore()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedTenant) {
      fetchHistory()
    }
  }, [selectedTenant])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/v1/sys-manage/billing/${selectedTenant!.tenantId}`)
      setHistory(res.payments || [])
    } finally {
      setLoading(false)
    }
  }

  if (!selectedTenant) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="h-full w-full max-w-xl bg-[#0D1324] border-l border-white/10 shadow-2xl flex flex-col"
      >
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
              <History size={24} />
            </div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tighter uppercase">Sổ nhật ký kiểm toán</h2>
              <p className="text-[#8892B0] text-xs font-bold uppercase tracking-widest">Lịch sử thanh toán & Kích hoạt</p>
            </div>
          </div>
          <button onClick={() => selectTenant(null)} className="text-[#8892B0] hover:text-white p-2 hover:bg-white/5 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto space-y-6 no-scrollbar">
          <div className="p-6 bg-[#112240] rounded-3xl border border-white/10">
            <p className="text-[#8892B0] text-[10px] font-black uppercase tracking-widest mb-4">Tenant Identity</p>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">{selectedTenant.tenant.name}</h3>
                <p className="text-blue-400 font-mono text-sm mt-1">{selectedTenant.tenant.subdomain}.scmd.pro</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-black uppercase tracking-widest">
                  {selectedTenant.plan}
                </span>
                <p className="text-[#495670] text-[10px] font-bold mt-2 uppercase tracking-widest">
                  Capacity: {selectedTenant.paidUsers} Users
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#566280] uppercase tracking-[0.2em] px-2 flex items-center gap-2">
              <CreditCard size={14} /> Transaction Timeline
            </h4>
            
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[#495670] text-[10px] font-black uppercase tracking-widest">Neural Link Syncing...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="py-20 text-center bg-[#112240] rounded-3xl border border-white/5 border-dashed">
                <p className="text-[#495670] text-xs font-bold uppercase tracking-widest">No transactions detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((p, idx) => (
                  <motion.div 
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-[#112240] p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                       <CreditCard size={40} />
                    </div>
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-black font-mono uppercase tracking-tighter">{p.paymentRef}</p>
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[9px] font-black uppercase rounded border border-green-500/20">
                            Verified
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[10px] text-[#8892B0] font-bold uppercase">
                            <Calendar size={12} />
                            {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#8892B0] font-bold uppercase">
                            <Clock size={12} />
                            {p.months} Months
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-white font-mono tracking-tighter">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(p.amountVnd))}
                        </p>
                        <p className="text-[10px] text-[#495670] font-black uppercase tracking-widest mt-0.5">
                          {p.paidUsers} User Slots
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-white/[0.01]">
          <button 
            onClick={() => selectTenant(null)}
            className="w-full h-14 rounded-2xl border border-white/10 text-[#8892B0] hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
          >
            Close Ledger View
          </button>
        </div>
      </motion.div>
    </div>
  )
}
