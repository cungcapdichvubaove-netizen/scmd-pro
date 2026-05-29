import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { generateShiftSchedulesSchema, GenerateShiftSchedulesDTO } from '../vendor.schema.js';
import { VendorRepository } from '../vendor.repository.js';
import { AuditService } from '../../../core/audit/audit.service.js';

export class GenerateShiftSchedulesUseCase extends BaseUseCase<GenerateShiftSchedulesDTO, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN, UserRole.VENDOR_COMMANDER];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected override async validate(request: GenerateShiftSchedulesDTO): Promise<void> {
    const data = generateShiftSchedulesSchema.parse(request);
    if (data.dateTo < data.dateFrom) {
      throw new Error('SHIFT_DATE_RANGE_INVALID');
    }
  }

  protected async internalExecute(context: SecurityContext, request: GenerateShiftSchedulesDTO): Promise<any> {
    const result = await VendorRepository.generateShiftSchedules(context, request);
    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'GENERATE_SHIFT_SCHEDULES',
      resource: `contracts/${request.contractId}/shift-schedules`,
      payload: request,
      status: 'SUCCESS',
    });
    return result;
  }
}
