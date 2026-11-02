import { Router } from 'express';
import { z } from 'zod';
import { validate, asyncH } from '../lib/validate.js';
import { requireOwner } from '../middleware/auth.js';
import { upload, processImages } from '../middleware/upload.js';
import { storage } from '../providers/storage.js';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import { getPost } from '../services/post.service.js';
import * as comments from '../services/comment.service.js';
import { confirmPurchase, referralSummary } from '../services/referral.service.js';
import { markRewardUsed, runRewardHousekeeping } from '../services/reward.service.js';
import { getRewardSettings, getShopSettings, setSetting } from '../services/settings.service.js';
import { overview, toCsv } from '../services/analytics.service.js';
import { notifyAllCustomers, audit } from '../services/notification.service.js';
import { POST_TYPES } from '../../../shared/types.js';
import type { Prisma } from '@prisma/client';

export const adminRouter = Router();
adminRouter.use(requireOwner); // every /admin/* route requires the OWNER role

/* ---- Posts ---- */
const postBody = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(3000),
  category: z.string().trim().min(2).max(40),
  type: z.enum(POST_TYPES as [string, ...string[]]).default('NEW_ARRIVAL'),
  price: z.coerce.number().positive().optional().nullable(),
  priceLabel: z.string().max(20).optional().nullable(),
  priceUnit: z.string().max(20).optional().nullable(),
  pinned: z.coerce.boolean().default(false),
  notifyMembers: z.coerce.boolean().default(false),
  keepImageIds: z.string().optional(),
});

adminRouter.get('/posts', asyncH(async (_req, res) => {
  const rows = await prisma.post.findMany({
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    include: { images: { orderBy: { order: 'asc' } }, _count: { select: { likes: true, comments: true } } },
  });
  res.json(rows.map((p) => ({ ...p, price: p.price ? Number(p.price) : null })));
}));

adminRouter.post('/posts', upload.array('images', 5), validate(postBody), asyncH(async (req, res) => {
  const b = req.body as z.infer<typeof postBody>;
  const urls = await processImages((req.files as Express.Multer.File[]) ?? []);
  const post = await prisma.post.create({
    data: {
      authorId: req.user!.id, title: b.title, description: b.description, category: b.category, type: b.type as never,
      price: b.price ?? null, priceLabel: b.price ? b.priceLabel || 'from' : null, priceUnit: b.priceUnit ?? null, pinned: b.pinned,
      images: { create: urls.map((url, i) => ({ url, alt: b.title, order: i })) },
    },
  });
  if (b.notifyMembers)
    await notifyAllCustomers('NEW_POST', b.type === 'OFFER' ? `New offer: ${b.title}` : `New post: ${b.title}`, b.description.slice(0, 100), `/post/${post.id}`);
  await audit(req.user!.id, 'POST_CREATED', 'Post', post.id, undefined, req.ip);
  res.status(201).json(await getPost(post.id, req.user!.id));
}));

adminRouter.put('/posts/:id', upload.array('images', 5), validate(postBody.partial()), asyncH(async (req, res) => {
  const b = req.body as Partial<z.infer<typeof postBody>>;
  const existing = await prisma.post.findUnique({ where: { id: req.params.id }, include: { images: true } });
  if (!existing) throw notFound('Post not found');
  const keep = b.keepImageIds !== undefined ? b.keepImageIds.split(',').filter(Boolean) : existing.images.map((i) => i.id);
  const remove = existing.images.filter((i) => !keep.includes(i.id));
  for (const r of remove) await storage.remove(r.url).catch(() => undefined);
  const urls = await processImages((req.files as Express.Multer.File[]) ?? []);
  await prisma.post.update({
    where: { id: existing.id },
    data: {
      title: b.title, description: b.description, category: b.category, type: b.type as never, pinned: b.pinned,
      price: b.price === undefined ? undefined : b.price,
      priceLabel: b.priceLabel === undefined ? undefined : b.priceLabel,
      priceUnit: b.priceUnit === undefined ? undefined : b.priceUnit,
      images: {
        deleteMany: { id: { in: remove.map((r) => r.id) } },
        create: urls.map((url, i) => ({ url, alt: b.title ?? existing.title, order: keep.length + i })),
      },
    },
  });
  await audit(req.user!.id, 'POST_UPDATED', 'Post', existing.id, undefined, req.ip);
  res.json(await getPost(existing.id, req.user!.id));
}));

adminRouter.patch('/posts/:id/pin', asyncH(async (req, res) => {
  const p = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!p) throw notFound('Post not found');
  res.json(await prisma.post.update({ where: { id: p.id }, data: { pinned: !p.pinned }, select: { id: true, pinned: true } }));
}));

adminRouter.delete('/posts/:id', asyncH(async (req, res) => {
  const p = await prisma.post.findUnique({ where: { id: req.params.id }, include: { images: true } });
  if (!p) throw notFound('Post not found');
  for (const i of p.images) await storage.remove(i.url).catch(() => undefined);
  await prisma.post.delete({ where: { id: p.id } });
  await audit(req.user!.id, 'POST_DELETED', 'Post', p.id, undefined, req.ip);
  res.json({ ok: true });
}));

/* ---- Comment moderation ---- */
adminRouter.get('/comments', validate(z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING') }), 'query'), asyncH(async (req, res) => {
  const rows = await prisma.comment.findMany({
    where: { status: (req.query as { status: string }).status as never },
    include: { author: { select: { id: true, name: true, phone: true } }, post: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'desc' }, take: 200,
  });
  res.json(rows);
}));
adminRouter.post('/comments/:id/approve', asyncH(async (req, res) => res.json(await comments.moderate(req.params.id, 'APPROVE', req.user!.id))));
adminRouter.post('/comments/:id/reject', asyncH(async (req, res) => res.json(await comments.moderate(req.params.id, 'REJECT', req.user!.id))));
adminRouter.delete('/comments/:id', asyncH(async (req, res) => res.json(await comments.moderate(req.params.id, 'DELETE', req.user!.id))));
adminRouter.post('/comments/:id/reply', validate(z.object({ body: z.string().trim().min(1).max(600) })), asyncH(async (req, res) =>
  res.json(await comments.reply(req.params.id, req.user!.id, req.body.body))));

/* ---- Customers ---- */
adminRouter.get('/customers', validate(z.object({ q: z.string().optional(), area: z.string().optional(), customerType: z.string().optional() }), 'query'), asyncH(async (req, res) => {
  const { q, area, customerType } = req.query as Record<string, string | undefined>;
  const where: Prisma.UserWhereInput = {
    role: 'CUSTOMER',
    ...(area ? { area: area as never } : {}),
    ...(customerType ? { customerType: customerType as never } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }, { referralCode: { contains: q.toUpperCase() } }] } : {}),
  };
  const rows = await prisma.user.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 500,
    include: {
      _count: { select: { referralsMade: true, rewards: { where: { status: 'AVAILABLE' } } } },
      referredBy: { include: { referrer: { select: { id: true, name: true } } } },
    },
  });
  res.json(rows.map((u) => ({
    id: u.id, name: u.name, phone: u.phone, area: u.area, customerType: u.customerType, referralCode: u.referralCode,
    badges: u.badges, isBlocked: u.isBlocked, createdAt: u.createdAt,
    referrals: u._count.referralsMade, availableRewards: u._count.rewards, referredBy: u.referredBy?.referrer ?? null,
  })));
}));

adminRouter.get('/customers/:id', asyncH(async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      referredBy: { include: { referrer: { select: { id: true, name: true, phone: true } } } },
      auditLogs: { take: 20, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!u) throw notFound('Customer not found');
  const summary = await referralSummary(u.id);
  const level1 = await prisma.referral.findMany({ where: { referrerId: u.id }, include: { referee: { select: { id: true, name: true, area: true } } } });
  const level2 = await prisma.referral.findMany({ where: { referrerId: { in: level1.map((r) => r.refereeId) } }, include: { referee: { select: { id: true, name: true, area: true } } } });
  const tree = level1.map((r) => ({
    ...r.referee, status: r.status,
    children: level2.filter((c) => c.referrerId === r.refereeId).map((c) => ({ ...c.referee, status: c.status })),
  }));
  res.json({
    user: {
      id: u.id, name: u.name, phone: u.phone, area: u.area, customerType: u.customerType, referralCode: u.referralCode,
      badges: u.badges, isBlocked: u.isBlocked, createdAt: u.createdAt,
      referredBy: u.referredBy ? { ...u.referredBy.referrer, referralId: u.referredBy.id, status: u.referredBy.status } : null,
    },
    ...summary, tree, auditLog: u.auditLogs,
  });
}));

adminRouter.patch('/customers/:id/block', asyncH(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!u || u.role === 'OWNER') throw notFound('Customer not found');
  const upd = await prisma.user.update({ where: { id: u.id }, data: { isBlocked: !u.isBlocked }, select: { id: true, isBlocked: true } });
  await audit(req.user!.id, upd.isBlocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED', 'User', u.id, undefined, req.ip);
  res.json(upd);
}));

/* ---- Referrals & purchases ---- */
adminRouter.get('/referrals', validate(z.object({ status: z.string().optional() }), 'query'), asyncH(async (req, res) => {
  const status = (req.query as { status?: string }).status;
  const rows = await prisma.referral.findMany({
    where: status ? { status: status as never } : {},
    include: {
      referrer: { select: { id: true, name: true, phone: true } },
      referee: { select: { id: true, name: true, phone: true, area: true } },
      purchase: true,
    },
    orderBy: { createdAt: 'desc' }, take: 500,
  });
  res.json(rows.map((r) => ({ ...r, purchase: r.purchase ? { ...r.purchase, amount: Number(r.purchase.amount) } : null })));
}));

adminRouter.post('/referrals/:id/confirm-purchase',
  validate(z.object({ invoiceNo: z.string().trim().min(2).max(40), amount: z.coerce.number().positive() })),
  asyncH(async (req, res) => { res.json(await confirmPurchase(req.params.id, req.body.invoiceNo, req.body.amount, req.user!.id, req.ip)); }));

adminRouter.post('/referrals/:id/unflag', asyncH(async (req, res) => {
  const r = await prisma.referral.update({ where: { id: req.params.id }, data: { status: 'JOINED', flagReason: null } });
  await audit(req.user!.id, 'REFERRAL_UNFLAGGED', 'Referral', r.id, undefined, req.ip);
  res.json(r);
}));

/* ---- Rewards ---- */
adminRouter.get('/rewards', validate(z.object({ status: z.enum(['AVAILABLE', 'USED', 'EXPIRED']).optional() }), 'query'), asyncH(async (req, res) => {
  const status = (req.query as { status?: string }).status;
  const rows = await prisma.reward.findMany({
    where: status ? { status: status as never } : {},
    include: { user: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: 'desc' }, take: 500,
  });
  res.json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
}));

adminRouter.post('/rewards/:id/use', validate(z.object({ invoiceNo: z.string().trim().min(2).max(40) })), asyncH(async (req, res) => {
  const r = await markRewardUsed(req.params.id, req.body.invoiceNo, req.user!.id, req.ip);
  res.json({ ...r, amount: Number(r.amount) });
}));

adminRouter.post('/rewards/housekeeping', asyncH(async (_req, res) => res.json(await runRewardHousekeeping())));

/* ---- Settings ---- */
const rewardSettingsSchema = z.object({
  welcomeAmount: z.coerce.number().min(0),
  welcomeMinPurchase: z.coerce.number().min(0),
  referrerAmount: z.coerce.number().min(0),
  qualifyingMinPurchase: z.coerce.number().min(0),
  milestones: z.array(z.object({ count: z.coerce.number().int().positive(), bonus: z.coerce.number().min(0), badge: z.string().nullable() })).max(10),
  expiryDays: z.coerce.number().int().min(1).max(730),
  maxBillPercent: z.coerce.number().min(1).max(100),
});
const shopSettingsSchema = z.object({
  name: z.string().min(2), address: z.string().min(5), phone: z.string(), whatsapp: z.string(),
  website: z.string(), mapsUrl: z.string(),
  hours: z.array(z.object({ day: z.string(), open: z.string(), close: z.string(), closed: z.boolean() })).length(7),
});

adminRouter.get('/settings', asyncH(async (_req, res) => res.json({ rewards: await getRewardSettings(), shop: await getShopSettings() })));
adminRouter.put('/settings/rewards', validate(rewardSettingsSchema), asyncH(async (req, res) => {
  await setSetting('rewards', req.body);
  await audit(req.user!.id, 'SETTINGS_REWARDS_UPDATED', 'Setting', 'rewards', req.body, req.ip);
  res.json(req.body);
}));
adminRouter.put('/settings/shop', validate(shopSettingsSchema), asyncH(async (req, res) => {
  await setSetting('shop', req.body);
  await audit(req.user!.id, 'SETTINGS_SHOP_UPDATED', 'Setting', 'shop', undefined, req.ip);
  res.json(req.body);
}));

/* ---- Analytics & exports ---- */
adminRouter.get('/analytics', asyncH(async (_req, res) => res.json(await overview())));
adminRouter.get('/audit', asyncH(async (_req, res) =>
  res.json(await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { actor: { select: { name: true } } } }))));

adminRouter.get('/export/:kind', asyncH(async (req, res) => {
  let rows: Record<string, unknown>[] = [];
  if (req.params.kind === 'customers') {
    rows = (await prisma.user.findMany({ where: { role: 'CUSTOMER' }, orderBy: { createdAt: 'desc' } })).map((u) => ({
      id: u.id, name: u.name, phone: u.phone, area: u.area, customerType: u.customerType,
      referralCode: u.referralCode, badges: u.badges.join('|'), blocked: u.isBlocked, joined: u.createdAt.toISOString(),
    }));
  } else if (req.params.kind === 'referrals') {
    rows = (await prisma.referral.findMany({ include: { referrer: true, referee: true, purchase: true }, orderBy: { createdAt: 'desc' } })).map((r) => ({
      id: r.id, referrer: r.referrer.name, referrerPhone: r.referrer.phone, referee: r.referee.name, refereePhone: r.referee.phone,
      status: r.status, invoice: r.purchase?.invoiceNo ?? '', amount: r.purchase ? Number(r.purchase.amount) : '',
      flag: r.flagReason ?? '', createdAt: r.createdAt.toISOString(),
    }));
  } else if (req.params.kind === 'rewards') {
    rows = (await prisma.reward.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } })).map((r) => ({
      id: r.id, customer: r.user.name, phone: r.user.phone, type: r.type, title: r.title, amount: Number(r.amount),
      status: r.status, expiresAt: r.expiresAt.toISOString(), usedInvoice: r.usedInvoice ?? '',
      usedAt: r.usedAt?.toISOString() ?? '', createdAt: r.createdAt.toISOString(),
    }));
  } else throw notFound('Unknown export type');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.kind}-${Date.now()}.csv"`);
  res.send(toCsv(rows));
}));
