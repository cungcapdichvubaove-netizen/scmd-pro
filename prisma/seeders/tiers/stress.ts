import { db } from '../../../src/server/core/db/prisma.js';
import { logger } from '../utils/logger.js';
import { GLOBAL_CONSTANTS } from '../config.js';
import { generateVNName, generateIdNumber, generatePhone, randomInt, randomElement, generateCoordinates, randomDate } from '../utils/random.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function runStressSeed() {
  logger.step('Seeding Stress System Data');
  
  await db.withTenant('SYSTEM', async (sys) => {
    const tId = GLOBAL_CONSTANTS.VINHOMES_TENANT_ID;
    const center = GLOBAL_CONSTANTS.VINHOMES_CENTER;
    
    logger.info(`Adding Stress Data to Tenant: ${tId}`);

    // Create 100 extra staff
    const guardHash = await bcrypt.hash(GLOBAL_CONSTANTS.DEFAULT_GUARD_PASSWORD, GLOBAL_CONSTANTS.SALT_ROUNDS);
    
    // Checkpoints: Generate 200 checkpoints
    logger.info('Generating 200 checkpoints...');
    const cpIds: string[] = [];
    for (let i = 0; i < 200; i++) {
        const cpId = crypto.randomUUID();
        const coords = generateCoordinates(center.lat, center.lng, 2.0);
        await sys.$executeRawUnsafe(`
          INSERT INTO "checkpoints" (id, tenant_id, name, location, qr_hash, status, created_at, updated_at)
          VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, 'active', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `, cpId, tId, `Stress Point ${i}`, coords.lng, coords.lat, crypto.randomUUID());
        cpIds.push(cpId);
    }

    const staffs = await sys.staff.findMany({ where: { tenantId: tId }, select: { id: true } });
    if (staffs.length === 0) return;

    // Create 5000 patrol logs using createMany
    logger.info('Generating 5000 patrol logs...');
    const now = new Date();
    const logBatch = [];
    for (let i = 0; i < 5000; i++) {
        logBatch.push({
            id: crypto.randomUUID(),
            tenantId: tId,
            staffId: randomElement(staffs).id,
            checkpointId: randomElement(cpIds),
            createdAt: randomDate(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), now),
        });
    }

    // Split batches to avoid limit
    const BATCH_SIZE = 1000;
    for (let i = 0; i < logBatch.length; i += BATCH_SIZE) {
        await sys.patrolLog.createMany({
            data: logBatch.slice(i, i + BATCH_SIZE)
        });
    }
    
    logger.success('Stress Demo Data seeded.');
  });
}
