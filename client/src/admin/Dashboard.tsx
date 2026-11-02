import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAdmin, Stat } from './shared';
import { Spinner, ErrorBox } from '@/components/ui';
import { inr } from '@/lib/utils';
import { apiBase } from '@/api/client';

interface Analytics {
  members: number; referrals: number; rewarded: number; pendingComments: number; shares: number; rewardLiability: number;
  rewardsUsed: { count: number; amount: number }; rewardsExpired: { count: number; amount: number };
  referralsPerMonth: { month: string; count: number }[];
  topReferrers: { id?: string; name?: string; area?: string | null; count: number }[];
  topPosts: { id: string; title: string; likes: number; shares: number }[];
}

export default function Dashboard() {
  const { t } = useTranslation();
  const q = useAdmin<Analytics>('/analytics');
  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) return <ErrorBox retry={() => void q.refetch()} />;
  const a = q.data;
  const max = Math.max(1, ...a.referralsPerMonth.map((m) => m.count));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t('admin.dashboard')}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t('admin.members')} value={a.members} />
        <Stat label={t('admin.totalReferrals')} value={`${a.referrals} (${a.rewarded} ${t('admin.rewarded')})`} />
        <Link to="/admin/moderation"><Stat label={t('admin.pendingComments')} value={a.pendingComments} /></Link>
        <Stat label={t('admin.liability')} value={inr(a.rewardLiability)} gold />
        <Stat label={t('admin.shares')} value={a.shares} />
        <Stat label={`${t('status.USED')} (${a.rewardsUsed.count})`} value={inr(a.rewardsUsed.amount)} />
        <Stat label={`${t('status.EXPIRED')} (${a.rewardsExpired.count})`} value={inr(a.rewardsExpired.amount)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-4">
          <h2 className="text-lg mb-3">{t('admin.perMonth')}</h2>
          {!a.referralsPerMonth.length ? <p className="text-teak">—</p> : (
            <div className="flex items-end gap-2 h-40">
              {a.referralsPerMonth.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 text-xs">
                  <span>{m.count}</span>
                  <div className="w-full bg-teak rounded-t" style={{ height: `${(m.count / max) * 100}%` }} title={`${m.month}: ${m.count}`} />
                  <span>{m.month.slice(2)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-4">
          <h2 className="text-lg mb-3">{t('admin.topReferrers')}</h2>
          <ol className="list-decimal ml-5 space-y-1">
            {a.topReferrers.map((r) => <li key={r.id ?? r.name}><Link className="underline" to={`/admin/customers/${r.id}`}>{r.name}</Link> — {r.count}</li>)}
          </ol>
        </section>

        <section className="card p-4 md:col-span-2">
          <h2 className="text-lg mb-3">{t('admin.topPosts')}</h2>
          <ul className="space-y-1">
            {a.topPosts.map((p) => (
              <li key={p.id} className="flex justify-between gap-2">
                <Link className="underline truncate" to={`/post/${p.id}`}>{p.title}</Link>
                <span className="shrink-0">❤️ {p.likes} · ↗ {p.shares}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-4">
        <h2 className="text-lg mb-2">{t('admin.exports')}</h2>
        <div className="flex flex-wrap gap-2">
          {(['customers', 'referrals', 'rewards'] as const).map((k) => (
            <a key={k} className="btn-outline" href={`${apiBase}/admin/export/${k}`}>{t('admin.exportCsv')}: {t(`admin.${k}`)}</a>
          ))}
        </div>
      </section>
    </div>
  );
}
