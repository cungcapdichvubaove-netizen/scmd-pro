import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { StaffRepository } from '../staff.repository.js';
import { Staff } from '../staff.schema.js';

export class ListStaffUseCase extends BaseUseCase<{ cursor?: string; limit?: number; role?: string; status?: string; search?: string; view?: string } | undefined, { data: Omit<Staff, 'password'>[], nextCursor: string | null }> {
  protected async authorize(context: SecurityContext): Promise<void> {
    // Permission: staff:read (mapped in permissions.ts, normally handled by middleware)
    // But for defense-in-depth, we check role here too
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, params?: { cursor?: string; limit?: number; role?: string; status?: string; search?: string; view?: string }): Promise<{ data: Omit<Staff, 'password'>[], nextCursor: string | null }> {
    const limit = params?.limit || 20;
    return await StaffRepository.getAllByTenant(context, params?.cursor, limit, {
      role: params?.role,
      status: params?.status,
      search: params?.search,
      view: params?.view
    });
  }
}
