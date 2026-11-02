import type { RewardSettings } from '../../../shared/types.js';

export interface RewardPlan {
  type: 'WELCOME' | 'REFERRER' | 'MILESTONE';
  userId: string; amount: number; title: string; milestone?: number; badge?: string | null;
}

export const isQualifyingPurchase = (amount: number, s: RewardSettings) => amount >= s.qualifyingMinPurchase;
export const expiryDate = (s: RewardSettings, from = new Date()) => new Date(from.getTime() + s.expiryDays * 86400000);
export const isExpired = (expiresAt: Date, now = new Date()) => expiresAt.getTime() <= now.getTime();
export const maxRedeemable = (billAmount: number, s: RewardSettings) => Math.floor((billAmount * s.maxBillPercent) / 100);

/** Validates that a referral may be created. Returns an error key, or null when valid. */
export function validateReferral(opts: {
  referrerId: string | null; refereeId: string; referrerPhone?: string; refereePhone?: string; alreadyReferred: boolean;
}) {
  if (!opts.referrerId) return 'INVALID_CODE';
  if (opts.referrerId === opts.refereeId) return 'SELF_REFERRAL';
  if (opts.referrerPhone && opts.refereePhone && opts.referrerPhone === opts.refereePhone) return 'SELF_REFERRAL';
  if (opts.alreadyReferred) return 'ALREADY_REFERRED';
  return null;
}

/** Milestones newly reached when the successful-referral count becomes `successCount`. */
export function milestonesReached(successCount: number, s: RewardSettings, alreadyAwarded: number[]) {
  return s.milestones.filter((m) => successCount >= m.count && !alreadyAwarded.includes(m.count)).sort((a, b) => a.count - b.count);
}

/** Full set of rewards to create when the owner confirms a referee's first purchase. */
export function planRewardsForPurchase(
  input: { amount: number; referrerId: string; refereeId: string; refereeName: string; successCountAfter: number; awardedMilestones: number[] },
  s: RewardSettings,
): RewardPlan[] {
  if (!isQualifyingPurchase(input.amount, s)) return [];
  const plan: RewardPlan[] = [
    { type: 'WELCOME', userId: input.refereeId, amount: s.welcomeAmount, title: 'Welcome reward' },
    { type: 'REFERRER', userId: input.referrerId, amount: s.referrerAmount, title: `Referral reward: ${input.refereeName}` },
  ];
  for (const m of milestonesReached(input.successCountAfter, s, input.awardedMilestones)) {
    plan.push({ type: 'MILESTONE', userId: input.referrerId, amount: m.bonus, title: `Milestone bonus: ${m.count} referrals`, milestone: m.count, badge: m.badge });
  }
  return plan;
}

export function nextMilestone(successCount: number, s: RewardSettings) {
  const sorted = [...s.milestones].sort((a, b) => a.count - b.count);
  const next = sorted.find((m) => m.count > successCount) ?? null;
  const prev = [...sorted].reverse().find((m) => m.count <= successCount)?.count ?? 0;
  return { next, progress: next ? Math.min(1, (successCount - prev) / (next.count - prev)) : 1 };
}
