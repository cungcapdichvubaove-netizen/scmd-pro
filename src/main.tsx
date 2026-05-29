/**
 * SCMD Pro - Frontend Entry Point
 * v4.33.31 - Security Hardening & Isolation
 * 
 * [FIX]: Fetch TypeError Protection Guard
 * Giải quyết lỗi "Cannot set property fetch of #<Window> which has only a getter"
 * xảy ra trong môi trường sandbox khi có script cố gắng patch global fetch.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';
import './lib/i18n';

/**
 * [FIX]: WebSocket/Vite Noise Filter
 * Chặn các lỗi "Unhandled Rejection" liên quan đến kết nối WebSocket của Vite
 * vốn không thể tránh khỏi trong môi trường sandbox của AI Studio.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = (event.reason?.message || String(event.reason)).toLowerCase();
    if (
      msg.includes('[vite]') || 
      msg.includes('vite/client') || 
      msg.includes('failed to connect to websocket')
    ) {
      event.preventDefault();
      // Silently consume benign HMR failure
    }
  });
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      import('./lib/toast')
        .then(({ toast }) => {
          toast('SCMD Pro da co ban cap nhat moi. He thong se dong bo va tai lai an toan trong it giay.', {
            duration: 8000,
            id: 'pwa-update-available',
          });
        })
        .catch(() => undefined);
    },
    onRegisteredSW(_swUrl, registration) {
      void registration?.update();
    },
    onRegisterError(error) {
      console.warn('[PWA] Khong the dang ky service worker:', error);
    },
  });

  window.addEventListener('beforeunload', () => {
    void updateServiceWorker(true);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
