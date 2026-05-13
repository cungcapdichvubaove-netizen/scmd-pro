import { useState, useEffect } from 'react'
import { X, Zap, Calendar, Users, CreditCard } from 'lucide-react'
import { useBillingStore } from './billing.store.js'
import { apiFetch } from '../../../lib/api.js'
import toast from 'react-hot-toast'

export function ActivatePanel() {
  const { selectedTenant, setActivating } = useBillingStore()
  
  const [formData, setFormData] = useState({
    tenantId:   selectedTenant?.tenantId || '',
    plan:       (selectedTenant?.plan === 'FREE' ? 'PRO' : selectedTenant?.plan) || 'PRO',
    months:     12,
    paidUsers:  selectedTenant?.paidUsers || 10,
    paymentRef: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (selectedTenant) {
      setFormData(prev => ({
        ...prev,
        tenantId:  selectedTenant.tenantId,
        paidUsers: selectedTenant.paidUsers || 10,
        plan:      (selectedTenant.plan === 'FREE' ? 'PRO' : selectedTenant.plan) || 'PRO',
      }))
    }
  }, [selectedTenant])

  const PRICE_PER_USER_MONTH = 99000
  const totalAmount = formData.paidUsers * PRICE_PER_USER_MONTH * formData.months

  const handleActivate = async () => {
    if (!formData.tenantId) {
      toast.error('Vui lòng chọn Tenant');
      return;
    }
    if (!formData.paymentRef) {
      toast.error('Vui lòng nhập mã giao dịch');
      return;
    }

    setIsSubmitting(true)
    try {
      await apiFetch('/api/v1/sys-manage/billing/activate', {
        method: 'POST',
        body: JSON.stringify(formData),
      })
      toast.success('Kích hoạt gói thành công!')
      setActivating(false)
      // Logic refresh: Immediate reload to avoid UX debt static delay
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi kích hoạt thuê bao')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0D1324] w-full max-w-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden motion-safe:animate-in motion-safe:zoom-in duration-300">
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-white font-black flex items-center gap-2 text-xl tracking-tighter uppercase">
              <Zap className="text-blue-500" size={24} fill="currentColor" />
              Upgrade System
            </h2>
            <p className="text-[#8892B0] text-xs font-bold mt-1 uppercase tracking-widest">Kích hoạt / Gia hạn thuê bao PRO</p>
          </div>
          <button onClick={() => setActivating(false)} className="text-[#8892B0] hover:text-white p-2 hover:bg-white/5 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {selectedTenant && (
            <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-[10px] uppercase font-black tracking-widest">Active Target</p>
                <p className="text-white font-bold text-lg">{selectedTenant.tenant.name}</p>
                <p className="text-[#8892B0] font-mono text-xs mt-0.5">{selectedTenant.tenant.subdomain}.scmd.pro</p>
              </div>
              <div className="text-right">
                <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10 inline-block">
                  <p className="text-[#CCD6F6] text-[10px] font-black uppercase tracking-widest">{selectedTenant.plan}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#566280] uppercase tracking-widest flex items-center gap-2">
                <Zap size={14} className="text-blue-400" /> Plan Type
              </label>
              <select 
                className="w-full bg-[#112240] border border-white/10 rounded-2xl py-4 px-5 text-[#CCD6F6] font-bold outline-none focus:border-blue-500/50 transition-all appearance-none"
                value={formData.plan}
                onChange={(e) => setFormData({...formData, plan: e.target.value as any})}
              >
                <option value="PRO">SCMD PRO</option>
                <option value="PRO_MAX">SCMD PRO MAX</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#566280] uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} className="text-blue-400" /> Duration (Months)
              </label>
              <input 
                type="number"
                min={1}
                className="w-full bg-[#112240] border border-white/10 rounded-2xl py-4 px-5 text-[#CCD6F6] font-bold outline-none focus:border-blue-500/50 transition-all font-mono"
                value={formData.months}
                onChange={(e) => setFormData({...formData, months: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#566280] uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-blue-400" /> User Capacity
              </label>
              <input 
                type="number"
                min={1}
                className="w-full bg-[#112240] border border-white/10 rounded-2xl py-4 px-5 text-[#CCD6F6] font-bold outline-none focus:border-blue-500/50 transition-all font-mono"
                value={formData.paidUsers}
                onChange={(e) => setFormData({...formData, paidUsers: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#566280] uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={14} className="text-blue-400" /> Payment Ref
              </label>
              <input 
                type="text"
                placeholder="TRX-XXXXXX"
                className="w-full bg-[#112240] border border-white/10 rounded-2xl py-4 px-5 text-[#CCD6F6] font-bold outline-none focus:border-blue-500/50 transition-all uppercase font-mono placeholder:text-[#495670]"
                value={formData.paymentRef}
                onChange={(e) => setFormData({...formData, paymentRef: e.target.value.toUpperCase()})}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[#8892B0] text-sm font-bold uppercase tracking-widest">Total Investment</span>
              <span className="text-3xl font-black text-blue-400 font-mono tracking-tighter">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}
              </span>
            </div>
            <button 
              disabled={isSubmitting}
              onClick={handleActivate}
              className="group relative w-full h-16 rounded-2xl bg-[#2563EB] hover:bg-blue-600 text-white font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Zap size={20} fill="currentColor" className="group-hover:scale-125 transition-transform" />
                  AUTHENTICATE & ACTIVATE
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
