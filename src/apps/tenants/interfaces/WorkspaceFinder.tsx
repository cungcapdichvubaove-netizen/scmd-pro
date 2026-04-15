import React, { useState } from 'react';
import { Building2, ArrowRight, Shield, Search } from 'lucide-react';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDInput } from '../../common/interfaces/components/SCMDInput';
import { cn } from '../../../lib/utils';

interface WorkspaceFinderProps {
  onFind: (subdomain: string) => void;
  onBack: () => void;
}

export const WorkspaceFinder: React.FC<WorkspaceFinderProps> = ({ onFind, onBack }) => {
  const [subdomain, setSubdomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomain.trim()) return;

    setIsLoading(true);
    setError(null);

    // Giả lập kiểm tra Workspace tồn tại
    setTimeout(() => {
      setIsLoading(false);
      const validWorkspaces = ['vincom', 'global', 'scmd', 'tenant1'];
      if (validWorkspaces.includes(subdomain.toLowerCase())) {
        onFind(subdomain.toLowerCase());
      } else {
        setError('Không tìm thấy không gian làm việc này. Vui lòng kiểm tra lại.');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-scmd-navy/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-scmd-cyber/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-scmd-slate border border-slate-800 shadow-2xl mb-6">
            <Search size={40} className="text-scmd-cyber" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Tìm không gian làm việc</h1>
          <p className="text-slate-400 font-medium">Nhập địa chỉ URL SCMD của công ty bạn</p>
        </div>

        <div className="bg-scmd-slate/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[32px] shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                Địa chỉ không gian làm việc
              </label>
              <div className="flex items-center">
                <input 
                  type="text" 
                  placeholder="ten-cong-ty"
                  className={cn(
                    "flex-1 h-14 px-5 bg-slate-900/50 border rounded-l-2xl text-white font-bold focus:outline-none transition-all",
                    error ? "border-red-500/50" : "border-slate-800 focus:border-scmd-cyber"
                  )}
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomain(e.target.value);
                    setError(null);
                  }}
                  autoFocus
                />
                <div className="h-14 px-5 flex items-center bg-slate-800/50 border border-l-0 border-slate-800 rounded-r-2xl text-slate-400 font-bold text-sm">
                  .scmd.vn
                </div>
              </div>
              {error && (
                <p className="mt-3 text-xs font-bold text-red-400 ml-1 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-400" /> {error}
                </p>
              )}
            </div>

            <SCMDButton 
              type="submit" 
              className="w-full h-14 text-base shadow-lg shadow-scmd-cyber/20"
              isLoading={isLoading}
            >
              Tiếp tục <ArrowRight size={20} className="ml-2" />
            </SCMDButton>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/50 flex flex-col gap-4">
            <button 
              onClick={onBack}
              className="text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest text-center"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Bạn quên địa chỉ không gian làm việc? <br />
            <a href="#" className="text-scmd-cyber hover:underline font-bold mt-1 inline-block">Liên hệ quản trị viên hệ thống</a>
          </p>
        </div>
      </div>
    </div>
  );
};
