// Request removed because it was unused
import { SecurityContext } from '../architecture/types.js';
import { loggerContext } from '../logger/index.js';

export class RequestContextResolver {
  static resolve(req: any): SecurityContext {
    const user = req.user;
    
    // Bug-V2-08: Strict validation of auth context fields
    if (!user?.id || !user?.tenantId || !user?.role) {
      throw new Error('Unauthorized: Incomplete or missing authentication context (required: id, tenantId, role)');
    }
    
    const context: SecurityContext = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email || '',
      clientContext: req.clientContext
    };

    // Update logger context with security info
    const currentStore = loggerContext.getStore();
    if (currentStore) {
      currentStore.userId = user.id;
      currentStore.tenantId = user.tenantId;
    }

    return context;
  }
}
