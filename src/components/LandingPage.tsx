import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, animate } from 'motion/react';
import { 
  Shield, Menu, X, MapPin, CheckCircle2, ArrowRight, 
  Factory, Building2, Warehouse, Home, Check, X as XIcon, ChevronDown,
  Clock, BarChart3, Fingerprint, Mail, Zap, Bell
} from 'lucide-react';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { SCMDLogo } from '@/apps/common/interfaces/components/SCMDLogo';

const Counter = ({ from, to }: { from: number; to: number }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(from, to, {
      duration: 2,
      ease: "easeOut",
      onUpdate(value) {
        node.textContent = Math.round(value).toLocaleString();
      },
    });

    return () => controls.stop();
  }, [from, to]);

  return <span ref={nodeRef} />;
};

export const LandingPage = ({ onLogin, onTrial, onNews }: { onLogin: () => void, onTrial: () => void, onNews: () => void }) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Tôi có thể đổi gói cước không?",
      answer: "Có, bạn có thể nâng cấp hoặc hạ cấp gói cước bất kỳ lúc nào. Chi phí sẽ được tính toán lại dựa trên thời gian sử dụng thực tế của bạn."
    },
    {
      question: "Dữ liệu của tôi được bảo mật như thế nào?",
      answer: "SCMD Pro áp dụng tiêu chuẩn bảo mật cấp doanh nghiệp. Dữ liệu được mã hóa đầu cuối, sao lưu tự động hàng ngày và lưu trữ trên hạ tầng điện toán đám mây bảo mật cao."
    },
    {
      question: "Có giới hạn số lượng thiết bị đăng nhập không?",
      answer: "Với gói PRO và ENTERPRISE, một tài khoản nhân viên chỉ được đăng nhập trên một thiết bị tại một thời điểm để đảm bảo tính định danh và chống gian lận."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0D1324] text-slate-100 font-sans selection:bg-[#2563EB]/30 overflow-x-hidden">
      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0D1324]/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="hover:scale-105 transition-transform cursor-pointer">
            <SCMDLogo variant="dark" size="md" />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10">
            {['features', 'solution', 'pricing'].map((id) => (
              <a 
                key={id}
                href={`#${id}`} 
                className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#2563EB] transition-all relative group"
              >
                {t(`landing.${id}`)}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#2563EB] transition-all group-hover:w-full" />
              </a>
            ))}
            <button 
              onClick={(e) => { e.preventDefault(); onNews(); }}
              className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#2563EB] transition-all"
            >
              {t('landing.guide')}
            </button>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={(e) => { e.preventDefault(); onLogin(); }}
              className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all active:scale-95"
            >
              {t('landing.login')}
            </button>
            <button 
              onClick={onTrial}
              className="px-6 py-3 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-black uppercase tracking-widest rounded-full transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] active:scale-95"
            >
              {t('landing.start_free')}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-slate-400" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <nav className="md:hidden absolute top-full left-0 w-full bg-[#0D1324] border-b border-white/5 p-8 flex flex-col gap-6 shadow-2xl animate-in slide-in-from-top duration-300">
            {['features', 'solution', 'pricing'].map((id) => (
              <a 
                key={id}
                href={`#${id}`} 
                className="text-sm font-black uppercase tracking-[0.2em] text-[#CCD6F6]/40 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t(`landing.${id}`)}
              </a>
            ))}
            <button 
              onClick={(e) => { e.preventDefault(); onNews(); setIsMenuOpen(false); }}
              className="text-sm font-black uppercase tracking-[0.2em] text-[#CCD6F6]/40 hover:text-white text-left transition-colors"
            >
              {t('landing.guide')}
            </button>
            <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
              <button 
                onClick={(e) => { e.preventDefault(); onLogin(); setIsMenuOpen(false); }} 
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-[#CCD6F6]/40 hover:text-white text-center transition-colors border border-white/5 rounded-2xl"
              >
                {t('landing.login')}
              </button>
              <button 
                onClick={onTrial}
                className="w-full py-5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(37,99,235,0.2)]"
              >
                {t('landing.start_free')}
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#2563EB]/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4285F4]/5 rounded-full blur-[100px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex-1 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] text-[10px] font-black uppercase tracking-[0.2em] mb-10 shadow-inner">
                <Shield className="w-3.5 h-3.5" />
                <span>Hệ thống Giám sát An ninh Cấp cao</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-[-0.04em] text-white mb-10 leading-[0.9] lg:leading-[0.85]">
                Dịch vụ bảo vệ của bạn <br />
                <span className="text-[#2563EB] drop-shadow-[0_0_15px_rgba(37,99,235,0.3)]">có thực sự hiệu quả?</span>
              </h1>
              
              <p className="text-lg md:text-xl text-[#CCD6F6]/60 mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Phát hiện sự cố sớm – Giảm thất thoát – Kiểm soát toàn bộ lực lượng bảo vệ theo thời gian thực với nền tảng SCMD Pro.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5">
                <button 
                  onClick={onTrial}
                  className="w-full sm:w-auto px-10 py-5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_20px_40px_rgba(37,99,235,0.25)] text-sm flex items-center justify-center gap-3 group active:scale-95"
                >
                  Bắt đầu dùng thử
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </button>
                <a 
                  href="https://zalo.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest rounded-2xl transition-all border border-white/10 text-sm flex items-center justify-center gap-3 active:scale-95 backdrop-blur-sm"
                >
                  Tư vấn giải pháp
                </a>
              </div>

              <div className="mt-16 flex flex-col sm:flex-row items-center lg:items-start gap-10 pt-10 border-t border-white/5 max-w-xl mx-auto lg:mx-0">
                <div className="flex -space-x-4 shrink-0">
                  {[11, 32, 16, 44, 25].map((imgId, idx) => (
                    <motion.img 
                      key={idx}
                      whileHover={{ y: -5, scale: 1.1, zIndex: 50 }}
                      className="w-12 h-12 rounded-full border-4 border-[#0D1324] object-cover shadow-2xl transition-all cursor-pointer" 
                      src={`https://ui-avatars.com/api/?name=SCMD+${imgId}&background=random&color=fff&bold=true`} 
                      alt="Ảnh đại diện nhân sự" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=Staff+${imgId}&background=2563EB&color=fff`;
                        target.onerror = null; // Prevent infinite loop
                      }}
                    />
                  ))}
                  <div className="w-12 h-12 rounded-full border-4 border-[#0D1324] bg-[#2563EB] flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-[#2563EB]/30 z-10">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                </div>
                
                <div className="flex items-center gap-10">
                  <div className="text-center sm:text-left">
                    <div className="text-3xl md:text-4xl font-black text-white leading-none mb-2 font-mono">
                      +<Counter from={0} to={120} />
                    </div>
                    <div className="text-[10px] font-black text-[#CCD6F6]/40 uppercase tracking-[0.2em] whitespace-nowrap">Khách hàng tin dùng</div>
                  </div>
                  
                  <div className="w-px h-12 bg-white/10" />
                  
                  <div className="text-center sm:text-left">
                    <div className="text-3xl md:text-4xl font-black text-[#2563EB] leading-none mb-2 font-mono">
                      +<Counter from={0} to={850} />
                    </div>
                    <div className="text-[10px] font-black text-[#CCD6F6]/40 uppercase tracking-[0.2em] whitespace-nowrap">Nhân sự giám sát</div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, rotate: 2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="flex-1 w-full max-w-lg lg:max-w-2xl mx-auto relative"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-[#2563EB] rounded-[3rem] blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity" />
                <div className="relative shadow-2xl shadow-black/50 rounded-[3rem] overflow-hidden border-[8px] border-white/5 ring-1 ring-white/10">
                  <BeforeAfterSlider 
                    beforeImage="https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=1200&h=800&fit=crop&q=95"
                    beforeLabel="Thống kê thủ công" 
                    afterImage="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop&q=95"
                    afterLabel="SCMD Pro Real-time"
                  />
                </div>
                
                {/* Floating UI Badges */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-10 -right-6 lg:-right-12 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl p-5 rounded-3xl shadow-3xl hidden sm:flex items-center gap-4 border-l-4 border-l-emerald-500"
                >
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <CheckCircle2 className="text-white w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-white font-black text-sm uppercase tracking-wider">Xác thực 100%</div>
                    <div className="text-emerald-500/70 text-[10px] font-bold uppercase tracking-widest">Anti-Fraud Engine Active</div>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-10 -left-6 lg:-left-12 bg-[#2563EB]/10 border border-[#2563EB]/20 backdrop-blur-xl p-5 rounded-3xl shadow-3xl hidden sm:flex items-center gap-4 border-r-4 border-r-[#2563EB]"
                >
                  <div className="w-12 h-12 bg-[#2563EB] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                    <Zap className="text-white w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-white font-black text-sm uppercase tracking-wider">Real-time Feed</div>
                    <div className="text-[#2563EB]/70 text-[10px] font-bold uppercase tracking-widest">Latency: 100ms</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Bar - Systematic Data Layout */}
      <section className="py-16 bg-[#0D1324] border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center md:text-left md:divide-x md:divide-white/5">
            <div className="space-y-2">
              <div className="text-5xl font-black text-white font-mono tracking-tighter">05<span className="text-[#2563EB] font-sans">+</span></div>
              <div className="text-[10px] font-black text-[#CCD6F6]/40 uppercase tracking-[0.2em]">Vi dịch vụ Phân tán</div>
            </div>
            <div className="md:pl-12 space-y-2">
              <div className="text-5xl font-black text-white font-mono tracking-tighter">100<span className="text-[#4285F4] font-sans">ms</span></div>
              <div className="text-[10px] font-black text-[#CCD6F6]/40 uppercase tracking-[0.2em]">Độ trễ Tối ưu Redis</div>
            </div>
            <div className="md:pl-12 space-y-2">
              <div className="text-5xl font-black text-white font-mono tracking-tighter">100<span className="text-[#2563EB] font-sans">%</span></div>
              <div className="text-[10px] font-black text-[#CCD6F6]/40 uppercase tracking-[0.2em]">Kiến trúc Hướng Tên miền</div>
            </div>
            <div className="md:pl-12 space-y-2">
              <div className="text-5xl font-black text-[#2563EB] font-mono tracking-tighter">Thời<span className="text-white font-sans">Thực</span></div>
              <div className="text-[10px] font-black text-[#CCD6F6]/40 uppercase tracking-[0.2em]">Kết nối Hai chiều</div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Solutions - Modern Grid */}
      <section id="solution" className="py-32 bg-[#0D1324]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
            <div className="max-w-xl">
              <div className="text-[#2563EB] font-black text-[10px] uppercase tracking-[0.3em] mb-4">Giải pháp Linh hoạt</div>
              <h2 className="text-4xl lg:text-6xl font-black text-white leading-[0.9] tracking-tighter transition-all">
                Đáp ứng mọi <br /> 
                <span className="text-[#CCD6F6]/40">Cấu trúc vận hành</span>
              </h2>
            </div>
            <p className="text-[#CCD6F6]/50 text-lg font-medium max-w-xs md:text-right">
              Từ một mục tiêu đơn lẻ đến chuỗi đa điểm phức tạp trên toàn quốc.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Factory, title: 'Nhà máy & KCN', desc: 'Kiểm soát diện rộng, tuần tra theo tuyến phức tạp, giám sát cổng bảo vệ.' },
              { icon: Building2, title: 'Tòa nhà Văn phòng', desc: 'Quản lý nhiều tầng, kiểm tra thiết bị PCCC định kỳ, trực sảnh.' },
              { icon: Warehouse, title: 'Kho bãi & Logistics', desc: 'Bảo vệ tài sản giá trị cao, kiểm soát xuất nhập, chống thất thoát.' },
              { icon: Home, title: 'Khu dân cư / Villa', desc: 'Đảm bảo an ninh 24/7, báo cáo minh bạch cho cư dân và chủ đầu tư.' }
            ].map((item, idx) => (
              <motion.div 
                key={idx} 
                whileHover={{ y: -10 }}
                className="bg-white/[0.02] border border-white/5 p-10 rounded-[2.5rem] hover:bg-white/[0.05] transition-all group"
              >
                <div className="w-16 h-16 bg-[#2563EB]/10 text-[#2563EB] rounded-2xl flex items-center justify-center mb-8 shadow-inner group-hover:scale-110 transition-transform">
                  <item.icon size={32} />
                </div>
                <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase transition-colors group-hover:text-[#2563EB]">{item.title}</h3>
                <p className="text-[#CCD6F6]/40 leading-relaxed font-medium transition-colors group-hover:text-[#CCD6F6]/60">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features (The Anti-Fraud Engine) */}
      <section id="features" className="py-32 bg-[#0D1324] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#2563EB]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <div className="text-[#2563EB] font-black text-[10px] uppercase tracking-[0.3em] mb-4">Vận hành Xuất sắc</div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tighter">Vũ khí của <span className="text-[#2563EB]">Nhà quản trị chủ động</span></h2>
            <p className="text-[#CCD6F6]/40 text-lg leading-relaxed font-medium">
              Hệ thống được thiết kế để bạn luôn nắm quyền kiểm soát, bảo vệ uy tín điều hành trước mọi rủi ro.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { icon: Mail, title: 'Báo cáo 6h sáng', desc: 'Mọi dữ liệu tuần tra đêm qua đã sẵn sàng trên bàn Sếp trước khi bạn thức dậy. Minh bạch, chính xác.', color: '#2563EB' },
              { icon: Bell, title: 'Cảnh báo tức thì', desc: 'Phát hiện ngay lập tức khi nhân viên rời vị trí hoặc bỏ điểm. Xử lý sự cố trước khi Sếp kịp nhận ra.', color: '#F43F5E' },
              { icon: Shield, title: 'Bằng chứng thép', desc: 'Công nghệ xác thực kép GPS & QR động loại bỏ 100% gian lận. Bảo vệ uy tín tuyệt đối.', color: '#10B981' }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 hover:bg-white/[0.05] transition-all group relative"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-inner group-hover:scale-110 transition-transform" style={{ backgroundColor: `${f.color}15` }}>
                  <f.icon className="w-8 h-8" style={{ color: f.color }} />
                </div>
                <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase group-hover:text-[#2563EB] transition-colors">{f.title}</h3>
                <p className="text-[#CCD6F6]/40 leading-relaxed font-medium group-hover:text-[#CCD6F6]/60 transition-colors">
                  {f.desc}
                </p>
                <div className="absolute top-6 right-10 text-[40px] font-black text-white/[0.03] select-none font-mono">0{i+1}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem Section - High Impact Layout */}
      <section className="py-32 bg-[#0D1324] border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <div className="text-[#2563EB] font-black text-[10px] uppercase tracking-[0.3em] mb-4">Hệ sinh thái Toàn diện</div>
            <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6">Hệ sinh thái Quản trị <span className="text-[#2563EB]">An ninh 4.0</span></h2>
            <p className="text-[#CCD6F6]/40 text-lg leading-relaxed font-medium">
              Không chỉ là tuần tra, SCMD Pro mang đến giải pháp toàn diện giúp bạn nâng cấp toàn bộ quy trình vận hành an ninh.
            </p>
          </div>

          {/* Smart Attendance */}
          <div className="flex flex-col lg:flex-row items-center gap-20 mb-48">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="flex-1 w-full relative"
            >
              <div className="relative mx-auto w-full max-w-[340px] bg-[#0D1324] rounded-[3rem] border-[10px] border-white/5 shadow-3xl overflow-hidden ring-1 ring-white/10">
                <div className="aspect-[9/19] bg-[#0D1324] flex flex-col">
                  <div className="h-1/2 bg-blue-900/20 relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2563EB22_0%,_transparent_70%)]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#2563EB]/20 rounded-full animate-ping" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#2563EB]">
                      <MapPin size={40} fill="currentColor" className="drop-shadow-[0_0_10px_#2563EB]" />
                    </div>
                  </div>
                  <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8">
                    <div className="text-center space-y-1">
                      <div className="text-3xl font-black text-white font-mono">08:00 Sáng</div>
                      <div className="text-[10px] font-black text-[#CCD6F6]/40 uppercase tracking-widest">Ca Sáng • Mục tiêu A</div>
                    </div>
                    <button className="w-36 h-36 rounded-full bg-gradient-to-br from-[#2563EB] to-[#4285F4] shadow-[0_20px_40px_rgba(37,99,235,0.4)] flex flex-col items-center justify-center text-white border-8 border-[#0D1324] hover:scale-105 active:scale-95 transition-transform group">
                      <Fingerprint size={48} className="mb-2 group-hover:scale-110 transition-transform" />
                      <span className="font-black uppercase tracking-widest text-[10px]">Điểm danh</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-8 -right-4 lg:-right-12 bg-[#0D1324] border border-white/10 backdrop-blur-2xl p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 border-l-4 border-l-emerald-500">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div className="text-white font-black text-sm uppercase tracking-widest mb-1">Vượt rào gian lận</div>
                  <div className="text-[#CCD6F6]/40 text-[10px] font-black uppercase tracking-widest">Bằng chứng thép GPS</div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 space-y-10"
            >
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] text-[10px] font-black uppercase tracking-widest">
                <Clock className="w-4 h-4" />
                <span>Quản lý Chấm công</span>
              </div>
              <h3 className="text-4xl lg:text-6xl font-black text-white leading-[0.9] tracking-tighter">
                Chấm công <span className="text-[#CCD6F6]/40">minh bạch</span> <br />
                Bảo vệ uy tín điều hành
              </h3>
              <p className="text-lg text-[#CCD6F6]/60 leading-relaxed font-medium">
                Loại bỏ 100% rủi ro gian lận quân số. Bạn luôn có dữ liệu chính xác để giải trình với Hội đồng quản trị, không bao giờ bị động trước các câu hỏi về quân số trực.
              </p>
              <div className="grid gap-6">
                {[
                  'Xác thực GPS động - Chống mọi ứng dụng giả mạo.',
                  'Dữ liệu đồng bộ Thời gian thực - Kiểm soát trong 1 giây.',
                  'Cảnh báo tức thì khi nhân viên rời mục tiêu.'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#2563EB]/20 transition-colors">
                      <Check className="text-[#2563EB] w-5 h-5" />
                    </div>
                    <span className="text-[#CCD6F6] font-bold text-sm uppercase tracking-wide">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Automated Reporting */}
          <div className="flex flex-col-reverse lg:flex-row items-center gap-20">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 space-y-10"
            >
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">
                <BarChart3 className="w-4 h-4" />
                <span>Báo cáo Tự động</span>
              </div>
              <h3 className="text-4xl lg:text-6xl font-black text-white leading-[0.9] tracking-tighter transition-all">
                Báo cáo tự động <br />
                <span className="text-[#CCD6F6]/40">Luôn đi trước một bước</span>
              </h3>
              <p className="text-lg text-[#CCD6F6]/60 leading-relaxed font-medium">
                6h sáng mỗi ngày, báo cáo chi tiết đã nằm trong Email của bạn. Nắm rõ mọi vi phạm và đã có phương án xử lý trước khi Ban giám đốc bắt đầu ngày làm việc.
              </p>
              <div className="grid gap-6">
                {[
                  'Làm nổi bật các lỗi nghiêm trọng cần xử lý ngay.',
                  'Bằng chứng thép bảo vệ bạn trước mọi khiếu nại.',
                  'Xuất văn bản chuyên nghiệp chỉ với 1 lần nhấn.'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                      <Check className="text-red-500 w-5 h-5" />
                    </div>
                    <span className="text-[#CCD6F6] font-bold text-sm uppercase tracking-wide">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              className="flex-1 w-full relative"
            >
              <div className="relative mx-auto w-full max-w-[540px] bg-[#0D1324] rounded-[2.5rem] border border-white/5 shadow-3xl overflow-hidden p-8 ring-1 ring-white/10">
                <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                      <Mail className="text-[#CCD6F6]/40 w-5 h-5" />
                    </div>
                    <span className="text-white font-black uppercase tracking-widest text-xs">Báo cáo An ninh Hàng ngày</span>
                  </div>
                  <div className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-[#CCD6F6]/40 uppercase tracking-widest">06:00 Sáng hôm nay</div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 hover:border-emerald-500/20 transition-all">
                    <div className="text-[#CCD6F6]/20 text-[10px] font-black uppercase tracking-widest mb-3">Tỷ lệ hoàn thành</div>
                    <div className="flex items-end gap-2 mb-3">
                      <span className="text-4xl font-black text-emerald-500 font-mono">98.4</span>
                      <span className="text-emerald-500 text-[10px] font-black mb-2 uppercase">%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[98.4%] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 hover:border-red-500/20 transition-all">
                    <div className="text-[#CCD6F6]/20 text-[10px] font-black uppercase tracking-widest mb-3">Vi phạm</div>
                    <div className="flex items-end gap-2 mb-3">
                      <span className="text-4xl font-black text-red-500 font-mono">02</span>
                      <span className="text-red-500 text-[10px] font-black mb-2 uppercase">Sự cố</span>
                    </div>
                    <div className="flex items-end gap-1.5 h-6">
                      {[30, 45, 20, 100, 15].map((h, i) => (
                        <div key={i} className="flex-1 bg-white/5 rounded-t-sm overflow-hidden relative">
                          <div className={`absolute bottom-0 left-0 w-full transition-all duration-500 ${i === 3 ? 'bg-red-500' : 'bg-white/10'}`} style={{ height: `${h}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-[2.5rem] p-6 border border-white/5">
                  <div className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6">Phân tích Hiệu suất Nhân sự</div>
                  <div className="space-y-5">
                    {[
                      { l: 'Mục tiêu A', v: 95 },
                      { l: 'Mục tiêu B', v: 82 },
                      { l: 'Mục tiêu C', v: 98 }
                    ].map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                          <span className="text-[#CCD6F6]/40">{item.l}</span>
                          <span className="text-white">{item.v}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full p-[2px]">
                          <div className="h-full bg-[#2563EB] rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${item.v}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-[#0D1324] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <div className="text-[#2563EB] font-black text-[10px] uppercase tracking-[0.3em] mb-4">Gói Đầu tư</div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tighter">Bảng giá <span className="text-[#2563EB]">SCMD Pro</span></h2>
            <p className="text-[#CCD6F6]/40 text-lg leading-relaxed font-medium">
              Đầu tư cho sự an tâm với chi phí minh bạch, linh hoạt theo quy mô vận hành của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto items-start">
            {/* LITE */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 flex flex-col hover:bg-white/[0.04] transition-all"
            >
              <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">LITE</h3>
              <p className="text-[#CCD6F6]/40 text-xs font-bold uppercase tracking-widest mb-8">Trải nghiệm cơ bản</p>
              <div className="mb-10">
                <span className="text-5xl font-black text-white font-mono">0<span className="text-xl font-sans ml-1 text-[#2563EB]">đ</span></span>
                <span className="text-[#CCD6F6]/20 font-black uppercase text-[10px] tracking-widest block mt-2">Miễn phí trọn đời</span>
              </div>
              <button 
                onClick={onTrial}
                className="w-full py-5 px-6 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest rounded-2xl transition-all mb-10 text-xs border border-white/5 active:scale-95"
              >
                Bắt đầu ngay
              </button>
              <div className="space-y-6 flex-1">
                <p className="text-[10px] font-black text-[#2563EB] uppercase tracking-[0.2em] mb-6">Tính năng lõi:</p>
                <ul className="space-y-4">
                  {[
                    { text: 'Giới hạn 01 mục tiêu', ok: true },
                    { text: 'Tối đa 03 bảo vệ', ok: true },
                    { text: 'Quét QR tuần tra', ok: true },
                    { text: 'GPS xác thực chuẩn', ok: true },
                    { text: 'Báo cáo 6h sáng', ok: false },
                    { text: 'Anti-Fraud AI', ok: false }
                  ].map((item, i) => (
                    <li key={i} className={`flex items-center gap-4 text-xs font-bold uppercase tracking-wide ${item.ok ? 'text-[#CCD6F6]/70' : 'text-[#CCD6F6]/20'}`}>
                      {item.ok ? <Check size={16} className="text-[#2563EB] shrink-0" /> : <XIcon size={16} className="text-white/10 shrink-0" />}
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* PRO (Featured) */}
            <motion.div 
              initial={{ scale: 1.05 }}
              whileHover={{ y: -10 }}
              className="bg-[#2563EB] rounded-[2.5rem] p-10 flex flex-col relative shadow-[0_40px_80px_rgba(37,99,235,0.25)] ring-4 ring-[#2563EB]/20 z-20"
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-white text-[#2563EB] text-[10px] font-black uppercase tracking-[0.2em] py-2 px-6 rounded-full shadow-xl">
                Phổ biến nhất
              </div>
              <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">PRO (Guardian)</h3>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-8">Bảo vệ uy tín điều hành</p>
              <div className="mb-10 text-white">
                <span className="text-5xl font-black font-mono">99K</span>
                <span className="text-white/60 font-black uppercase text-[10px] tracking-widest block mt-2">/nhân viên/tháng</span>
              </div>
              <button 
                onClick={onTrial}
                className="w-full py-5 px-6 bg-white text-[#2563EB] hover:bg-white/90 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all mb-10 shadow-2xl active:scale-95"
              >
                Nâng cấp uy tín ngay
              </button>
              <div className="space-y-6 flex-1">
                <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6">Đặc quyền Pro:</p>
                <ul className="space-y-4">
                  {[
                    'Không giới hạn mục tiêu',
                    'Bằng chứng thép GPS & QR',
                    'Báo cáo tự động 6h sáng',
                    'Cảnh báo vi phạm Real-time',
                    'Anti-Fraud AI Core',
                    'Hỗ trợ SLA 24/7'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-xs font-bold uppercase tracking-wide text-white">
                      <Check size={16} className="text-white shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* ENTERPRISE */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 flex flex-col hover:bg-white/[0.04] transition-all"
            >
              <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">MAX</h3>
              <p className="text-[#CCD6F6]/40 text-xs font-bold uppercase tracking-widest mb-8">Giải pháp May đo</p>
              <div className="mb-10">
                <span className="text-5xl font-black text-white font-mono">LIÊN HỆ</span>
                <span className="text-[#CCD6F6]/20 font-black uppercase text-[10px] tracking-widest block mt-2">Quy mô lớn / Tập đoàn</span>
              </div>
              <a 
                href="https://zalo.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-5 px-6 bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] font-black uppercase tracking-widest rounded-2xl transition-all mb-10 text-xs border border-[#2563EB]/20 text-center active:scale-95"
              >
                Nhận báo giá
              </a>
              <div className="space-y-6 flex-1">
                <p className="text-[10px] font-black text-[#2563EB] uppercase tracking-[0.2em] mb-6">Đặc quyền Max:</p>
                <ul className="space-y-4">
                  {[
                        'Hệ thống thương hiệu riêng',
                        'Máy chủ riêng biệt',
                        'Tùy chỉnh tính năng riêng',
                        'Tích hợp API hệ thống',
                        'Đào tạo tại chỗ',
                        'Cam kết SLA 99.99%'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-xs font-bold uppercase tracking-wide text-[#CCD6F6]/70">
                      <Check size={16} className="text-[#2563EB] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>

          {/* FAQ */}
          <div className="max-w-4xl mx-auto mt-40">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">Câu hỏi thường gặp</h3>
              <p className="text-[#CCD6F6]/40 font-medium">Mọi điều bạn cần biết về lộ trình số hóa an ninh.</p>
            </div>
            <div className="grid gap-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden group hover:border-[#2563EB]/30 transition-all">
                  <button 
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full px-10 py-7 flex items-center justify-between text-left focus:outline-none"
                  >
                    <span className="font-black text-white uppercase tracking-wider text-sm">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-[#2563EB] transition-transform duration-500 ${openFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  <motion.div 
                    initial={false}
                    animate={{ height: openFaq === idx ? 'auto' : 0, opacity: openFaq === idx ? 1 : 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-10 pb-8 text-[#CCD6F6]/50 leading-relaxed font-medium text-sm border-t border-white/5 pt-6">
                      {faq.answer}
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#080C19] border-t border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-16 mb-20">
            <div className="max-w-xs space-y-8">
              <SCMDLogo variant="dark" size="lg" />
              <p className="text-[#CCD6F6]/30 text-sm font-medium leading-relaxed">
                Nền tảng quản trị an ninh thông minh (SCMD) giúp số hóa quy trình, tối ưu nguồn lực và nâng cao uy tín cho doanh nghiệp bảo vệ.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-16">
              <div className="space-y-6">
                <div className="text-white font-black uppercase tracking-[0.2em] text-[10px]">Sản phẩm</div>
                <nav className="flex flex-col gap-4 text-sm text-[#CCD6F6]/40 font-bold uppercase tracking-widest">
                  <a href="#features" className="hover:text-[#2563EB] transition-colors">Tính năng</a>
                  <a href="#solution" className="hover:text-[#2563EB] transition-colors">Giải pháp</a>
                  <a href="#pricing" className="hover:text-[#2563EB] transition-colors">Bảng giá</a>
                </nav>
              </div>
              <div className="space-y-6">
                <div className="text-white font-black uppercase tracking-[0.2em] text-[10px]">Công ty</div>
                <nav className="flex flex-col gap-4 text-sm text-[#CCD6F6]/40 font-bold uppercase tracking-widest">
                  <a href="#" className="hover:text-[#2563EB] transition-colors">Về chúng tôi</a>
                  <a href="#" className="hover:text-[#2563EB] transition-colors">Liên hệ</a>
                  <a href="#" className="hover:text-[#2563EB] transition-colors">Tuyển dụng</a>
                </nav>
              </div>
              <div className="space-y-6">
                <div className="text-white font-black uppercase tracking-[0.2em] text-[10px]">Pháp lý</div>
                <nav className="flex flex-col gap-4 text-sm text-[#CCD6F6]/40 font-bold uppercase tracking-widest">
                  <a href="#" className="hover:text-[#2563EB] transition-colors">Bảo mật</a>
                  <a href="#" className="hover:text-[#2563EB] transition-colors">Điều khoản</a>
                  <a href="#" className="hover:text-[#2563EB] transition-colors">Quy định</a>
                </nav>
              </div>
            </div>
          </div>
          
          <div className="pt-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="text-[10px] font-black text-[#CCD6F6]/20 uppercase tracking-[0.2em]">
              &copy; {new Date().getFullYear()} SCMD Pro - Bản kỹ thuật v2.5.x. Mọi cảm biến đang hoạt động.
            </div>
            
            <div className="flex items-center gap-6">
              <div className="w-8 h-8 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-[#CCD6F6]/20 hover:text-[#2563EB] hover:border-[#2563EB]/20 transition-all cursor-pointer">
                <Zap size={16} />
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-[#CCD6F6]/20 hover:text-[#2563EB] hover:border-[#2563EB]/20 transition-all cursor-pointer">
                <Shield size={16} />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
