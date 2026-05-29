import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './routes/AppRouter';
import { SyncManager } from './lib/sync-manager';
import { GlobalToastViewport } from './lib/toast';

export default function App() {
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network connected. Triggering sync...');
      SyncManager.triggerSync();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen relative bg-scmd-navy">
        <GlobalToastViewport />
        <AppRouter />
      </div>
    </AuthProvider>
  );
}





