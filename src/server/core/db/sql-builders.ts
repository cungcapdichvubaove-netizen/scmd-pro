/**
 * Helper to build SQL CASE statement for bulk updates.
 * Optimized for Prisma $executeRawUnsafe.
 * SECURITY: Implements strict identifier whitelisting to prevent SQL injection.
 */
export function buildBulkUpdateCaseSql(
  tableName: string,
  fieldToUpdate: string,
  idField: string,
  updates: Array<{ id: string | number; value: any }>,
  extraConditions: Record<string, any> = {}
) {
  // 🛡️ SECURITY [C-01]: Whitelist identifiers to prevent SQL Injection
  const ALLOWED_TABLES = new Set(['checkpoints', 'staff', 'patrol_logs', 'attendance_records']);
  const ALLOWED_FIELDS = new Set(['qr_hash', 'status', 'trust_score', 'last_active', 'is_valid']);
  const ALLOWED_WHERE_KEYS = new Set(['tenant_id', 'id', 'status', 'staff_id']);

  if (!ALLOWED_TABLES.has(tableName)) {
    throw new Error(`SQL_SECURITY_VIOLATION: Table "${tableName}" is not allowed for bulk updates.`);
  }
  if (!ALLOWED_FIELDS.has(fieldToUpdate)) {
    throw new Error(`SQL_SECURITY_VIOLATION: Field "${fieldToUpdate}" is not allowed for bulk updates.`);
  }
  if (!ALLOWED_WHERE_KEYS.has(idField)) {
    throw new Error(`SQL_SECURITY_VIOLATION: ID Field "${idField}" is not allowed for bulk updates.`);
  }

  if (updates.length === 0) {
    return { sql: '', params: [] };
  }

  const ids = updates.map(u => u.id);
  const values = updates.map(u => u.value);
  
  let caseStmt = 'CASE ';
  const params: any[] = [];
  
  // Identifiers are parameterized as $1...$N
  for (let i = 0; i < updates.length; i++) {
    // idField comes from whitelist above
    caseStmt += `WHEN ${idField} = $${i + 1} THEN $${i + 1 + updates.length} `;
    params.push(ids[i]);
  }
  caseStmt += 'END';
  
  // Collect values $N+1...$2N
  for (let i = 0; i < updates.length; i++) {
    params.push(values[i]);
  }

  // Build WHERE clause
  const inClause = ids.map((_, idx) => `$${idx + 1}`).join(',');
  let whereClause = `${idField} IN (${inClause})`;
  
  // Add extra conditions (e.g., tenant_id)
  let paramIdx = params.length + 1;
  for (const [key, val] of Object.entries(extraConditions)) {
    if (!ALLOWED_WHERE_KEYS.has(key)) {
      throw new Error(`SQL_SECURITY_VIOLATION: Condition key "${key}" is not allowed.`);
    }
    whereClause += ` AND ${key} = $${paramIdx++}`;
    params.push(val);
  }

  // Final construction using whitelisted identifiers
  const sql = `UPDATE ${tableName} SET ${fieldToUpdate} = ${caseStmt} WHERE ${whereClause}`;

  return { sql, params };
}
