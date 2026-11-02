import { resolveFakeOtp, fakeOtpFor, isOwnerPhone } from '../server/src/domain/otp.js';
import { planRewardsForPurchase, nextMilestone, expiryDate, isExpired, maxRedeemable, validateReferral } from '../server/src/domain/rewards.js';
import { DEFAULT_REWARD_SETTINGS as S } from '../server/src/domain/defaults.js';
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean) => { cond ? pass++ : fail++; console.log(`${cond ? '  ✅' : '  ❌'} ${name}`); };

console.log('\nOTP (your number = owner):');
for (const p of ['6385340555', '+916385340555', '916385340555', '06385340555', '63853 40555'])
  ok(`owner "${p}" -> 782751`, fakeOtpFor(p) === '782751');
for (const p of ['9000000001', '+919876543210', '7012345678'])
  ok(`customer "${p}" -> 123455`, fakeOtpFor(p) === '123455');
ok('owner detected in any format', isOwnerPhone('6385340555') && isOwnerPhone('+916385340555') && !isOwnerPhone('9876543210'));
ok('real mode -> random SMS code', resolveFakeOtp('6385340555', { mode: 'real', ownerPhone: '+916385340555', ownerOtp: '782751', customerOtp: '123455' }) === null);

console.log('\nReferrals & rewards:');
const base = { referrerId: 'ref', refereeId: 'new', refereeName: 'Kavitha', awardedMilestones: [] as number[] };
ok('below Rs.5000 -> no rewards', planRewardsForPurchase({ ...base, amount: 4999, successCountAfter: 1 }, S).length === 0);
const p1 = planRewardsForPurchase({ ...base, amount: 5000, successCountAfter: 1 }, S);
ok('qualifying -> welcome 250 + referrer 400', p1.length === 2 && p1[0]!.amount === 250 && p1[1]!.amount === 400);
ok('3rd referral -> +300 bonus', planRewardsForPurchase({ ...base, amount: 9000, successCountAfter: 3 }, S).some((r) => r.amount === 300));
ok('5th -> +600 + SILVER', planRewardsForPurchase({ ...base, amount: 9000, successCountAfter: 5, awardedMilestones: [3] }, S).some((r) => r.amount === 600 && r.badge === 'SILVER'));
ok('10th -> +1500 + GOLD', planRewardsForPurchase({ ...base, amount: 9000, successCountAfter: 10, awardedMilestones: [3, 5] }, S).some((r) => r.amount === 1500 && r.badge === 'GOLD'));
ok('no duplicate milestone', !planRewardsForPurchase({ ...base, amount: 9000, successCountAfter: 4, awardedMilestones: [3] }, S).some((r) => r.type === 'MILESTONE'));
ok('self-referral blocked', validateReferral({ referrerId: 'u1', refereeId: 'u1', alreadyReferred: false }) === 'SELF_REFERRAL');
ok('second referrer blocked', validateReferral({ referrerId: 'u1', refereeId: 'u2', alreadyReferred: true }) === 'ALREADY_REFERRED');
const from = new Date('2024-01-01T00:00:00Z');
ok('90-day expiry', (expiryDate(S, from).getTime() - from.getTime()) / 86400000 === 90);
ok('expired after 90 days', isExpired(expiryDate(S, from), new Date('2024-04-02T00:00:00Z')));
ok('10% bill cap', maxRedeemable(12000, S) === 1200);
ok('milestone progress', nextMilestone(1, S).next!.count === 3 && nextMilestone(10, S).next === null);
console.log(`\n${fail === 0 ? '🎉 ALL CHECKS PASSED' : '⚠️ FAILURES'}  (${pass} passed, ${fail} failed)\n`);
process.exit(fail ? 1 : 0);
