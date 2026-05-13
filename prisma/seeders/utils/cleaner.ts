import { db } from '../../../src/server/core/db/prisma.js';
import { logger } from './logger.js';

export async function cleanDatabase() {
  logger.step('Cleaning Database');
  try {
    // Array of tables to keep (e.g., migrations)
    const keepTables = ['_prisma_migrations'];
    
    // Get all tables
    const tables = await db.system().$queryRaw<{ tablename: string }[]>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `;

    const tablesToTruncate = tables
      .filter(t => !keepTables.includes(t.tablename))
      .map(t => `"public"."${t.tablename}"`);

    if (tablesToTruncate.length > 0) {
      await db.system().$executeRawUnsafe(`TRUNCATE TABLE ${tablesToTruncate.join(', ')} CASCADE;`);
      logger.success('All tables truncated successfully.');
    } else {
      logger.info('No tables to truncate.');
    }
  } catch (error) {
    logger.error('Failed to clean database', error);
    throw error;
  }
}
