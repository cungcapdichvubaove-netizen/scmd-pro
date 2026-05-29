import { Request } from 'express';
import { ClientContext, SecurityContext, UserRole } from '../architecture/types.js';
import { loggerContext } from '../logger/index.js';

type RequestUserLike = {
  id?: string;
  tenantId?: string;
  role?: string;
  email?: string;
  assignedVendorId?: string | null;
  assignedSiteId?: string | null;
  assignedContractId?: string | null;
};

type RequestLike = Partial<Request> & {
  user?: RequestUserLike;
  clientContext?: ClientContext;
};

function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

export class RequestContextResolver {
  static resolve(req: RequestLike): SecurityContext {
    const user = req.user;

    // Bug-V2-08: Strict validation of auth context fields
    if (!user?.id || !user?.tenantId || !user?.role) {
      throw new Error('Không được phép truy cập: thiếu hoặc không đầy đủ ngữ cảnh xác thực bắt buộc (id, tenantId, role)');
    }

    if (!isUserRole(user.role)) {
      throw new Error('Không được phép truy cập: role không hợp lệ trong ngữ cảnh xác thực');
    }

    const context: SecurityContext = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email || '',
      assignedVendorId: user.assignedVendorId ?? null,
      assignedSiteId: user.assignedSiteId ?? null,
      assignedContractId: user.assignedContractId ?? null,
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
