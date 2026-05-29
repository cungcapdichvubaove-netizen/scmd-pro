import { VendorRepository } from '../vendor.repository.js';

export class ProcessOverdueShiftShortagesUseCase {
  async execute(tenantId: string) {
    return await VendorRepository.processOverdueShiftShortages(tenantId);
  }
}
