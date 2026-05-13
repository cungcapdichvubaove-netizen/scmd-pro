import { AuthProvider } from './auth.provider.interface.js';
import { JwtAuthProvider } from './jwt.auth.provider.js';

let defaultProvider: AuthProvider | null = null;

export const AuthProviderFactory = {
  getProvider(): AuthProvider {
    if (!defaultProvider) {
      // Configurable via env var (e.g. AUTH_PROVIDER_TYPE=FIREBASE)
      const providerType = process.env.AUTH_PROVIDER_TYPE || 'JWT';
      
      switch (providerType) {
        case 'JWT':
          defaultProvider = new JwtAuthProvider();
          break;
        default:
          defaultProvider = new JwtAuthProvider();
      }
    }
    return defaultProvider;
  }
};
