import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { useAdmin, useAdminMutation } from './shared';
import { Spinner, ErrorBox, StatusTag, Badge, useToast, Icon, icons } from '@/components/ui';
import { inr, fmtDate } from '@/lib/utils';
import type { RewardDTO, ReferralDTO, RewardSettings } from '@shared/types';

interface Detail {
  user: {
    id: string; name: string; phone: string; area: string | null; customerType: string | null; referralCode: string;
    badges: string[]; isBlocked: boolean; createdAt: string;
    referredBy: { id: string; name: string; phone: string; referralId: string; status: string } | null;
  };
  successCount: number; totalEarned: number; available: number; settings: RewardSettings;
  referrals: ReferralDTO[]; rewards: RewardDTO[];
  tree: { id: string; name: string; area: string | null; status: string; children: { id: string; name: string; status: string }[] }[];
  auditLog: { id: string; action: string; createdAt: string }[];
}

export default function CustomerDetail() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const q = useAdmin<Detail>(`/customers/${id}`);
  const [invoice, setInvoice] = useState<Record<string, string>>({});

  const useReward = useAdminMutation(({ rid, inv }: { rid: string; inv: string }) =>
    api(`/admin/rewards/${rid}/use`, { method: 'POST', json: { invoiceNo: inv } }), ['admin']);
  const block = useAdminMutation(() => api(`/admin/customers/${id}/block`, { method: 'PATCH' }), ['admin']);

  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) return <ErrorBox retry={() => void q.refetch()} />;
  const d = q.data;

  return (
    <div className="space-y-4">
      <Link to="/admin/customers" className="btn-ghost -ml-3"><Icon d={icons.chevL} />{t('admin.customers')}</Link>

      <section className="card p-4">
        <h1 className="text-2xl">{d.user.name}</h1>
        <p className="text-teak">{d.user.phone} · {d.user.area ? t(`areas.${d.user.area}`) : '—'} · {d.user.customerType ? t(`ctypes.${d.user.customerType}`) : '—'}</p>
        <p className="text-sm mt-1">{t('refer.yourCode')}: <b>{d.user.referralCode}</b> · {t('profile.member', { date: fmtDate(d.user.createdAt, i18n.language) })}</p>
        {d.user.badges.length > 0 && <div className="flex gap-2 mt-2">{d.user.badges.map((b) => <Badge key={b} kind={b} />)}</div>}
        {d.user.referredBy && (
          <p className="text-sm mt-2">
            {t('admin.referredBy')}: <Link className="underline" to={`/admin/customers/${d.user.referredBy.id}`}>{d.user.referredBy.name}</Link>{' '}
            <StatusTag s={d.user.referredBy.status} />
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="card p-2"><p className="text-xs text-teak">{t('refer.successful')}</p><p className="font-bold">{d.successCount}</p></div>
          <div className="card p-2"><p className="text-xs text-teak">{t('refer.totalEarned')}</p><p className="font-bold">{inr(d.totalEarned)}</p></div>
          <div className="card p-2 border-brass"><p className="text-xs text-teak">{t('refer.available')}</p><p className="font-bold text-brass">{inr(d.available)}</p></div>
        </div>
        <button className="btn-outline mt-3 w-full" onClick={() => block.mutate(undefined, { onSuccess: () => toast('✓') })}>
          {d.user.isBlocked ? t('admin.unblock') : t('admin.block')}
        </button>
      </section>

      <section className="card p-4">
        <h2 className="text-lg mb-2">{t('refer.rewards')}</h2>
        <ul className="divide-y divide-sawdust dark:divide-walnut">
          {d.rewards.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.title} <span className="text-teak text-sm">({t(`rewardTypes.${r.type}`)})</span></p>
                  <p className="text-sm text-teak">
                    {r.status === 'USED' ? t('refer.usedOn', { inv: r.usedInvoice }) : t('refer.expires', { date: fmtDate(r.expiresAt, i18n.language) })}
                  </p>
                </div>
                <div className="text-right"><p className="font-bold">{inr(r.amount)}</p><StatusTag s={r.status} /></div>
              </div>
              {r.status === 'AVAILABLE' && (
                <form className="flex gap-2 mt-2" onSubmit={(e) => {
                  e.preventDefault();
                  useReward.mutate({ rid: r.id, inv: invoice[r.id] ?? '' }, { onSuccess: () => toast('✓'), onError: (err) => toast(err.message) });
                }}>
                  <input className="input" placeholder={t('admin.invoice')} required minLength={2} value={invoice[r.id] ?? ''}
                    onChange={(e) => setInvoice({ ...invoice, [r.id]: e.target.value })} aria-label={t('admin.invoice')} />
                  <button className="btn-gold whitespace-nowrap">{t('admin.markUsed')}</button>
                </form>
              )}
            </li>
          ))}
          {!d.rewards.length && <p className="text-teak">{t('refer.noRewards')}</p>}
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="text-lg mb-2">{t('admin.tree')}</h2>
        {!d.tree.length ? <p className="text-teak">{t('refer.noReferrals')}</p> : (
          <ul className="space-y-1">
            {d.tree.map((n) => (
              <li key={n.id}>
                <Link className="underline" to={`/admin/customers/${n.id}`}>{n.name}</Link> <StatusTag s={n.status} />
                {!!n.children.length && (
                  <ul className="ml-5 mt-1 border-l-2 border-sawdust pl-3 space-y-1">
                    {n.children.map((c) => <li key={c.id}><Link className="underline" to={`/admin/customers/${c.id}`}>{c.name}</Link> <StatusTag s={c.status} /></li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h2 className="text-lg mb-2">{t('admin.referrals')}</h2>
        <ul className="divide-y divide-sawdust dark:divide-walnut">
          {d.referrals.map((r) => (
            <li key={r.id} className="py-2 flex justify-between gap-2">
              <span>{r.referee.name} <span className="text-sm text-teak">{fmtDate(r.createdAt, i18n.language)}</span></span>
              <span>{r.purchase && <span className="text-sm text-teak mr-2">{r.purchase.invoiceNo} · {inr(r.purchase.amount)}</span>}<StatusTag s={r.status} /></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="text-lg mb-2">Audit log</h2>
        <ul className="text-sm space-y-1">
          {d.auditLog.map((a) => <li key={a.id}>{fmtDate(a.createdAt, i18n.language)} — {a.action}</li>)}
        </ul>
      </section>
    </div>
  );
}
