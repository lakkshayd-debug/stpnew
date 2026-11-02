import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api, apiBase } from '@/api/client';
import { useAdmin, useAdminMutation } from './shared';
import { Spinner, Empty, StatusTag, icons, useToast } from '@/components/ui';
import { inr, fmtDate } from '@/lib/utils';

interface R {
  id: string; status: string; createdAt: string; flagReason: string | null;
  referrer: { id: string; name: string; phone: string };
  referee: { id: string; name: string; phone: string; area: string | null };
  purchase: { invoiceNo: string; amount: number; qualifying: boolean; confirmedAt: string } | null;
}

export default function AdminReferrals() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [status, setStatus] = useState('JOINED');
  const q = useAdmin<R[]>(`/referrals${status ? `?status=${status}` : ''}`);
  const [form, setForm] = useState<Record<string, { invoiceNo: string; amount: string }>>({});

  const confirmPurchase = useAdminMutation(({ id, invoiceNo, amount }: { id: string; invoiceNo: string; amount: string }) =>
    api(`/admin/referrals/${id}/confirm-purchase`, { method: 'POST', json: { invoiceNo, amount } }), ['admin']);
  const unflag = useAdminMutation((id: string) => api(`/admin/referrals/${id}/unflag`, { method: 'POST' }), ['admin']);

  const tabs = ['JOINED', 'FLAGGED', 'PURCHASED', 'REWARDED', ''];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl">{t('admin.referrals')}</h1>
        <a className="btn-outline" href={`${apiBase}/admin/export/referrals`}>{t('admin.exportCsv')}</a>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((s) => (
          <button key={s || 'all'} className={`chip ${status === s ? 'chip-active' : ''}`} onClick={() => setStatus(s)}>
            {s ? t(`status.${s}`) : t('admin.all')}
          </button>
        ))}
      </div>

      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty text={t('admin.noPending')} icon={icons.check} /> : (
        <ul className="space-y-3">
          {q.data.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex justify-between gap-2">
                <p>
                  <Link className="underline font-semibold" to={`/admin/customers/${r.referrer.id}`}>{r.referrer.name}</Link>
                  {' → '}
                  <Link className="underline font-semibold" to={`/admin/customers/${r.referee.id}`}>{r.referee.name}</Link>
                  <span className="text-sm text-teak"> · {r.referee.phone}</span>
                </p>
                <StatusTag s={r.status} />
              </div>
              <p className="text-sm text-teak">{fmtDate(r.createdAt, i18n.language)}</p>

              {r.flagReason && (
                <div className="mt-2 p-2 rounded-lg bg-red-50 text-red-900 text-sm">
                  ⚠️ {t('admin.flagged')}: {r.flagReason}
                  <button className="btn-ghost ml-2 min-h-[36px]" onClick={() => unflag.mutate(r.id)}>{t('admin.unflag')}</button>
                </div>
              )}

              {r.purchase ? (
                <p className="text-sm mt-2">
                  🧾 {r.purchase.invoiceNo} · {inr(r.purchase.amount)} · {r.purchase.qualifying ? '✅' : '❌'} {fmtDate(r.purchase.confirmedAt, i18n.language)}
                </p>
              ) : (
                <form className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 mt-3" onSubmit={(e) => {
                  e.preventDefault();
                  const f = form[r.id] ?? { invoiceNo: '', amount: '' };
                  confirmPurchase.mutate({ id: r.id, ...f }, {
                    onSuccess: (d) => toast((d as { qualifying: boolean }).qualifying ? '✓ rewards created' : 'Saved (below minimum)'),
                    onError: (err) => toast(err.message),
                  });
                }}>
                  <input className="input" placeholder={t('admin.invoice')} required minLength={2} value={form[r.id]?.invoiceNo ?? ''}
                    onChange={(e) => setForm({ ...form, [r.id]: { amount: form[r.id]?.amount ?? '', invoiceNo: e.target.value } })} aria-label={t('admin.invoice')} />
                  <input className="input" type="number" min="1" step="0.01" placeholder={t('admin.amount')} required value={form[r.id]?.amount ?? ''}
                    onChange={(e) => setForm({ ...form, [r.id]: { invoiceNo: form[r.id]?.invoiceNo ?? '', amount: e.target.value } })} aria-label={t('admin.amount')} />
                  <button className="btn-green whitespace-nowrap">{t('admin.confirmPurchase')}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
