import { runMinimalSeed } from './tiers/minimal.js';
import { runStandardSeed } from './tiers/standard.js';
import { runStressSeed } from './tiers/stress.js';
import { cleanDatabase } from './utils/cleaner.js';
import { logger } from './utils/logger.js';
import { db } from '../../src/server/core/db/prisma.js';

async function main() {
  const args = process.argv.slice(2);
  const isReset = args.includes('--reset');
  const tier = args.find(arg => arg.startsWith('--tier='))?.split('=')[1] || 'standard';

  logger.info(`Starting Database Seeder (Tier: ${tier.toUpperCase()})`);

  try {
    if (isReset) {
      // Prompt usually required warning in prod, but safe here for local/demo
      await cleanDatabase();
    }

    // Always run minimal first because it sets up the system workspace
    await runMinimalSeed();

    if (tier === 'standard' || tier === 'stress') {
      await runStandardSeed();
    }
    
    if (tier === 'stress') {
      await runStressSeed();
    }

    logger.success('✅ Seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.system().$disconnect();
  }
}

main();
