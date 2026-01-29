import crypto from 'crypto';

export function generateHmac(secret: string, payload: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

export function verifyHmac(secret: string, payload: string, signature: string): boolean {
  const expected = generateHmac(secret, payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}
