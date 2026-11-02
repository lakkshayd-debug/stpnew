import { prisma } from '../lib/prisma.js';
import { badRequest, notFound } from '../lib/errors.js';
import { audit, notify } from './notification.service.js';

/** Owner redeems a reward in the shop against an invoice number. */
export async function markRewardUsed(rewardId: string, invoiceNo: string, ownerId: string, ip?: string) {
  const r = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!r) throw notFound('Reward not found');
  if (r.status !== 'AVAILABLE') throw badRequest(`This reward is already ${r.status.toLowerCase()}`);
  if (r.expiresAt < new Date()) {
    await prisma.reward.update({ where: { id: rewardId }, data: { status: 'EXPIRED' } });
    throw badRequest('This reward has expired');
  }
  const updated = await prisma.reward.update({ where: { id: rewardId }, data: { status: 'USED', usedInvoice: invoiceNo, usedAt: new Date() } });
  await audit(ownerId, 'REWARD_USED', 'Reward', rewardId, { invoiceNo, amount: Number(r.amount) }, ip);
  return updated;
}

/** Expires overdue rewards and warns about rewards expiring within 7 days. */
export async function runRewardHousekeeping() {
  const now = new Date();
  const expired = await prisma.reward.findMany({ where: { status: 'AVAILABLE', expiresAt: { lte: now } } });
  if (expired.length) {
    await prisma.reward.updateMany({ where: { id: { in: expired.map((e) => e.id) } }, data: { status: 'EXPIRED' } });
    for (const e of expired) await audit(null, 'REWARD_EXPIRED', 'Reward', e.id, { amount: Number(e.amount) });
  }
  const soon = await prisma.reward.findMany({ where: { status: 'AVAILABLE', expiresAt: { gt: now, lte: new Date(now.getTime() + 7 * 86400000) } } });
  for (const r of soon) {
    const already = await prisma.notification.findFirst({ where: { userId: r.userId, type: 'REWARD_EXPIRING', body: { contains: r.id } } });
    if (!already) await notify(r.userId, 'REWARD_EXPIRING', `Rs.${Number(r.amount)} reward expiring soon`, `Use it before ${r.expiresAt.toDateString()}. (ref ${r.id})`, '/refer');
  }
  return { expired: expired.length, expiringSoon: soon.length };
}
