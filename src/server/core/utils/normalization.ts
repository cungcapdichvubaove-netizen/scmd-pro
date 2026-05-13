export function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalStringify(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj as object).sort();
  const result = sortedKeys.map(key => {
    const value = (obj as Record<string, unknown>)[key];
    return `"${key}":${canonicalStringify(value)}`;
  });

  return '{' + result.join(',') + '}';
}
