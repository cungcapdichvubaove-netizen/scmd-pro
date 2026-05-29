import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  children?: ReactNode;
  /** Custom fallback UI — nếu không truyền, dùng built-in error screen */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary
 *
 * Ngăn chặn lỗi runtime làm sập toàn bộ ứng dụng (White Screen of Death).
 * Triết lý Resilience: giao diện có thể hỏng, ứng dụng phải phục hồi được.
 *
 * Chỉ dùng class component vì React chưa hỗ trợ error boundary dạng hook.
 */
class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // TODO: gửi lên Sentry / logging service khi có sản phẩm
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Custom fallback được ưu tiên
    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Built-in error screen
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-[40px] shadow-2xl text-center space-y-8 relative overflow-hidden">
          {/* Accent bar */}
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"
          />

          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
            <AlertTriangle size={40} className="text-red-500" aria-hidden="true" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Hệ thống gặp sự cố
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Đã có lỗi không mong muốn xảy ra trong quá trình vận hành giao diện.
              Đừng lo lắng, dữ liệu của bạn vẫn an toàn.
            </p>
          </div>

          {/* SCMD Debug: Hiển thị chi tiết lỗi ngay cả ở Production Desktop để xác định nguyên nhân crash */}
          {this.state.error && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left overflow-auto max-h-40">
              <p className="text-[10px] font-mono text-red-400 break-all">
                {this.state.error.toString()}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95"
            >
              <RefreshCw size={18} aria-hidden="true" />
              Thử tải lại trang
            </button>

            <button
              type="button"
              onClick={this.handleGoHome}
              className="w-full py-4 bg-slate-800 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-all active:scale-95 border border-slate-700"
            >
              <Home size={18} aria-hidden="true" />
              Về trang chủ
            </button>
          </div>

          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest pt-4">
            SCMD Security Protocol — Resilience Layer v1.0
          </p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
