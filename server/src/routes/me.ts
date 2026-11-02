import { Router } from 'express';
import { z } from 'zod';
import { validate, asyncH } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { publicUser } from './auth.js';
import { referralSummary } from '../services/referral.service.js';
import { AREAS, CUSTOMER_TYPES } from '../../../shared/types.js';

export const meRouter = Router();
meRouter.use(requireAuth);
meRouter.get('/', asyncH(async (req, res) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  const unread = await prisma.notification.count({ where: { userId: u.id, readAt: null } });
  res.json({ user: publicUser(u), unread });
}));
meRouter.patch('/', validate(z.object({
  name: z.string().trim().min(2).max(60).optional(),
  area: z.enum(AREAS as [string, ...string[]]).optional(),
  customerType: z.enum(CUSTOMER_TYPES as [string, ...string[]]).optional(),
})), asyncH(async (req, res) => {
  const u = await prisma.user.update({ where: { id: req.user!.id }, data: req.body });
  res.json({ user: publicUser(u) });
}));

export const referralsRouter = Router();
referralsRouter.use(requireAuth);
referralsRouter.get('/', asyncH(async (req, res) => res.json(await referralSummary(req.user!.id))));

export const rewardsRouter = Router();
rewardsRouter.use(requireAuth);
rewardsRouter.get('/', asyncH(async (req, res) => {
  const rows = await prisma.reward.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
  res.json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
}));

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);
notificationsRouter.get('/', asyncH(async (req, res) => {
  const items = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ items, unread: items.filter((i) => !i.readAt).length });
}));
notificationsRouter.post('/read', validate(z.object({ ids: z.array(z.string()).optional() })), asyncH(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null, ...(req.body.ids ? { id: { in: req.body.ids } } : {}) },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
}));
