/**
 * Utility for digital signatures to ensure data integrity for offline-first patrol logs.
 * Uses Web Crypto API (SubtleCrypto) for SHA-256 HMAC signatures.
 */

const TEXT_ENCODER = new TextEncoder();

/**
 * Generates a signature for a given payload and secret.
 */
export async function signData(payload: string, secret: string): Promise<string> {
  const keyBuffer = TEXT_ENCODER.encode(secret);
  const dataBuffer = TEXT_ENCODER.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    dataBuffer
  );

  return arrayBufferToHex(signatureBuffer);
}

/**
 * Verifies a signature for a given payload and secret.
 */
export async function verifyData(payload: string, signature: string, secret: string): Promise<boolean> {
  const generatedSignature = await signData(payload, secret);
  return generatedSignature === signature;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
