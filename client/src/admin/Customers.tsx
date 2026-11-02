import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AREAS, CUSTOMER_TYPES } from '@shared/types';
import { useAdmin } from './shared';
import { Spinner, Empty, icons, Badge } from '@/components/ui';
import { fmtDate } from '@/lib/utils';
import { apiBase } from '@/api/client';

interface Row {
  id: string; name: string; phone: string; area: string | null; customerType: string | null; referralCode: string;
  badges: string[]; isBlocked: boolean; createdAt: string; referrals: number; availableRewards: number;
  referredBy: { id: string; name: string } | null;
}

export default function Customers() {
  const { t, i18n } = useTranslation();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [ctype, setCtype] = useState('');
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (area) params.set('area', area);
  if (ctype) params.set('customerType', ctype);
  const res = useAdmin<Row[]>(`/customers?${params.toString()}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl">{t('admin.customers')}</h1>
        <a className="btn-outline" href={`${apiBase}/admin/export/customers`}>{t('admin.exportCsv')}</a>
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        <input className="input" placeholder={t('admin.search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('admin.search')} />
        <select className="input" value={area} onChange={(e) => setArea(e.target.value)} aria-label={t('auth.area')}>
          <option value="">{t('admin.all')} · {t('auth.area')}</option>
          {AREAS.map((a) => <option key={a} value={a}>{t(`areas.${a}`)}</option>)}
        </select>
        <select className="input" value={ctype} onChange={(e) => setCtype(e.target.value)} aria-label={t('auth.customerType')}>
          <option value="">{t('admin.all')} · {t('auth.customerType')}</option>
          {CUSTOMER_TYPES.map((a) => <option key={a} value={a}>{t(`ctypes.${a}`)}</option>)}
        </select>
      </div>

      {res.isLoading ? <Spinner /> : !res.data?.length ? <Empty text={t('admin.noCustomers')} icon={icons.user} /> : (
        <ul className="space-y-2">
          {res.data.map((c) => (
            <li key={c.id}>
              <Link to={`/admin/customers/${c.id}`} className="card p-3 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full wood text-cream grid place-items-center font-bold">{c.name[0]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {c.name} {c.isBlocked && <span className="tag bg-red-100 text-red-900">blocked</span>}
                    {c.badges.map((b) => <span key={b} className="ml-1"><Badge kind={b} /></span>)}
                  </p>
                  <p className="text-sm text-teak">
                    {c.phone} · {c.area ? t(`areas.${c.area}`) : '—'} · {c.customerType ? t(`ctypes.${c.customerType}`) : '—'} · {c.referralCode}
                  </p>
                  <p className="text-xs text-teak">
                    {t('admin.totalReferrals')}: {c.referrals} · {t('admin.availableRewards')}: {c.availableRewards} · {t('admin.joined')}: {fmtDate(c.createdAt, i18n.language)}
                    {c.referredBy && ` · ${t('admin.referredBy')} ${c.referredBy.name}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
