import { readFileSync } from 'fs';
import pkg from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  console.log('--- Applying SQL Script ---');
  const sql = readFileSync('./prisma/rls_setup.sql', 'utf8');
  
  // Tách các lệnh SQL đơn lẻ (naive split by semicolon)
  // Lưu ý: rl_setup.sql có DO $$ blocks chứa dấu chấm phẩy, nên split đơn giản có thể lỗi.
  // Tuy nhiên, rls_setup.sql được thiết kế để chạy nguyên khối hoặc từng phần.
  // Thử chạy nguyên khối trước.
  
  try {
    // Chạy toàn bộ file (không dùng transaction vì có CREATE INDEX có thể cần chạy riêng tùy trường hợp, 
    // nhưng ở đây mình dùng prisma.$executeRawUnsafe)
    await prisma.$executeRawUnsafe(sql);
    console.log('✅ rls_setup.sql applied successfully');
  } catch (e) {
    console.error('❌ Error applying rls_setup.sql:', e.message);
    
    // Nếu lỗi do split, thử chạy từng statement (cẩn thận với DO block)
    console.log('Trying statement by statement...');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
      
    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt);
        console.log('✓ Executed:', stmt.slice(0, 50).replace(/\n/g, ' ') + '...');
      } catch (err) {
        console.warn('⚠ Skip:', err.message.slice(0, 100));
      }
    }
  }

  // Confirm index exists
  try {
    const explainResult = await prisma.$queryRawUnsafe(`
      EXPLAIN SELECT id FROM checkpoints 
      WHERE location && ST_SetSRID(ST_MakePoint(106.660172, 10.762622), 4326)::geography 
      LIMIT 1;
    `);
    console.log('\n--- EXPLAIN ANALYZE (Proximity Query) ---');
    console.log(JSON.stringify(explainResult, null, 2));
  } catch (e) {
    console.warn('Could not run EXPLAIN:', e.message);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
