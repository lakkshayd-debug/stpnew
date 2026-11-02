import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { qk } from '@/api/hooks';
import { useAuth } from '@/lib/auth';
import { Icon, icons, Spinner, Empty, Badge, StatusTag, useToast } from '@/components/ui';
import { inr, copy, fmtDate } from '@/lib/utils';
import type { RewardSettings, RewardDTO, ReferralDTO } from '@shared/types';

interface Summary {
  code: string; link: string; badges: string[]; successCount: number; totalEarned: number; available: number;
  milestone: { next: { count: number; bonus: number; badge: string | null } | null; progress: number };
  settings: RewardSettings; referrals: ReferralDTO[]; rewards: RewardDTO[];
}

export default function Refer() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const toast = useToast();
  const q = useQuery({ queryKey: qk.refer, queryFn: () => api<Summary>('/referrals'), enabled: !!user });

  if (loading || (user && q.isLoading)) return <Spinner />;
  if (!user) return <Empty text={t('refer.loginPrompt')} icon={icons.gift} action={<Link to="/join" className="btn-primary">{t('nav.login')}</Link>} />;
  if (!q.data) return null;

  const d = q.data;
  const s = d.settings;
  const waMsg = t('refer.waMessage', { code: d.code, welcome: s.welcomeAmount, min: s.welcomeMinPurchase.toLocaleString('en-IN'), link: d.link });
  const remaining = d.milestone.next ? d.milestone.next.count - d.successCount : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t('refer.title')}</h1>

      <section className="rounded-2xl p-5 text-cream shadow-lift relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#4A2F1B,#2B1A0E)' }} aria-label={t('refer.wallet')}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brass/20" aria-hidden="true" />
        <p className="text-sm uppercase tracking-wider text-brass font-semibold">{t('refer.wallet')}</p>
        <p className="text-4xl font-serif font-black mt-1 text-brass">{inr(d.available)}</p>
        <p className="text-sm text-cream/80">{t('refer.available')}</p>

        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div className="bg-white/10 rounded-xl p-3"><p className="text-cream/70">{t('refer.totalEarned')}</p><p className="text-lg font-bold">{inr(d.totalEarned)}</p></div>
          <div className="bg-white/10 rounded-xl p-3"><p className="text-cream/70">{t('refer.successful')}</p><p className="text-lg font-bold">{d.successCount}</p></div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>{d.milestone.next ? t('refer.nextMilestone', { count: remaining, bonus: d.milestone.next.bonus }) : t('refer.allMilestones')}</span>
            <span className="text-brass font-bold">{d.successCount}/{d.milestone.next?.count ?? d.successCount}</span>
          </div>
          <div className="h-3 bg-white/15 rounded-full overflow-hidden" role="progressbar"
            aria-valuenow={Math.round(d.milestone.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-gradient-to-r from-brass to-yellow-300 rounded-full transition-all" style={{ width: `${d.milestone.progress * 100}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {s.milestones.map((m) => (
            <span key={m.count} className={`tag inline-flex items-center gap-1 ${d.successCount >= m.count ? 'bg-brass text-walnut' : 'bg-white/10 text-cream/70'}`}>
              <Icon d={icons.star} className="w-3 h-3" filled={d.successCount >= m.count} />
              {m.count} = +₹{m.bonus}{m.badge ? ` · ${t(`badge.${m.badge}`)}` : ''}
            </span>
          ))}
        </div>
        {d.badges.length > 0 && <div className="flex gap-2 mt-3">{d.badges.map((b) => <Badge key={b} kind={b} />)}</div>}
      </section>

      <section className="card p-4">
        <p className="label">{t('refer.yourCode')}</p>
        <div className="flex gap-2 items-center">
          <code className="flex-1 text-2xl font-bold tracking-wider bg-cream dark:bg-walnut/40 rounded-xl px-3 py-2 border border-dashed border-brass">{d.code}</code>
          <button className="btn-outline" onClick={async () => { await copy(d.code); toast(t('post.copied')); }} aria-label={t('refer.copyCode')}><Icon d={icons.copy} /></button>
        </div>
        <p className="text-sm mt-2 break-all text-teak dark:text-sawdust">{d.link}</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="btn-outline" onClick={async () => { await copy(d.link); toast(t('post.copied')); }}><Icon d={icons.copy} />{t('refer.copyLink')}</button>
          <a className="btn-green" href={`https://wa.me/?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noreferrer"><Icon d={icons.wa} />{t('refer.shareWa')}</a>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="text-lg mb-2">{t('refer.howItWorks')}</h2>
        <ol className="list-decimal ml-5 space-y-1">
          <li>{t('refer.step1')}</li>
          <li>{t('refer.step2', { min: s.welcomeMinPurchase.toLocaleString('en-IN') })}</li>
          <li>{t('refer.step3', { welcome: s.welcomeAmount, referrer: s.referrerAmount })}</li>
        </ol>
        <p className="text-sm text-teak dark:text-sawdust mt-2">{t('refer.rules', { days: s.expiryDays, pct: s.maxBillPercent })}</p>
      </section>

      <section className="card p-4">
        <h2 className="text-lg mb-2">{t('refer.rewards')}</h2>
        {!d.rewards.length ? <p className="text-teak dark:text-sawdust">{t('refer.noRewards')}</p> : (
          <ul className="divide-y divide-sawdust dark:divide-walnut">
            {d.rewards.map((r) => (
              <li key={r.id} className="py-3 flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{r.type === 'MILESTONE' ? '🏆' : '🎁'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-teak dark:text-sawdust">
                    {r.status === 'USED' && r.usedInvoice ? t('refer.usedOn', { inv: r.usedInvoice }) : t('refer.expires', { date: fmtDate(r.expiresAt, i18n.language) })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${r.status === 'AVAILABLE' ? 'text-brass' : ''}`}>{inr(r.amount)}</p>
                  <StatusTag s={r.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h2 className="text-lg mb-2">{t('refer.referrals')}</h2>
        {!d.referrals.length ? <p className="text-teak dark:text-sawdust">{t('refer.noReferrals')}</p> : (
          <ul className="divide-y divide-sawdust dark:divide-walnut">
            {d.referrals.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.referee.name}</p>
                  <p className="text-sm text-teak dark:text-sawdust">{r.referee.area ? t(`areas.${r.referee.area}`) : ''} · {fmtDate(r.createdAt, i18n.language)}</p>
                </div>
                <StatusTag s={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
