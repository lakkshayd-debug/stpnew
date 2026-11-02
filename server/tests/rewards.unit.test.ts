import { describe, it, expect } from 'vitest';
import {
  planRewardsForPurchase, validateReferral, isQualifyingPurchase, expiryDate, isExpired,
  milestonesReached, maxRedeemable, nextMilestone,
} from '../src/domain/rewards.js';
import { DEFAULT_REWARD_SETTINGS as S } from '../src/domain/defaults.js';

describe('referral validation (fraud rules)', () => {
  it('blocks self-referral by id and by phone', () => {
    expect(validateReferral({ referrerId: 'u1', refereeId: 'u1', alreadyReferred: false })).toBe('SELF_REFERRAL');
    expect(validateReferral({ referrerId: 'u1', refereeId: 'u2', referrerPhone: '+919000000001', refereePhone: '+919000000001', alreadyReferred: false })).toBe('SELF_REFERRAL');
  });
  it('blocks an unknown code and a second referrer', () => {
    expect(validateReferral({ referrerId: null, refereeId: 'u2', alreadyReferred: false })).toBe('INVALID_CODE');
    expect(validateReferral({ referrerId: 'u1', refereeId: 'u2', alreadyReferred: true })).toBe('ALREADY_REFERRED');
  });
  it('accepts a valid referral', () => {
    expect(validateReferral({ referrerId: 'u1', refereeId: 'u2', alreadyReferred: false })).toBeNull();
  });
});

describe('qualifying purchase and reward creation', () => {
  const base = { referrerId: 'ref', refereeId: 'new', refereeName: 'Kavitha', awardedMilestones: [] as number[] };

  it('creates no rewards below the minimum purchase', () => {
    expect(isQualifyingPurchase(4999, S)).toBe(false);
    expect(planRewardsForPurchase({ ...base, amount: 4999, successCountAfter: 1 }, S)).toEqual([]);
  });

  it('creates welcome + referrer rewards on a qualifying purchase', () => {
    const plan = planRewardsForPurchase({ ...base, amount: 5000, successCountAfter: 1 }, S);
    expect(plan).toHaveLength(2);
    expect(plan.find((p) => p.type === 'WELCOME')).toMatchObject({ userId: 'new', amount: 250 });
    expect(plan.find((p) => p.type === 'REFERRER')).toMatchObject({ userId: 'ref', amount: 400 });
  });

  it('adds milestone bonuses at 3, 5 (Silver) and 10 (Gold), only once each', () => {
    const at3 = planRewardsForPurchase({ ...base, amount: 9000, successCountAfter: 3 }, S);
    expect(at3.find((p) => p.type === 'MILESTONE')).toMatchObject({ amount: 300, milestone: 3, badge: null });

    const at5 = planRewardsForPurchase({ ...base, amount: 9000, successCountAfter: 5, awardedMilestones: [3] }, S);
    expect(at5.filter((p) => p.type === 'MILESTONE')).toEqual([expect.objectContaining({ amount: 600, milestone: 5, badge: 'SILVER' })]);

    const at10 = planRewardsForPurchase({ ...base, amount: 9000, successCountAfter: 10, awardedMilestones: [3, 5] }, S);
    expect(at10.find((p) => p.milestone === 10)).toMatchObject({ amount: 1500, badge: 'GOLD' });

    expect(milestonesReached(4, S, [3])).toEqual([]);
    expect(milestonesReached(5, S, []).map((m) => m.count)).toEqual([3, 5]);
  });

  it('expires after 90 days and caps credit at 10% of the bill', () => {
    const from = new Date('2024-01-01T00:00:00Z');
    const exp = expiryDate(S, from);
    expect((exp.getTime() - from.getTime()) / 86400000).toBe(90);
    expect(isExpired(exp, new Date('2024-03-30T00:00:00Z'))).toBe(false);
    expect(isExpired(exp, new Date('2024-04-01T00:00:00Z'))).toBe(true);
    expect(maxRedeemable(12000, S)).toBe(1200);
  });

  it('computes progress to the next milestone', () => {
    expect(nextMilestone(1, S)).toEqual({ next: S.milestones[0], progress: 1 / 3 });
    expect(nextMilestone(4, S).next?.count).toBe(5);
    expect(nextMilestone(10, S).next).toBeNull();
  });
});
