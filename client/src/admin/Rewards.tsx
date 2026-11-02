import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api, apiBase } from '@/api/client';
import { useAdmin, useAdminMutation } from './shared';
import { Spinner, Empty, StatusTag, icons, useToast } from '@/components/ui';
import { inr, fmtDate } from '@/lib/utils';

interface R {
  id: string; type: string; title: string; amount: number; status: string; expiresAt: string;
  usedInvoice: string | null; usedAt: string | null; createdAt: string;
  user: { id: string; name: string; phone: string };
}

export default function AdminRewards() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [status, setStatus] = useState('AVAILABLE');
  const q = useAdmin<R[]>(`/rewards${status ? `?status=${status}` : ''}`);
  const [invoice, setInvoice] = useState<Record<string, string>>({});

  const markUsed = useAdminMutation(({ id, inv }: { id: string; inv: string }) =>
    api(`/admin/rewards/${id}/use`, { method: 'POST', json: { invoiceNo: inv } }), ['admin']);
  const housekeeping = useAdminMutation(() => api('/admin/rewards/housekeeping', { method: 'POST' }), ['admin']);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl">{t('admin.rewards')}</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => housekeeping.mutate(undefined, { onSuccess: () => toast('✓') })}>{t('admin.housekeeping')}</button>
          <a className="btn-outline" href={`${apiBase}/admin/export/rewards`}>{t('admin.exportCsv')}</a>
        </div>
      </div>

      <div className="flex gap-2">
        {['AVAILABLE', 'USED', 'EXPIRED', ''].map((s) => (
          <button key={s || 'all'} className={`chip ${status === s ? 'chip-active' : ''}`} onClick={() => setStatus(s)}>
            {s ? t(`status.${s}`) : t('admin.all')}
          </button>
        ))}
      </div>

      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty text={t('refer.noRewards')} icon={icons.gift} /> : (
        <ul className="space-y-2">
          {q.data.map((r) => (
            <li key={r.id} className="card p-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    <Link className="underline" to={`/admin/customers/${r.user.id}`}>{r.user.name}</Link>
                    <span className="text-sm text-teak"> · {r.user.phone}</span>
                  </p>
                  <p className="text-sm">{r.title} <span className="text-teak">({t(`rewardTypes.${r.type}`)})</span></p>
                  <p className="text-xs text-teak">
                    {r.status === 'USED' ? t('refer.usedOn', { inv: r.usedInvoice }) : t('refer.expires', { date: fmtDate(r.expiresAt, i18n.language) })}
                  </p>
                </div>
                <div className="text-right"><p className="font-bold text-brass">{inr(r.amount)}</p><StatusTag s={r.status} /></div>
              </div>
              {r.status === 'AVAILABLE' && (
                <form className="flex gap-2 mt-2" onSubmit={(e) => {
                  e.preventDefault();
                  markUsed.mutate({ id: r.id, inv: invoice[r.id] ?? '' }, { onSuccess: () => toast('✓'), onError: (err) => toast(err.message) });
                }}>
                  <input className="input" placeholder={t('admin.invoice')} required minLength={2} value={invoice[r.id] ?? ''}
                    onChange={(e) => setInvoice({ ...invoice, [r.id]: e.target.value })} aria-label={t('admin.invoice')} />
                  <button className="btn-gold whitespace-nowrap">{t('admin.markUsed')}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
