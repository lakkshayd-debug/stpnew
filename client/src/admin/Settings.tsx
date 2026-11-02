import { useEffect, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { useAdmin, useAdminMutation } from './shared';
import { Spinner, useToast } from '@/components/ui';
import type { RewardSettings, ShopSettings } from '@shared/types';

export default function Settings() {
  const { t } = useTranslation();
  const toast = useToast();
  const q = useAdmin<{ rewards: RewardSettings; shop: ShopSettings }>('/settings');
  const [rw, setRw] = useState<RewardSettings | null>(null);
  const [shop, setShop] = useState<ShopSettings | null>(null);

  useEffect(() => { if (q.data) { setRw(q.data.rewards); setShop(q.data.shop); } }, [q.data]);

  const saveRewards = useAdminMutation(() => api('/admin/settings/rewards', { method: 'PUT', json: rw }), ['admin']);
  const saveShop = useAdminMutation(() => api('/admin/settings/shop', { method: 'PUT', json: shop }), ['admin']);

  if (q.isLoading || !rw || !shop) return <Spinner />;

  const num = (k: 'welcomeAmount' | 'welcomeMinPurchase' | 'referrerAmount' | 'qualifyingMinPurchase' | 'expiryDays' | 'maxBillPercent') => ({
    type: 'number' as const, className: 'input', value: String(rw[k]), min: 0,
    onChange: (e: ChangeEvent<HTMLInputElement>) => setRw({ ...rw, [k]: Number(e.target.value) }),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl">{t('admin.settings')}</h1>

      <form className="card p-4 space-y-3" onSubmit={(e) => {
        e.preventDefault();
        saveRewards.mutate(undefined, { onSuccess: () => toast('✓'), onError: (err) => toast(err.message) });
      }}>
        <h2 className="text-lg">{t('admin.rewardSettings')}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label" htmlFor="wa">{t('admin.welcomeAmount')}</label><input id="wa" {...num('welcomeAmount')} /></div>
          <div><label className="label" htmlFor="wm">{t('admin.welcomeMinPurchase')}</label><input id="wm" {...num('welcomeMinPurchase')} /></div>
          <div><label className="label" htmlFor="ra">{t('admin.referrerAmount')}</label><input id="ra" {...num('referrerAmount')} /></div>
          <div><label className="label" htmlFor="qm">{t('admin.qualifyingMinPurchase')}</label><input id="qm" {...num('qualifyingMinPurchase')} /></div>
          <div><label className="label" htmlFor="ed">{t('admin.expiryDays')}</label><input id="ed" {...num('expiryDays')} /></div>
          <div><label className="label" htmlFor="mb">{t('admin.maxBillPercent')}</label><input id="mb" {...num('maxBillPercent')} /></div>
        </div>

        <h3 className="font-semibold pt-2">{t('admin.milestones')}</h3>
        {rw.milestones.map((m, i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            <input className="input" type="number" min={1} value={m.count} aria-label={t('admin.milestoneCount')}
              onChange={(e) => { const ms = [...rw.milestones]; ms[i] = { ...m, count: Number(e.target.value) }; setRw({ ...rw, milestones: ms }); }} />
            <input className="input" type="number" min={0} value={m.bonus} aria-label={t('admin.milestoneBonus')}
              onChange={(e) => { const ms = [...rw.milestones]; ms[i] = { ...m, bonus: Number(e.target.value) }; setRw({ ...rw, milestones: ms }); }} />
            <input className="input" value={m.badge ?? ''} placeholder={t('admin.milestoneBadge')} aria-label={t('admin.milestoneBadge')}
              onChange={(e) => { const ms = [...rw.milestones]; ms[i] = { ...m, badge: e.target.value || null }; setRw({ ...rw, milestones: ms }); }} />
          </div>
        ))}
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => setRw({ ...rw, milestones: [...rw.milestones, { count: 15, bonus: 2000, badge: null }] })}>+ milestone</button>
          {rw.milestones.length > 1 && (
            <button type="button" className="btn-ghost text-red-700" onClick={() => setRw({ ...rw, milestones: rw.milestones.slice(0, -1) })}>− milestone</button>
          )}
        </div>
        <button className="btn-primary w-full" disabled={saveRewards.isPending}>{t('admin.saveSettings')}</button>
      </form>

      <form className="card p-4 space-y-3" onSubmit={(e) => {
        e.preventDefault();
        saveShop.mutate(undefined, { onSuccess: () => toast('✓'), onError: (err) => toast(err.message) });
      }}>
        <h2 className="text-lg">{t('admin.shopSettings')}</h2>
        {([['name', 'shopName'], ['address', 'address'], ['phone', 'phone'], ['whatsapp', 'whatsapp'], ['website', 'website'], ['mapsUrl', 'mapsUrl']] as const).map(([k, label]) => (
          <div key={k}>
            <label className="label" htmlFor={k}>{t(`admin.${label}`)}</label>
            <input id={k} className="input" value={shop[k]} onChange={(e) => setShop({ ...shop, [k]: e.target.value })} required />
          </div>
        ))}

        <h3 className="font-semibold pt-2">{t('admin.hours')}</h3>
        {shop.hours.map((h, i) => (
          <div key={h.day} className="grid grid-cols-[3rem_1fr_1fr_auto] items-center gap-2">
            <span className="font-semibold">{h.day}</span>
            <input className="input" type="time" value={h.open} disabled={h.closed} aria-label={`${h.day} open`}
              onChange={(e) => { const hs = [...shop.hours]; hs[i] = { ...h, open: e.target.value }; setShop({ ...shop, hours: hs }); }} />
            <input className="input" type="time" value={h.close} disabled={h.closed} aria-label={`${h.day} close`}
              onChange={(e) => { const hs = [...shop.hours]; hs[i] = { ...h, close: e.target.value }; setShop({ ...shop, hours: hs }); }} />
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" className="w-5 h-5" checked={h.closed}
                onChange={(e) => { const hs = [...shop.hours]; hs[i] = { ...h, closed: e.target.checked }; setShop({ ...shop, hours: hs }); }} />
              {t('admin.closed')}
            </label>
          </div>
        ))}
        <button className="btn-primary w-full" disabled={saveShop.isPending}>{t('admin.saveSettings')}</button>
      </form>
    </div>
  );
}
