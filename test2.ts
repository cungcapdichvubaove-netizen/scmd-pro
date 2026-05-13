import { StaffRepository } from './src/server/modules/staff/staff.repository.js';
(async () => {
    try {
        await StaffRepository.getByUsername("admin", "127");
    } catch (e: any) {
        console.log("ACTUAL REASON:", e);
    }
})();
