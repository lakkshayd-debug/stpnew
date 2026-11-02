process.env.OTP_MODE = 'fake';             // tests never send a real SMS
process.env.OWNER_PHONE = '+916385340555';
process.env.OWNER_OTP = '782751';
process.env.CUSTOMER_OTP = '123455';

import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

export const app = createApp();
export const agent = () => request.agent(app);
export const OWNER_PHONE = '6385340555';
export const OWNER_OTP = '782751';
export const CUSTOMER_OTP = '123455';
/** Owner number uses 782751, every other number uses 123455. */
export const otpFor = (phone: string) => (phone.replace(/\D/g, '').endsWith('6385340555') ? OWNER_OTP : CUSTOMER_OTP);

export async function loginAs(phone: string, profile?: { name: string; area: string; customerType: string; referralCode?: string }) {
  const a = agent();
  await a.post('/api/v1/auth/otp/request').send({ phone }).expect(200);
  const res = await a.post('/api/v1/auth/otp/verify').send({ phone, code: otpFor(phone), profile });
  return { a, res };
}

export async function resetDb() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(), prisma.notification.deleteMany(), prisma.reward.deleteMany(),
    prisma.purchaseConfirmation.deleteMany(), prisma.referral.deleteMany(), prisma.comment.deleteMany(),
    prisma.like.deleteMany(), prisma.savedPost.deleteMany(), prisma.postImage.deleteMany(), prisma.post.deleteMany(),
    prisma.refreshToken.deleteMany(), prisma.otp.deleteMany(), prisma.user.deleteMany(),
  ]);
}

export const ensureOwner = () =>
  prisma.user.upsert({
    where: { phone: '+916385340555' }, update: {},
    create: { phone: '+916385340555', name: 'Shyam', role: 'OWNER', referralCode: 'SHYAM-OWNER1' },
  });
