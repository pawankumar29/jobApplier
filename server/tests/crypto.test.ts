import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../src/utils/crypto.js';

describe('Crypto Utility (AES-256-GCM)', () => {
  it('should encrypt and decrypt strings accurately', () => {
    const secret = 'li_at=AQEDATN8v98102938102938102';
    const encrypted = encrypt(secret);
    expect(encrypted).not.toBe(secret);
    expect(encrypted).toContain(':');

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('should return empty string for invalid ciphertext', () => {
    const corrupted = 'invalid:format';
    expect(decrypt(corrupted)).toBe('');
  });
});

