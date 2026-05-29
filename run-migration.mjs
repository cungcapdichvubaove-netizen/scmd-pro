// =============================================================
// run-migration.mjs — SCMD Pro Custom SQL Migrations v1.1
// Chay sau `prisma migrate deploy`, ap dung:
//   1. rls_setup.sql          — Row Level Security + PostGIS indexes
//   2. realtime_triggers.sql  — pg_notify triggers
//
// Dung pg native (khong phai PrismaClient):
//   - pg.Client gui SQL qua simple query protocol (ho tro multi-stmt)
//   - Fallback tung statement neu batch loi (an toan khi restart)
//   - $$ block-aware splitter: khong cat sai DO $$ ... $$ blocks
// =============================================================

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[run-migration] ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

const SQL_FILES = [
  { name: 'rls_setup.sql',         path: path.join(__dirname, 'prisma', 'rls_setup.sql') },
  { name: 'realtime_triggers.sql', path: path.join(__dirname, 'prisma', 'realtime_triggers.sql') },
];

/**
 * Strip leading comment lines and blank lines from a SQL statement string.
 * Needed because `current` buffer may accumulate file-header comments
 * before the first real statement begins.
 */
function stripLeadingComments(stmt) {
  const lines = stmt.split('\n');
  while (lines.length > 0) {
    const t = lines[0].trim();
    if (t.startsWith('--') || t === '') {
      lines.shift();
    } else {
      break;
    }
  }
  return lines.join('\n').trim();
}

/**
 * Split a SQL file into individual statements, correctly handling:
 *   - DO $$ ... $$ dollar-quoted PL/pgSQL blocks (semicolons inside ignored)
 *   - Leading -- comment blocks before each statement
 *   - Blank/comment-only statements filtered out
 */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  for (const line of sql.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim();
    // Toggle dollar-quote state when an odd number of $$ appear on this line
    if ((line.match(/\$\$/g) || []).length % 2 !== 0) {
      inDollarQuote = !inDollarQuote;
    }
    current += line + '\n';
    // Split on semicolons only outside dollar-quoted blocks
    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = stripLeadingComments(current.trim());
      if (stmt) statements.push(stmt);
      current = '';
    }
  }
  // Flush any trailing content without a trailing semicolon
  const remaining = stripLeadingComments(current.trim());
  if (remaining) statements.push(remaining);

  return statements;
}

async function applyFile(client, file) {
  let sql;
  try {
    sql = readFileSync(file.path, 'utf8');
  } catch (e) {
    throw new Error(`[run-migration] Cannot read ${file.name}: ${e.message}`);
  }

  console.log(`\n[run-migration] Applying ${file.name}...`);

  try {
    await client.query(sql);
    console.log(`[run-migration] OK  ${file.name} (batch)`);
    return;
  } catch (batchErr) {
    console.warn(`[run-migration] Batch mode failed (${batchErr.message.slice(0, 80)})`);
    console.warn(`[run-migration] Retrying statement-by-statement for ${file.name}...`);
  }

  const statements = splitStatements(sql);
  let ok = 0, skipped = 0, failed = 0;

  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 60);
    try {
      await client.query(stmt);
      ok++;
    } catch (e) {
      const msg = e.message || '';
      const isExpected = (
        msg.includes('already exists') ||
        msg.includes('does not exist') ||
        msg.includes('duplicate')
      );
      if (isExpected) {
        console.warn(`[run-migration]   SKIP: ${msg.slice(0, 70)}`);
        skipped++;
      } else {
        console.error(`[run-migration]   FAIL: ${msg.slice(0, 70)} | ${preview}`);
        failed++;
      }
    }
  }

  console.log(
    `[run-migration] ${file.name}: ${ok} ok, ${skipped} skipped, ${failed} failed` +
    (failed > 0 ? ' — check logs above' : '')
  );

  if (failed > 0) {
    throw new Error(`[run-migration] Critical SQL file ${file.name} failed with ${failed} statement error(s).`);
  }
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('[run-migration] Connected.');

    for (const file of SQL_FILES) {
      await applyFile(client, file);
    }

    console.log('\n[run-migration] All custom migrations complete.');
  } catch (connectErr) {
    console.error(`[run-migration] DB connection error: ${connectErr.message}`);
    throw connectErr;
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

main().catch(e => {
  console.error(`[run-migration] Unhandled: ${e.message}`);
  process.exit(1);
});
