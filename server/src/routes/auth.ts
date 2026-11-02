import { Router, type Response } from 'express';
import { z } from 'zod';
import { validate, asyncH } from '../lib/validate.js';
import { normalizePhone } from '../lib/phone.js';
import { badRequest } from '../lib/errors.js';
import { otpLimiter } from '../middleware/rateLimit.js';
import { env } from '../config/env.js';
import * as auth from '../services/auth.service.js';
import { prisma } from '../lib/prisma.js';
import { AREAS, CUSTOMER_TYPES } from '../../../shared/types.js';
import type { User } from '@prisma/client';

export const authRouter = Router();

const phoneSchema = z.string().transform((v, ctx) => {
  const p = normalizePhone(v);
  if (!p) ctx.addIssue({ code: 'custom', message: 'Enter a valid Indian mobile number' });
  return p as string;
});

const cookieBase = { httpOnly: true, sameSite: env.COOKIE_SECURE ? ('none' as const) : ('lax' as const), secure: env.COOKIE_SECURE, path: '/' };

export function setAuthCookies(res: Response, t: { access: string; refresh: string }) {
  res.cookie('access', t.access, { ...cookieBase, maxAge: 15 * 60_000 });
  res.cookie('refresh', t.refresh, { ...cookieBase, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400000 });
}
export const publicUser = (u: User) => ({
  id: u.id, name: u.name, phone: u.phone, role: u.role, area: u.area, customerType: u.customerType,
  referralCode: u.referralCode, badges: u.badges, createdAt: u.createdAt,
});

authRouter.post('/otp/request', otpLimiter, validate(z.object({ phone: phoneSchema })), asyncH(async (req, res) => {
  res.json(await auth.requestOtp(req.body.phone));
}));

authRouter.post('/otp/verify', validate(z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP'),
  profile: z.object({
    name: z.string().trim().min(2).max(60),
    area: z.enum(AREAS as [string, ...string[]]),
    customerType: z.enum(CUSTOMER_TYPES as [string, ...string[]]),
    referralCode: z.string().trim().toUpperCase().max(20).optional().nullable(),
  }).optional(),
  deviceId: z.string().max(64).optional(),
})), asyncH(async (req, res) => {
  const { phone, code, profile, deviceId } = req.body;
  const { tokens, user } = await auth.loginOrSignup(phone, code, profile ? { ...profile, deviceId, ip: req.ip } : undefined);
  setAuthCookies(res, tokens);
  res.json({ user: publicUser(user) });
}));

authRouter.post('/refresh', asyncH(async (req, res) => {
  const r = req.cookies?.refresh;
  if (!r) throw badRequest('No refresh token');
  setAuthCookies(res, await auth.rotateRefresh(r));
  res.json({ ok: true });
}));

authRouter.post('/logout', asyncH(async (req, res) => {
  if (req.cookies?.refresh) await auth.revokeRefresh(req.cookies.refresh);
  res.clearCookie('access', cookieBase);
  res.clearCookie('refresh', cookieBase);
  res.json({ ok: true });
}));

authRouter.get('/referral-code/:code', asyncH(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { referralCode: String(req.params.code).toUpperCase() }, select: { name: true } });
  res.json({ valid: !!u, referrerName: u?.name ?? null });
}));
