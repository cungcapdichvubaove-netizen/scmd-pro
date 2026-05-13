import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarBlock = false;
  let dollarTag = '';

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip pure comment lines when not in a block
    if (!inDollarBlock && trimmed.startsWith('--')) {
      continue;
    }

    // Detect start/end of dollar-quoted blocks (DO $$ or $tag$)
    const dollarMatches = line.match(/\$\w*\$/g);
    if (dollarMatches) {
      for (const tag of dollarMatches) {
        if (!inDollarBlock) {
          inDollarBlock = true;
          dollarTag = tag;
        } else if (tag === dollarTag) {
          inDollarBlock = false;
          dollarTag = '';
        }
      }
    }

    current += line + '\n';

    // Only split on semicolon when NOT inside a dollar block
    if (!inDollarBlock && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt.length > 0 && stmt !== ';') {
        statements.push(stmt);
      }
      current = '';
    }
  }

  // Catch any remaining statement
  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements;
}

async function executeSqlFile(filePath) {
  if (!existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return;
  }

  console.log(`\n📂 Executing: ${filePath}`);
  const sql = readFileSync(filePath, 'utf8');
  const statements = splitSqlStatements(sql);

  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      const summary = stmt.slice(0, 60).replace(/\n/g, ' ').trim();
      console.log('  ✓', summary + (stmt.length > 60 ? '...' : ''));
    } catch (e) {
      console.error('  ❌ Error executing statement:', stmt.slice(0, 100));
      console.error('  Error message:', e.message);
      throw e;
    }
  }
}

async function main() {
  const MANUAL_DIR = './prisma/migrations';
  let files = [];
  
  if (existsSync(MANUAL_DIR)) {
    files = readdirSync(MANUAL_DIR)
      .filter(f => f.endsWith('.sql') && !f.includes('/'))
      .sort()
      .map(f => join(MANUAL_DIR, f));
  }

  files.push('./prisma/rls_setup.sql');

  for (const file of files) {
    await executeSqlFile(file);
  }

  console.log('\n✅ All targeted migrations and RLS setup completed!');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
