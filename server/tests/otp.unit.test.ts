import { describe, it, expect } from 'vitest';
import { resolveFakeOtp } from '../src/domain/otp.js';

const cfg = { mode: 'fake' as const, ownerPhone: '+916385340555', ownerOtp: '782751', customerOtp: '123455' };

describe('fake OTP rules', () => {
  it('gives the owner number 782751 in every written format', () => {
    for (const p of ['6385340555', '+916385340555', '916385340555', '06385340555', '63853 40555']) {
      expect(resolveFakeOtp(p, cfg)).toBe('782751');
    }
  });
  it('gives every other number 123455', () => {
    for (const p of ['9000000001', '+919876543210', '7012345678']) {
      expect(resolveFakeOtp(p, cfg)).toBe('123455');
    }
  });
  it('returns null in real mode so a random SMS code is used', () => {
    expect(resolveFakeOtp('6385340555', { ...cfg, mode: 'real' })).toBeNull();
  });
});
