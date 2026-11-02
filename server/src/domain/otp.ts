import { env } from '../config/env.js';
import { normalizePhone } from '../lib/phone.js';

export interface FakeOtpConfig { mode: 'fake' | 'real'; ownerPhone: string; ownerOtp: string; customerOtp: string }

/**
 * Fake / test OTP rule (OTP_MODE=fake):
 *   owner number (OWNER_PHONE, default +916385340555) -> OWNER_OTP     (default 782751)
 *   any other number                                  -> CUSTOMER_OTP  (default 123455)
 * Returns null in real mode, so a random code is generated and sent by SMS instead.
 */
export function resolveFakeOtp(phone: string, cfg: FakeOtpConfig): string | null {
  if (cfg.mode !== 'fake') return null;
  const owner = normalizePhone(cfg.ownerPhone) ?? cfg.ownerPhone;
  const given = normalizePhone(phone) ?? phone;
  return given === owner ? cfg.ownerOtp : cfg.customerOtp;
}

/** Bound to the running environment. */
export const fakeOtpFor = (phone: string) =>
  resolveFakeOtp(phone, { mode: env.OTP_MODE, ownerPhone: env.OWNER_PHONE, ownerOtp: env.OWNER_OTP, customerOtp: env.CUSTOMER_OTP });

export const isOwnerPhone = (phone: string) =>
  (normalizePhone(phone) ?? phone) === (normalizePhone(env.OWNER_PHONE) ?? env.OWNER_PHONE);
