import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDLogo } from '../../common/interfaces/components/SCMDLogo';
// SCMDInput removed because it was unused
import { cn } from '../../../lib/utils';

interface WorkspaceFinderProps {
  onFind: (subdomain: string) => void;
  onBack: () => void;
}

export const WorkspaceFinder: React.FC<WorkspaceFinderProps> = ({ onFind, onBack }) => {
  const [subdomain, setSubdomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = subdomain.trim().toLowerCase();
    if (!trimmed) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/auth/check-workspace/${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (res.ok && data.exists && data.active) {
        onFind(trimmed);
      } else if (res.status === 403) {
        setError(data.error || 'Không gian làm việc này đã bị tạm khóa.');
      } else if (res.status === 404 || !data.exists) {
        setError(`Không tìm thấy không gian làm việc "${trimmed}". Vui lòng kiểm tra lại.`);
      } else {
        setError(data.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } catch (err) {
      setError('Không thể kết nối đến server. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-header)] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-header)]/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-primary)]/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center justify-center mb-10">
          <SCMDLogo variant="dark" size="lg" className="mb-6 flex-col gap-6" />
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">TÌM KHÔNG GIAN LÀM VIỆC</h1>
          <p className="text-[var(--color-text-muted)] font-medium">Nhập địa chỉ URL SCMD của công ty bạn</p>
          <div className="mt-4 text-xs font-semibold text-[var(--color-primary-accent)]/80 bg-[var(--color-primary-accent)]/10 py-1.5 px-3 rounded-full inline-block border border-[var(--color-primary-accent)]/20">
            Dữ liệu thử nghiệm: "system" hoặc "vinhomes"
          </div>
        </div>

        <div className="bg-[var(--color-surface)]/5 backdrop-blur-xl border border-[var(--color-border)]/10 p-8 rounded-[var(--radius-xl)] shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em] mb-3 ml-1">
                Địa chỉ không gian làm việc
              </label>
              <div className="flex items-center">
                <input 
                  type="text" 
                  placeholder="ten-cong-ty"
                  className={cn(
                    "flex-1 h-14 px-5 bg-[var(--color-surface)]/5 border rounded-l-[var(--radius-lg)] text-white font-bold focus:outline-none transition-all",
                    error ? "border-[var(--color-danger)]" : "border-[var(--color-border)]/20 focus:border-[var(--color-primary)]"
                  )}
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomain(e.target.value);
                    setError(null);
                  }}
                  autoFocus
                />
                <div className="h-14 px-5 flex items-center bg-[var(--color-surface)]/10 border border-l-0 border-[var(--color-border)]/20 rounded-r-[var(--radius-lg)] text-[var(--color-text-secondary)] font-bold text-sm">
                  .scmdpro.com
                </div>
              </div>
              {error && (
                <p className="mt-3 text-xs font-bold text-[var(--color-danger)] ml-1 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[var(--color-danger)]" /> {error}
                </p>
              )}
            </div>

            <SCMDButton 
              type="submit" 
              className="w-full h-14 text-base shadow-lg shadow-[var(--color-primary)]/20 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold rounded-[var(--radius-sm)] transition-[var(--transition-base)] uppercase"
              isLoading={isLoading}
            >
              Tiếp tục <ArrowRight size={20} className="ml-2" />
            </SCMDButton>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--color-border)]/10 flex flex-col gap-4">
            <button 
              onClick={onBack}
              className="text-xs font-bold text-[var(--color-text-secondary)] hover:text-white transition-colors uppercase tracking-widest text-center"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-[var(--color-text-secondary)] font-medium">
            Bạn quên địa chỉ không gian làm việc? <br />
            <a href="#" className="text-[var(--color-primary-accent)] hover:text-[var(--color-primary-hover)] transition-colors font-bold mt-1 inline-block">Liên hệ quản trị viên hệ thống</a>
          </p>
        </div>
      </div>
    </div>
  );
};