import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AREAS, CUSTOMER_TYPES, type Area, type CustomerType } from '@shared/types';
import { useAuth } from '@/lib/auth';
import { api } from '@/api/client';
import { usePublicSettings } from '@/api/hooks';
import { useToast, Badge, Spinner, Icon, icons } from '@/components/ui';
import { fmtDate } from '@/lib/utils';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, loading, logout, refresh } = useAuth();
  const settings = usePublicSettings();
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    area: (user?.area ?? 'PORUR') as Area,
    customerType: (user?.customerType ?? 'HOMEOWNER') as CustomerType,
  });
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));

  const save = useMutation({
    mutationFn: () => api('/me', { method: 'PATCH', json: form }),
    onSuccess: () => { refresh(); toast(t('profile.saved')); },
  });

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/join" replace />;

  const toggleDark = () => {
    const d = !dark;
    setDark(d);
    document.documentElement.classList.toggle('dark', d);
    localStorage.setItem('theme', d ? 'dark' : 'light');
  };
  const shop = settings.data?.shop;

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-2xl">{t('profile.title')}</h1>

      <div className="card p-4">
        <p className="text-lg font-semibold">{user.name} <span className="text-sm font-normal text-teak">· {user.phone}</span></p>
        <p className="text-sm text-teak dark:text-sawdust">{t('profile.member', { date: fmtDate(user.createdAt, i18n.language) })}</p>
        <p className="text-sm mt-1">{t('refer.yourCode')}: <b className="tracking-wider">{user.referralCode}</b></p>
        {user.badges.length > 0 && <div className="flex gap-2 mt-2">{user.badges.map((b) => <Badge key={b} kind={b} />)}</div>}
      </div>

      <form className="card p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div>
          <label className="label" htmlFor="name">{t('auth.name')}</label>
          <input id="name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={2} required />
        </div>
        <div>
          <label className="label" htmlFor="area">{t('auth.area')}</label>
          <select id="area" className="input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value as Area })}>
            {AREAS.map((a) => <option key={a} value={a}>{t(`areas.${a}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ct">{t('auth.customerType')}</label>
          <select id="ct" className="input" value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}>
            {CUSTOMER_TYPES.map((a) => <option key={a} value={a}>{t(`ctypes.${a}`)}</option>)}
          </select>
        </div>
        <button className="btn-primary w-full" disabled={save.isPending}>{t('profile.save')}</button>
      </form>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{t('profile.language')}</span>
          <div className="flex gap-1">
            {['en', 'ta'].map((l) => (
              <button key={l} className={`chip ${i18n.language === l ? 'chip-active' : ''}`} onClick={() => void i18n.changeLanguage(l)}>
                {l === 'en' ? 'English' : 'தமிழ்'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold">{t('profile.theme')}</span>
          <button role="switch" aria-checked={dark} aria-label={t('profile.theme')} onClick={toggleDark}
            className={`w-14 h-8 rounded-full p-1 transition ${dark ? 'bg-brass' : 'bg-sawdust'}`}>
            <span className={`block w-6 h-6 rounded-full bg-white shadow transition ${dark ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </div>

      {shop && (
        <div className="card p-4 text-sm space-y-1">
          <p className="font-semibold text-base">{t('profile.shop')}</p>
          <address className="not-italic">{shop.address}</address>
          <p className="flex gap-3 pt-1">
            <a className="btn-ghost px-2" href={`tel:${shop.phone}`}><Icon d={icons.phone} className="w-4 h-4" />{shop.phone}</a>
            <a className="btn-ghost px-2" href={shop.website} target="_blank" rel="noreferrer">shyamtimber.co.in</a>
          </p>
          <ul className="pt-1">
            {shop.hours.map((h) => (
              <li key={h.day} className="flex justify-between"><span>{h.day}</span><span>{h.closed ? t('admin.closed') : `${h.open} – ${h.close}`}</span></li>
            ))}
          </ul>
        </div>
      )}

      <button className="btn-outline w-full" onClick={async () => { await logout(); nav('/'); }}>{t('nav.logout')}</button>
    </div>
  );
}
