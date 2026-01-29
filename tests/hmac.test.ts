import { describe, it, expect } from 'vitest';
import { generateHmac, verifyHmac } from '../src/shared/hmac';

describe('HMAC utils', () => {
  const secret = 'test-secret-123';

  it('deve gerar um hash hex valido', () => {
    const hash = generateHmac(secret, 'payload');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('deve verificar assinatura correta', () => {
    const payload = 'timestamp:{"userId":1}';
    const sig = generateHmac(secret, payload);
    expect(verifyHmac(secret, payload, sig)).toBe(true);
  });

  it('deve rejeitar assinatura incorreta', () => {
    const payload = 'timestamp:{"userId":1}';
    const fakeSig = generateHmac('wrong-secret', payload);
    expect(verifyHmac(secret, payload, fakeSig)).toBe(false);
  });

  it('mesmo payload gera mesmo hash (determinismo)', () => {
    const p = '12345:test';
    expect(generateHmac(secret, p)).toBe(generateHmac(secret, p));
  });

  it('payloads diferentes geram hashes diferentes', () => {
    const h1 = generateHmac(secret, 'payload1');
    const h2 = generateHmac(secret, 'payload2');
    expect(h1).not.toBe(h2);
  });
});
