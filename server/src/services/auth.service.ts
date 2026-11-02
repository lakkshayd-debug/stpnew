import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { badRequest, conflict, forbidden, unauthorized } from '../lib/errors.js';
import { otpProvider } from '../providers/otp.js';
import { signAccess, type AuthUser } from '../middleware/auth.js';
import { createReferral } from './referral.service.js';
import { fakeOtpFor, isOwnerPhone } from '../domain/otp.js';
import type { Area, CustomerType } from '@prisma/client';

const OTP_TTL_MS = 5 * 60_000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = (n = 6) => Array.from(crypto.randomBytes(n)).map((b) => ALPHABET[b % ALPHABET.length]).join('');

export { isOwnerPhone };

export async function generateReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = `SHYAM-${randomCode()}`;
    if (!(await prisma.user.findUnique({ where: { referralCode: code } }))) return code;
  }
  throw new Error('Could not generate a unique referral code');
}

/** Creates a 6-digit OTP, stores only its hash, and sends a real SMS through the configured gateway. */
export async function requestOtp(phone: string) {
  const recent = await prisma.otp.count({ where: { phone, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
  if (recent >= 5) throw forbidden('Too many OTP requests. Please try again in 10 minutes.');

  const fake = fakeOtpFor(phone);                       // null unless OTP_MODE=fake
  const code = fake ?? crypto.randomInt(100000, 999999).toString();
  const row = await prisma.otp.create({
    data: { phone, codeHash: await bcrypt.hash(code, 8), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });

  if (!fake) {
    try {
      await otpProvider.send(phone, code);
    } catch (e) {
      await prisma.otp.delete({ where: { id: row.id } }).catch(() => undefined); // let the user retry immediately
      throw e;
    }
  } else {
    await new (await import('../providers/otp.js')).ConsoleOtpProvider().send(phone, code);
  }

  return {
    isNewUser: !(await prisma.user.findUnique({ where: { phone }, select: { id: true } })),
    expiresInSec: OTP_TTL_MS / 1000,
    testOtp: fake,            // shown in the UI only while OTP_MODE=fake
  };
}

export async function verifyOtpCode(phone: string, code: string) {
  const otp = await prisma.otp.findFirst({ where: { phone, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!otp) throw unauthorized('OTP expired or never requested. Please request a new one.');
  if (otp.attempts >= 5) throw unauthorized('Too many wrong attempts. Please request a new OTP.');
  const fake = fakeOtpFor(phone);
  const ok = (await bcrypt.compare(code, otp.codeHash)) || (fake !== null && code === fake);
  if (!ok) {
    await prisma.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw unauthorized('Wrong OTP');
  }
  await prisma.otp.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
}

export interface SignupInput {
  name: string; area: Area; customerType: CustomerType; referralCode?: string | null; deviceId?: string | null; ip?: string;
}

export async function loginOrSignup(phone: string, code: string, signup?: SignupInput) {
  await verifyOtpCode(phone, code);
  let user = await prisma.user.findUnique({ where: { phone } });
  if (user?.isBlocked) throw forbidden('Account blocked. Please contact the store.');

  if (!user) {
    if (!signup) throw badRequest('Profile details are required for a new account', { needsProfile: true });
    if (await prisma.user.findUnique({ where: { phone } })) throw conflict('This phone number is already registered');
    const owner = isOwnerPhone(phone);
    user = await prisma.user.create({
      data: {
        phone,
        name: signup.name,
        role: owner ? 'OWNER' : 'CUSTOMER',          // only OWNER_PHONE can be the owner
        area: signup.area,
        customerType: owner ? null : signup.customerType,
        referralCode: await generateReferralCode(),
        signupIp: signup.ip,
        deviceId: signup.deviceId,
      },
    });
    // the owner cannot be referred by anyone
    if (signup.referralCode && !owner) await createReferral(signup.referralCode, user, signup.ip, signup.deviceId);
  } else if (isOwnerPhone(phone) && user.role !== 'OWNER') {
    user = await prisma.user.update({ where: { id: user.id }, data: { role: 'OWNER' } }); // self-heal after an OWNER_PHONE change
  } else if (!isOwnerPhone(phone) && user.role === 'OWNER') {
    user = await prisma.user.update({ where: { id: user.id }, data: { role: 'CUSTOMER' } }); // old owner number demoted
  }

  const tokens = await issueTokens({ id: user.id, role: user.role, phone: user.phone, name: user.name });
  return { tokens, user };
}

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function issueTokens(u: AuthUser) {
  const refresh = crypto.randomBytes(48).toString('hex');
  await prisma.refreshToken.create({
    data: { userId: u.id, tokenHash: sha(refresh), expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000) },
  });
  return { access: signAccess(u), refresh };
}

export async function rotateRefresh(refresh: string) {
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha(refresh) }, include: { user: true } });
  if (!row || row.expiresAt < new Date()) throw unauthorized('Session expired, please log in again');
  await prisma.refreshToken.delete({ where: { id: row.id } });
  if (row.user.isBlocked) throw forbidden('Account blocked');
  return issueTokens({ id: row.user.id, role: row.user.role, phone: row.user.phone, name: row.user.name });
}

export const revokeRefresh = (refresh: string) => prisma.refreshToken.deleteMany({ where: { tokenHash: sha(refresh) } });
