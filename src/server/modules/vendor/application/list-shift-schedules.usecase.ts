import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { shiftScheduleListSchema, ShiftScheduleListDTO } from '../vendor.schema.js';
import { VendorRepository } from '../vendor.repository.js';

export class ListShiftSchedulesUseCase extends BaseUseCase<ShiftScheduleListDTO, any[]> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN, UserRole.VENDOR_COMMANDER, UserRole.VENDOR_REPRESENTATIVE];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected override async validate(request: ShiftScheduleListDTO): Promise<void> {
    const data = shiftScheduleListSchema.parse(request);
    if (data.dateTo < data.dateFrom) {
      throw new Error('SHIFT_DATE_RANGE_INVALID');
    }
  }

  protected async internalExecute(context: SecurityContext, request: ShiftScheduleListDTO): Promise<any[]> {
    return await VendorRepository.listShiftSchedules(context, request);
  }
}
