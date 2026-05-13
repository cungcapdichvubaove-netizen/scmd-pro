/**
 * Deep Recursive Data Scrubbing
 * Masks sensitive information in JSON objects to prevent PII and credential leakage
 * in audit logs (Data Privacy Compliance).
 */
export function deepMaskSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => deepMaskSensitiveData(item));
  }

  // Handle strings that might be JSON
  if (typeof data === 'string') {
    try {
      if (data.startsWith('{') || data.startsWith('[')) {
        const parsed = JSON.parse(data);
        return JSON.stringify(deepMaskSensitiveData(parsed));
      }
    } catch {
      // Ignore parse errors, just return string
    }
    return data;
  }

  // Handle objects
  if (typeof data === 'object' && data !== null) {
    const maskedObj: any = {};
    const sensitiveKeys = new Set([
      'pwd', 'password', 'passwd', 'token', 'secret', 'credential',
      'authorization', 'api_key', 'apikey', 'access_token', 'refresh_token'
    ]);

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        maskedObj[key] = '***MASKED***';
      } else {
        maskedObj[key] = deepMaskSensitiveData(value);
      }
    }
    return maskedObj;
  }

  // Primitives
  return data;
}
