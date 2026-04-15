import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Menu, X, MapPin, Cpu, FileText, CheckCircle2, ArrowRight, 
  Factory, Building2, Warehouse, Home, Check, X as XIcon, HelpCircle, ChevronDown,
  Clock, BarChart3, Fingerprint, Mail, AlertTriangle, Zap, Bell, TrendingUp
} from 'lucide-react';

export const LandingPage = ({ onLogin, onTrial, onNews }: { onLogin: () => void, onTrial: () => void, onNews: () => void }) => {
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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white leading-none">
                SCMD <span className="text-blue-500">Pro</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">The Guardian</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Tính năng</a>
            <a href="#solution" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Giải pháp</a>
            <a href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Bảng giá</a>
            <button 
              onClick={(e) => { e.preventDefault(); onNews(); }}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Tin tức
            </button>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={(e) => { e.preventDefault(); onLogin(); }}
              className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
            >
              Đăng nhập
            </button>
            <button 
              onClick={() => {
                console.log('LandingPage: Trial button clicked');
                onTrial();
              }}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-600/20"
            >
              Dùng thử miễn phí
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-slate-400" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <nav className="md:hidden absolute top-full left-0 w-full bg-slate-900 border-b border-slate-800 p-4 flex flex-col gap-4 shadow-xl">
            <a href="#features" className="text-lg font-medium py-2 text-slate-300" onClick={() => setIsMenuOpen(false)}>Tính năng</a>
            <a href="#solution" className="text-lg font-medium py-2 text-slate-300" onClick={() => setIsMenuOpen(false)}>Giải pháp</a>
            <a href="#pricing" className="text-lg font-medium py-2 text-slate-300" onClick={() => setIsMenuOpen(false)}>Bảng giá</a>
            <button 
              onClick={(e) => { e.preventDefault(); onNews(); setIsMenuOpen(false); }}
              className="text-lg font-medium py-2 text-slate-300 text-left"
            >
              Tin tức
            </button>
            <hr className="border-slate-800" />
            <button 
              onClick={(e) => { e.preventDefault(); onLogin(); setIsMenuOpen(false); }} 
              className="w-full py-3 text-center font-bold text-slate-300"
            >
              Đăng nhập
            </button>
            <button 
              onClick={onTrial}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
            >
              Dùng thử miễn phí
            </button>
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-slate-900 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider mb-6">
                <Shield className="w-3.5 h-3.5" />
                <span>Giải pháp bảo vệ danh tiếng nhà quản lý</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-[1.1]">
                Loại bỏ khiển trách. <br className="hidden lg:block" />
                Bảo vệ uy tín bằng <span className="text-blue-500">Bằng chứng thép.</span>
              </h1>
              <p className="text-base md:text-lg text-slate-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Đừng để sự cố bất ngờ làm ảnh hưởng đến sự nghiệp của bạn. SCMD Pro cung cấp dữ liệu minh bạch tuyệt đối, giúp bạn chủ động đi trước Sếp một bước.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button 
                  onClick={() => {
                    console.log('LandingPage Hero: Trial button clicked');
                    onTrial();
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-600/20 text-base flex items-center justify-center gap-2 group active:scale-95"
                >
                  Trải nghiệm ngay
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 w-full max-w-sm lg:max-w-md mx-auto relative">
              {/* Violation Alert Card - Floating & Blinking */}
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -top-10 -left-10 z-20 w-64"
              >
                <div className="bg-slate-900/90 backdrop-blur-xl border border-red-500/50 p-4 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.3)] relative overflow-hidden">
                  <motion.div 
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-red-500"
                  />
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                      <AlertTriangle className="text-red-500 w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <div className="text-red-500 font-black text-xs uppercase tracking-wider">Cảnh báo vi phạm!</div>
                      <div className="text-white font-bold text-sm">Rời vị trí trực</div>
                      <div className="text-slate-400 text-[10px]">Cổng số 4 • 02:15 AM</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="relative rounded-[2.5rem] overflow-hidden border-[8px] border-slate-800 shadow-2xl shadow-blue-900/40 bg-slate-950 aspect-[9/19]">
                <img 
                  src="https://picsum.photos/seed/securitymap/600/1200" 
                  alt="SCMD Pro Mobile App" 
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                {/* Mock UI Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-slate-950 to-slate-950/0">
                  <div className="bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-2xl shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-bold text-white">Hệ thống đang bảo vệ</span>
                    </div>
                    <div className="text-xs text-slate-400">Trạng thái: 100% Minh bạch</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-10 bg-slate-950 border-y border-slate-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="py-4 md:py-0">
              <div className="text-4xl md:text-5xl font-black text-white mb-2">500+</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Mục tiêu bảo vệ</div>
            </div>
            <div className="py-4 md:py-0">
              <div className="text-4xl md:text-5xl font-black text-white mb-2">10.000+</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Lượt tuần tra mỗi ngày</div>
            </div>
            <div className="py-4 md:py-0">
              <div className="text-4xl md:text-5xl font-black text-white mb-2 text-blue-500">99.9%</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Bảo vệ danh tiếng tuyệt đối</div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Solutions */}
      <section id="solution" className="py-20 bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Giải pháp cho mọi quy mô</h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Bạn sẽ nhận được sự an tâm tuyệt đối dù quản lý một mục tiêu hay chuỗi đa điểm phức tạp.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Factory, title: 'Nhà máy & KCN', desc: 'Kiểm soát diện rộng, tuần tra theo tuyến phức tạp.' },
              { icon: Building2, title: 'Tòa nhà Văn phòng', desc: 'Quản lý nhiều tầng, kiểm tra thiết bị PCCC.' },
              { icon: Warehouse, title: 'Kho bãi & Logistics', desc: 'Bảo vệ tài sản giá trị cao, chống thất thoát.' },
              { icon: Home, title: 'Khu dân cư', desc: 'Đảm bảo an ninh 24/7, báo cáo minh bạch cho cư dân.' }
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl hover:bg-slate-800 transition-colors">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mb-4">
                  <item.icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features (The Anti-Fraud Engine) */}
      <section id="features" className="py-20 bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Vũ khí của Nhà quản lý chủ động</h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Hệ thống được thiết kế để bạn luôn nắm quyền kiểm soát, đi trước mọi yêu cầu của cấp trên.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-blue-500/50 transition-colors group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                <Mail className="text-blue-500 w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Báo cáo tự động 6h sáng</h3>
              <p className="text-slate-400 leading-relaxed">
                Mọi dữ liệu tuần tra đêm qua đã sẵn sàng trên bàn Sếp trước khi bạn thức dậy. Minh bạch, chính xác, không thể chối cãi.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-red-500/50 transition-colors group">
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-500/20 transition-colors">
                <Bell className="text-red-500 w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Cảnh báo vi phạm tức thì</h3>
              <p className="text-slate-400 leading-relaxed">
                Phát hiện ngay lập tức khi nhân viên rời vị trí hoặc bỏ điểm. Giúp bạn xử lý sự cố trước khi Sếp kịp nhận ra.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-emerald-500/50 transition-colors group">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                <Shield className="text-emerald-500 w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Bằng chứng thép (GPS & QR)</h3>
              <p className="text-slate-400 leading-relaxed">
                Công nghệ xác thực kép loại bỏ 100% gian lận. Bạn có bằng chứng thép để bảo vệ uy tín trước mọi sự khiển trách.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Section (Chấm công & Báo cáo) */}
      <section className="py-20 bg-slate-900 border-t border-slate-800 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Hệ sinh thái Quản trị An ninh</h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Không chỉ là tuần tra, SCMD Pro mang đến giải pháp toàn diện giúp bạn kiểm soát mọi hoạt động an ninh một cách dễ dàng.
            </p>
          </div>

          {/* Smart Attendance - Z-Pattern 1 (Image Left, Text Right) */}
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 mb-32">
            <div className="flex-1 w-full relative">
              {/* Mock Mobile UI for Attendance */}
              <div className="relative mx-auto w-full max-w-[320px] aspect-[9/19] bg-slate-950 rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl shadow-blue-900/20 overflow-hidden">
                <div className="absolute inset-0 bg-slate-900 flex flex-col">
                  <div className="h-1/2 bg-slate-800 relative">
                    {/* Fake Map */}
                    <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 to-transparent" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-blue-500/20 rounded-full animate-ping" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500">
                      <MapPin size={32} fill="currentColor" />
                    </div>
                  </div>
                  <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6 bg-slate-900">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">08:00 AM</div>
                      <div className="text-sm text-slate-400">Ca Sáng • Mục tiêu A</div>
                    </div>
                    <button className="w-32 h-32 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 shadow-[0_0_30px_rgba(59,130,246,0.5)] flex flex-col items-center justify-center text-white border-4 border-slate-900 ring-4 ring-blue-500/30">
                      <Fingerprint size={40} className="mb-2" />
                      <span className="font-bold uppercase tracking-wider text-sm">Check-in</span>
                    </button>
                  </div>
                </div>
              </div>
              {/* Badge */}
              <div className="absolute top-10 -right-4 lg:-right-10 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md p-4 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                </div>
                <div>
                  <div className="text-emerald-500 font-bold text-sm">Chính xác 100%</div>
                  <div className="text-slate-400 text-xs">Xác thực GPS & QR</div>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                <Clock className="w-4 h-4" />
                <span>Kiểm soát nhân sự tuyệt đối</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Chấm công minh bạch <br />
                <span className="text-slate-400">Bảo vệ uy tín điều hành</span>
              </h3>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Loại bỏ hoàn toàn rủi ro nhân viên bỏ trực hoặc chấm công hộ. Bạn luôn có dữ liệu chính xác để giải trình với cấp trên về hiệu suất nhân sự, không bao giờ bị động trước các câu hỏi về quân số.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-blue-400" />
                  </div>
                  <span className="text-slate-300">Xác thực GPS & QR động - Chống mọi phần mềm gian lận.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-blue-400" />
                  </div>
                  <span className="text-slate-300">Dữ liệu đồng bộ Real-time - Nắm bắt quân số trong 1 giây.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-blue-400" />
                  </div>
                  <span className="text-slate-300">Tự động cảnh báo khi nhân viên rời khỏi mục tiêu trực.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Automated Reporting - Z-Pattern 2 (Text Left, Image Right) */}
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider mb-6">
                <BarChart3 className="w-4 h-4" />
                <span>Báo cáo cứu sinh</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Báo cáo tự động 6h sáng <br />
                <span className="text-slate-400">Luôn đi trước Sếp một bước</span>
              </h3>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Đừng đợi đến khi bị hỏi mới đi tìm dữ liệu. 6h sáng mỗi ngày, báo cáo chi tiết đã nằm trong Email của bạn. Bạn nắm rõ mọi vi phạm và đã có phương án xử lý trước khi Sếp bắt đầu ngày làm việc.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-orange-400" />
                  </div>
                  <span className="text-slate-300">Highlight các điểm nóng cần xử lý ngay lập tức.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-orange-400" />
                  </div>
                  <span className="text-slate-300">Bằng chứng thép bảo vệ bạn trước mọi sự khiển trách.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-orange-400" />
                  </div>
                  <span className="text-slate-300">Xuất file PDF chuyên nghiệp, gửi ngay cho Ban giám đốc.</span>
                </li>
              </ul>
            </div>

            <div className="flex-1 w-full relative">
              {/* Mock Dashboard UI for Reporting */}
              <div className="relative mx-auto w-full max-w-[500px] aspect-[4/3] bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl shadow-blue-900/20 overflow-hidden p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Mail className="text-slate-400 w-5 h-5" />
                    <span className="text-white font-bold">Báo cáo An ninh Ngày</span>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">Hôm nay, 06:00</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-xs mb-2">Tỷ lệ hoàn thành</div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-emerald-500">98%</span>
                      <span className="text-emerald-500 text-xs mb-1">↑ 2%</span>
                    </div>
                    {/* Fake progress bar */}
                    <div className="w-full h-1.5 bg-slate-700 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[98%]" />
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-xs mb-2">Sự cố / Vi phạm</div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-orange-500">02</span>
                      <span className="text-slate-500 text-xs mb-1">vụ</span>
                    </div>
                    {/* Fake mini chart */}
                    <div className="flex items-end gap-1 h-6 mt-2">
                      <div className="w-1/5 bg-slate-700 h-1/3 rounded-t-sm" />
                      <div className="w-1/5 bg-slate-700 h-2/3 rounded-t-sm" />
                      <div className="w-1/5 bg-slate-700 h-1/2 rounded-t-sm" />
                      <div className="w-1/5 bg-orange-500 h-full rounded-t-sm" />
                      <div className="w-1/5 bg-slate-700 h-1/4 rounded-t-sm" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/30 p-4">
                  <div className="text-sm font-bold text-slate-300 mb-3">Hiệu suất nhân sự</div>
                  <div className="space-y-3">
                    {[85, 92, 78].map((val, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-700 shrink-0" />
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${val}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{val}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Badge */}
              <div className="absolute -bottom-6 -left-4 lg:-left-10 bg-blue-500/10 border border-blue-500/20 backdrop-blur-md p-4 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Clock className="text-blue-400 w-6 h-6" />
                </div>
                <div>
                  <div className="text-blue-400 font-bold text-sm">Tiết kiệm 2h</div>
                  <div className="text-slate-400 text-xs">Quản lý mỗi ngày</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Bảng giá SCMD Pro</h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Đầu tư cho sự an tâm với chi phí minh bạch, linh hoạt theo quy mô của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* LITE */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">LITE</h3>
              <p className="text-slate-400 text-sm mb-6">Dành cho mục tiêu nhỏ, trải nghiệm cơ bản.</p>
              <div className="mb-8">
                <span className="text-4xl font-black text-white">0đ</span>
                <span className="text-slate-500 font-medium">/tháng</span>
              </div>
              <button 
                onClick={() => {
                  console.log('LandingPage Pricing LITE: Trial button clicked');
                  onTrial();
                }}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors mb-8"
              >
                Bắt đầu miễn phí
              </button>
              <div className="space-y-4 flex-1">
                <p className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Bao gồm:</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> Giới hạn 01 mục tiêu</li>
                  <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> Tối đa 03 bảo vệ</li>
                  <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> Quét QR tuần tra</li>
                  <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> GPS chuẩn</li>
                  <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> Chấm công cơ bản</li>
                  <li className="flex items-start gap-3 text-sm text-slate-500"><XIcon size={18} className="text-slate-600 shrink-0" /> Báo cáo sáng tự động</li>
                  <li className="flex items-start gap-3 text-sm text-slate-500"><XIcon size={18} className="text-slate-600 shrink-0" /> Anti-Fraud AI</li>
                </ul>
              </div>
            </div>

            {/* PRO (Featured) */}
            <div className="bg-slate-900 border-2 border-blue-500 rounded-3xl p-8 flex flex-col relative shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-black uppercase tracking-widest py-1.5 px-4 rounded-full">
                Phổ biến nhất
              </div>
              <h3 className="text-xl font-bold text-white mb-2">PRO (The Guardian)</h3>
              <p className="text-blue-200 text-sm mb-6">Bảo vệ danh tiếng, loại bỏ mọi rủi ro khiển trách.</p>
              <div className="mb-8">
                <span className="text-4xl font-black text-white">99.000đ</span>
                <span className="text-slate-400 font-medium">/user/tháng</span>
              </div>
              <button 
                onClick={() => {
                  console.log('LandingPage Pricing PRO: Trial button clicked');
                  onTrial();
                }}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors mb-8 shadow-lg shadow-blue-600/20"
              >
                Nâng cấp uy tín ngay
              </button>
              <div className="space-y-4 flex-1">
                <p className="text-sm font-bold text-white uppercase tracking-wider mb-4">Tính năng đặc quyền:</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-slate-200"><Check size={18} className="text-emerald-400 shrink-0" /> Không giới hạn mục tiêu</li>
                  <li className="flex items-start gap-3 text-sm text-slate-200"><Check size={18} className="text-emerald-400 shrink-0" /> Bằng chứng thép (GPS & QR động)</li>
                  <li className="flex items-start gap-3 text-sm text-slate-200"><Check size={18} className="text-emerald-400 shrink-0" /> Báo cáo tự động 6h sáng</li>
                  <li className="flex items-start gap-3 text-sm text-slate-200"><Check size={18} className="text-emerald-400 shrink-0" /> Cảnh báo vi phạm Real-time</li>
                  <li className="flex items-start gap-3 text-sm text-slate-200"><Check size={18} className="text-emerald-400 shrink-0" /> Anti-Fraud AI (Chống gian lận)</li>
                </ul>
              </div>
            </div>

            {/* ENTERPRISE */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">ENTERPRISE</h3>
              <p className="text-slate-400 text-sm mb-6">Giải pháp may đo cho chuỗi quy mô lớn.</p>
              <div className="mb-8">
                <span className="text-4xl font-black text-white">Liên hệ</span>
              </div>
              <button className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors mb-8">
                Nhận báo giá
              </button>
              <div className="space-y-4 flex-1">
                <p className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Bao gồm gói PRO và:</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> Quản lý chuỗi đa điểm</li>
                  <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> Tùy chỉnh báo cáo riêng</li>
                  <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> Hỗ trợ kỹ thuật 24/7</li>
                  <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> Backup dữ liệu riêng biệt</li>
                  <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={18} className="text-emerald-500 shrink-0" /> Tích hợp API hệ thống nội bộ</li>
                </ul>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto mt-32">
            <div className="text-center mb-12">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Câu hỏi thường gặp</h3>
              <p className="text-slate-400">Mọi thắc mắc của bạn về việc triển khai SCMD Pro.</p>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  >
                    <span className="font-bold text-slate-200">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-5 text-slate-400 leading-relaxed border-t border-slate-800/50 pt-4">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Shield className="text-blue-500 w-6 h-6" />
              <span className="text-xl font-bold text-white">SCMD Pro</span>
            </div>
            
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-slate-400 font-medium">
              <a href="#" className="hover:text-white transition-colors">Về chúng tôi</a>
              <a href="#" className="hover:text-white transition-colors">Liên hệ</a>
              <a href="#" className="hover:text-white transition-colors">Chính sách bảo mật</a>
              <a href="#" className="hover:text-white transition-colors">Điều khoản sử dụng</a>
            </nav>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500 font-medium">
            &copy; {new Date().getFullYear()} SCMD Pro (The Guardian). All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
