import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { validateReferral, planRewardsForPurchase, expiryDate, nextMilestone } from '../domain/rewards.js';
import { getRewardSettings } from './settings.service.js';
import { notify, audit } from './notification.service.js';
import type { User } from '@prisma/client';

/** Creates the referral link at signup. Suspicious IP/device repeats are FLAGGED for owner review. */
export async function createReferral(code: string, referee: User, ip?: string, deviceId?: string | null) {
  const referrer = await prisma.user.findUnique({ where: { referralCode: code.trim().toUpperCase() } });
  const existing = await prisma.referral.findUnique({ where: { refereeId: referee.id } });
  const err = validateReferral({
    referrerId: referrer?.id ?? null, refereeId: referee.id,
    referrerPhone: referrer?.phone, refereePhone: referee.phone, alreadyReferred: !!existing,
  });
  if (err === 'INVALID_CODE') throw badRequest('Invalid referral code');
  if (err === 'SELF_REFERRAL') throw badRequest('You cannot refer yourself');
  if (err === 'ALREADY_REFERRED') throw conflict('You already have a referrer');

  const flags: string[] = [];
  if (ip) {
    const sameIp = await prisma.referral.count({ where: { referrerId: referrer!.id, referee: { signupIp: ip } } });
    if (sameIp >= env.REFERRAL_IP_THRESHOLD) flags.push(`IP ${ip} used ${sameIp + 1} times by this referrer`);
  }
  if (deviceId) {
    const sameDevice = await prisma.referral.count({ where: { referrerId: referrer!.id, referee: { deviceId } } });
    if (sameDevice >= 1) flags.push(`Device ${deviceId.slice(0, 8)} already used for this referrer`);
    if (referrer!.deviceId && referrer!.deviceId === deviceId) flags.push('Signed up on the same device as the referrer');
  }

  const ref = await prisma.referral.create({
    data: { referrerId: referrer!.id, refereeId: referee.id, status: flags.length ? 'FLAGGED' : 'JOINED', flagReason: flags.join('; ') || null },
  });
  const s = await getRewardSettings();
  await notify(referrer!.id, 'REFERRAL_JOINED', `${referee.name} joined with your code`,
    `You will earn Rs.${s.referrerAmount} once they make their first purchase of Rs.${s.qualifyingMinPurchase} or more.`, '/refer');
  await audit(referee.id, 'REFERRAL_CREATED', 'Referral', ref.id, { referrerId: referrer!.id, flags }, ip);
  return ref;
}

/** Owner confirms the referee's first purchase. Creates all rewards atomically when it qualifies. */
export async function confirmPurchase(referralId: string, invoiceNo: string, amount: number, ownerId: string, ip?: string) {
  const s = await getRewardSettings();
  const ref = await prisma.referral.findUnique({ where: { id: referralId }, include: { referee: true, referrer: true, purchase: true } });
  if (!ref) throw notFound('Referral not found');
  if (ref.purchase) throw conflict('A purchase is already confirmed for this referral');
  if (await prisma.purchaseConfirmation.findUnique({ where: { invoiceNo } })) throw conflict('This invoice number is already used');

  return prisma.$transaction(async (tx) => {
    const qualifying = amount >= s.qualifyingMinPurchase;
    await tx.purchaseConfirmation.create({
      data: { referralId, customerId: ref.refereeId, invoiceNo, amount, qualifying, confirmedBy: ownerId },
    });

    if (!qualifying) {
      await tx.referral.update({ where: { id: referralId }, data: { status: 'PURCHASED' } });
      await tx.auditLog.create({ data: { actorId: ownerId, action: 'PURCHASE_CONFIRMED_NOT_QUALIFYING', entity: 'Referral', entityId: referralId, meta: { invoiceNo, amount }, ip } });
      return { qualifying: false, rewards: [] as string[] };
    }

    const successCountAfter = (await tx.referral.count({ where: { referrerId: ref.referrerId, status: 'REWARDED' } })) + 1;
    const awarded = (await tx.reward.findMany({ where: { userId: ref.referrerId, type: 'MILESTONE' }, select: { milestone: true } }))
      .map((r) => r.milestone).filter((m): m is number => m !== null);

    const plan = planRewardsForPurchase(
      { amount, referrerId: ref.referrerId, refereeId: ref.refereeId, refereeName: ref.referee.name, successCountAfter, awardedMilestones: awarded }, s);

    const created: string[] = [];
    for (const p of plan) {
      const r = await tx.reward.create({
        data: { userId: p.userId, type: p.type, title: p.title, amount: p.amount, expiresAt: expiryDate(s), sourceRefId: referralId, milestone: p.milestone ?? null },
      });
      created.push(r.id);
      if (p.badge) {
        const u = await tx.user.findUniqueOrThrow({ where: { id: p.userId }, select: { badges: true } });
        if (!u.badges.includes(p.badge)) await tx.user.update({ where: { id: p.userId }, data: { badges: { push: p.badge } } });
      }
      await tx.notification.create({
        data: { userId: p.userId, type: 'REWARD_EARNED', title: `You earned Rs.${p.amount}`, body: `${p.title}. Use it at the store within ${s.expiryDays} days.`, link: '/refer' },
      });
      await tx.auditLog.create({ data: { actorId: ownerId, action: 'REWARD_CREATED', entity: 'Reward', entityId: r.id, meta: { ...p, invoiceNo }, ip } });
    }

    await tx.referral.update({ where: { id: referralId }, data: { status: 'REWARDED' } });
    await tx.auditLog.create({ data: { actorId: ownerId, action: 'PURCHASE_CONFIRMED', entity: 'Referral', entityId: referralId, meta: { invoiceNo, amount }, ip } });
    return { qualifying: true, rewards: created };
  });
}

/** Everything the customer referral page (and the owner customer page) needs. */
export async function referralSummary(userId: string) {
  const s = await getRewardSettings();
  const [referrals, rewards, user] = await Promise.all([
    prisma.referral.findMany({ where: { referrerId: userId }, include: { referee: { select: { id: true, name: true, area: true } }, purchase: true }, orderBy: { createdAt: 'desc' } }),
    prisma.reward.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { referralCode: true, badges: true } }),
  ]);
  const successCount = referrals.filter((r) => r.status === 'REWARDED').length;
  const totalEarned = rewards.filter((r) => r.status !== 'EXPIRED').reduce((a, r) => a + Number(r.amount), 0);
  const available = rewards.filter((r) => r.status === 'AVAILABLE').reduce((a, r) => a + Number(r.amount), 0);
  return {
    code: user.referralCode, link: `${env.CLIENT_URL}/join?ref=${user.referralCode}`, badges: user.badges,
    successCount, totalEarned, available, milestone: nextMilestone(successCount, s), settings: s,
    referrals: referrals.map((r) => ({
      id: r.id, status: r.status, createdAt: r.createdAt, referee: r.referee,
      purchase: r.purchase ? { invoiceNo: r.purchase.invoiceNo, amount: Number(r.purchase.amount), confirmedAt: r.purchase.confirmedAt } : null,
    })),
    rewards: rewards.map((r) => ({ ...r, amount: Number(r.amount) })),
  };
}
