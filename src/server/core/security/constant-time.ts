import crypto from 'crypto';

export function timingSafeStringEqual(expected: string, provided: string): boolean {
  const expectedHash = crypto.createHash('sha256').update(expected, 'utf8').digest();
  const providedHash = crypto.createHash('sha256').update(provided, 'utf8').digest();
  return crypto.timingSafeEqual(expectedHash, providedHash);
}
