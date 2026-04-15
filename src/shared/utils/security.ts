/**
 * Security utilities for SCMD Lite.
 */

export const sanitize = (str: string): string => {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m] || m));
};

export const logAudit = (db: any, tenantId: string, userId: string, action: string, details: any) => {
  const entry = {
    id: Math.random().toString(36).substr(2, 9),
    tenantId,
    userId,
    action,
    details,
    ip: "127.0.0.1", // Mock IP
    timestamp: new Date()
  };
  db.raw.audit_logs.push(entry);
  console.log(`[AuditLog] ${action} by ${userId} on tenant ${tenantId}`);
};
