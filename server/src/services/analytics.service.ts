import { prisma } from '../lib/prisma.js';

export async function overview() {
  const [members, referrals, rewarded, pendingComments, liability, perMonth, topReferrers, topPosts, shares, used, expired] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.referral.count(),
    prisma.referral.count({ where: { status: 'REWARDED' } }),
    prisma.comment.count({ where: { status: 'PENDING' } }),
    prisma.reward.aggregate({ _sum: { amount: true }, where: { status: 'AVAILABLE' } }),
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, COUNT(*) AS count
      FROM "Referral" WHERE "createdAt" > now() - interval '12 months' GROUP BY 1 ORDER BY 1`,
    prisma.referral.groupBy({ by: ['referrerId'], where: { status: 'REWARDED' }, _count: { _all: true }, orderBy: { _count: { referrerId: 'desc' } }, take: 5 }),
    prisma.post.findMany({ select: { id: true, title: true, shareCount: true, _count: { select: { likes: true } } }, orderBy: { likes: { _count: 'desc' } }, take: 5 }),
    prisma.post.aggregate({ _sum: { shareCount: true } }),
    prisma.reward.aggregate({ _sum: { amount: true }, _count: { _all: true }, where: { status: 'USED' } }),
    prisma.reward.aggregate({ _sum: { amount: true }, _count: { _all: true }, where: { status: 'EXPIRED' } }),
  ]);

  const names = await prisma.user.findMany({ where: { id: { in: topReferrers.map((t) => t.referrerId) } }, select: { id: true, name: true, area: true } });

  return {
    members, referrals, rewarded, pendingComments, shares: shares._sum.shareCount ?? 0,
    rewardLiability: Number(liability._sum.amount ?? 0),
    rewardsUsed: { count: used._count._all, amount: Number(used._sum.amount ?? 0) },
    rewardsExpired: { count: expired._count._all, amount: Number(expired._sum.amount ?? 0) },
    referralsPerMonth: perMonth.map((m) => ({ month: m.month, count: Number(m.count) })),
    topReferrers: topReferrers.map((t) => ({ ...names.find((n) => n.id === t.referrerId), count: t._count._all })),
    topPosts: topPosts.map((p) => ({ id: p.id, title: p.title, likes: p._count.likes, shares: p.shareCount })),
  };
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}
