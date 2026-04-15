import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, ArrowRight, CheckCircle2, Globe, Building2, Mail, 
  Lock, Zap, Loader2, Sparkles, ShieldCheck, Cpu
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface TrialRegistrationProps {
  onBack: () => void;
  onSuccess: (subdomain: string) => void;
}

export const TrialRegistration: React.FC<TrialRegistrationProps> = ({ onBack, onSuccess }) => {
  React.useEffect(() => {
    console.log('TrialRegistration component mounted');
  }, []);

  const [step, setStep] = useState<'form' | 'provisioning' | 'success'>('form');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    companyName: '',
    subdomain: ''
  });
  const [provisioningStep, setProvisioningStep] = useState(0);

  const provisioningSteps = [
    { icon: Globe, text: "Khởi tạo hạ tầng Cloud..." },
    { icon: ShieldCheck, text: "Thiết lập tường lửa & Bảo mật..." },
    { icon: Cpu, text: "Cấu hình AI Anomaly Engine..." },
    { icon: Sparkles, text: "Tối ưu hóa cơ sở dữ liệu..." },
    { icon: CheckCircle2, text: "Hoàn tất không gian làm việc!" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('provisioning');
    
    // Simulate provisioning process
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < provisioningSteps.length - 1) {
        currentStep++;
        setProvisioningStep(currentStep);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setStep('success');
        }, 1000);
      }
    }, 1500);
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setFormData({ ...formData, subdomain: val });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row overflow-hidden font-sans">
      {/* Left Side: Brand & Value Prop (Recipe 11: SaaS Landing / Split Layout) */}
      <div className="lg:w-1/2 bg-slate-900 relative p-8 lg:p-20 flex flex-col justify-between border-r border-slate-800">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,_var(--tw-gradient-stops))] from-blue-600 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-12 group"
          >
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">Quay lại</span>
          </button>

          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Shield className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">SCMD <span className="text-blue-500">Pro</span></h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Think Zero Philosophy</p>
            </div>
          </div>

          <h2 className="text-4xl lg:text-6xl font-black text-white leading-[1.1] mb-8 tracking-tighter">
            Trải nghiệm <br />
            <span className="text-blue-500">Sự An Tâm Tuyệt Đối</span> <br />
            Trong 14 Ngày.
          </h2>

          <div className="space-y-6">
            {[
              { icon: Zap, title: "Zero Friction", desc: "Khởi tạo không gian làm việc chỉ trong 60 giây." },
              { icon: Lock, title: "Zero Risk", desc: "Không cần thẻ tín dụng. Không cam kết ẩn." },
              { icon: ShieldCheck, title: "Zero Doubt", desc: "Minh bạch hóa 100% hoạt động an ninh của bạn." }
            ].map((item, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                  <item.icon className="text-blue-400 w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{item.title}</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Được tin dùng bởi 500+ doanh nghiệp hàng đầu</p>
        </div>
      </div>

      {/* Right Side: Registration Form */}
      <div className="lg:w-1/2 p-8 lg:p-20 flex items-center justify-center relative">
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-md"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-black text-white mb-2">Đăng ký dùng thử</h3>
                <p className="text-slate-400 text-sm">Bắt đầu hành trình bảo vệ danh tiếng của bạn ngay hôm nay.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Họ và tên</label>
                  <div className="relative">
                    <input 
                      required
                      type="text"
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email công việc</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                    <input 
                      required
                      type="email"
                      placeholder="name@company.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tên doanh nghiệp</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                    <input 
                      required
                      type="text"
                      placeholder="SCMD Security Solution"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Đường dẫn Workspace</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input 
                        required
                        type="text"
                        placeholder="your-company"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors text-right"
                        value={formData.subdomain}
                        onChange={handleSubdomainChange}
                      />
                    </div>
                    <span className="text-slate-500 font-bold text-sm">.scmd.vn</span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">Đây sẽ là địa chỉ truy cập riêng của đơn vị bạn.</p>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-600/20 mt-4 flex items-center justify-center gap-2 group active:scale-95"
                >
                  Khởi tạo Workspace
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <p className="text-center text-[10px] text-slate-500 mt-8">
                Bằng cách đăng ký, bạn đồng ý với <a href="#" className="underline">Điều khoản dịch vụ</a> và <a href="#" className="underline">Chính sách bảo mật</a> của chúng tôi.
              </p>
            </motion.div>
          )}

          {step === 'provisioning' && (
            <motion.div 
              key="provisioning"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="w-full max-w-md text-center"
            >
              <div className="relative w-32 h-32 mx-auto mb-12">
                <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                <motion.div 
                  className="absolute inset-0 border-4 border-t-blue-500 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Cpu className="text-blue-500 w-10 h-10 animate-pulse" />
                </div>
              </div>

              <h3 className="text-2xl font-black text-white mb-8 tracking-tight">Đang thiết lập không gian an toàn cho bạn...</h3>
              
              <div className="space-y-4 text-left max-w-xs mx-auto">
                {provisioningSteps.map((s, i) => (
                  <div key={i} className={cn(
                    "flex items-center gap-3 transition-all duration-500",
                    i < provisioningStep ? "text-emerald-500 opacity-100" : 
                    i === provisioningStep ? "text-blue-400 opacity-100" : "text-slate-700 opacity-50"
                  )}>
                    {i < provisioningStep ? <CheckCircle2 size={18} /> : 
                     i === provisioningStep ? <Loader2 size={18} className="animate-spin" /> : <div className="w-[18px]" />}
                    <span className="text-xs font-bold uppercase tracking-wider">{s.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md text-center"
            >
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
                <CheckCircle2 className="text-emerald-500 w-12 h-12" />
              </div>

              <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Sẵn sàng bảo vệ!</h3>
              <p className="text-slate-400 mb-12 leading-relaxed">
                Workspace <span className="text-white font-bold">{formData.subdomain}.scmd.vn</span> đã được kích hoạt thành công.
                Thông tin đăng nhập đã được gửi tới email của bạn.
              </p>

              <button 
                onClick={() => onSuccess(formData.subdomain)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 group active:scale-95"
              >
                Truy cập Workspace ngay
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
