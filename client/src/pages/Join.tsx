import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AREAS, CUSTOMER_TYPES } from '@shared/types';
import { api, HttpError } from '@/api/client';
import { usePublicSettings } from '@/api/hooks';
import { useAuth } from '@/lib/auth';
import { deviceId } from '@/lib/utils';

export default function Join() {
  const { t } = useTranslation();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const settings = usePublicSettings();

  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [profile, setProfile] = useState({
    name: '', area: 'PORUR', customerType: 'HOMEOWNER',
    referralCode: (sp.get('ref') ?? sessionStorage.getItem('st_ref') ?? '').toUpperCase(),
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [testOtp, setTestOtp] = useState<string | null>(null);

  useEffect(() => { if (user) nav('/', { replace: true }); }, [user, nav]);

  const refCheck = useQuery({
    queryKey: ['refcode', profile.referralCode],
    queryFn: () => api<{ valid: boolean; referrerName: string | null }>(`/auth/referral-code/${profile.referralCode}`),
    enabled: profile.referralCode.length >= 8,
  });

  const run = async (fn: () => Promise<void>) => {
    setErr(''); setBusy(true);
    try { await fn(); } catch (e) { setErr(e instanceof HttpError ? e.message : t('common.error')); } finally { setBusy(false); }
  };

  const sendOtp = () => run(async () => {
    const r = await api<{ isNewUser: boolean; testOtp: string | null }>('/auth/otp/request', { method: 'POST', json: { phone } });
    setIsNew(r.isNewUser);
    setTestOtp(r.testOtp ?? null);
    if (r.testOtp) setCode(r.testOtp);          // test mode: pre-fill so logging in is one tap
    setStep('otp');
  });

  const verify = (withProfile: boolean) => run(async () => {
    try {
      await api('/auth/otp/verify', {
        method: 'POST',
        json: { phone, code, deviceId: deviceId(), profile: withProfile ? { ...profile, referralCode: profile.referralCode || null } : undefined },
      });
      sessionStorage.removeItem('st_ref');
      refresh();
      nav('/', { replace: true });
    } catch (e) {
      if (e instanceof HttpError && e.status === 400 && (e.details as { needsProfile?: boolean } | undefined)?.needsProfile) setStep('profile');
      else throw e;
    }
  });

  const rw = settings.data?.rewards;
  const joining = isNew || !!sp.get('ref');

  return (
    <div className="max-w-md mx-auto">
      <div className="wood text-cream rounded-2xl p-5 mb-4">
        <h1 className="text-2xl">{joining ? t('auth.joinTitle') : t('auth.title')}</h1>
        <p className="text-cream/85">{joining ? t('auth.joinSubtitle') : t('auth.subtitle')}</p>
      </div>

      {profile.referralCode && refCheck.data?.valid && (
        <div className="card p-3 mb-4 border-brass bg-brass/10 text-sm font-medium">
          🎁 {t('auth.referredBy', { name: refCheck.data.referrerName, amount: rw?.welcomeAmount ?? 250 })}
        </div>
      )}

      <div className="card p-5 space-y-4">
        {step === 'phone' && (
          <form onSubmit={(e) => { e.preventDefault(); void sendOtp(); }} className="space-y-3">
            <div>
              <label className="label" htmlFor="phone">{t('auth.phone')}</label>
              <div className="flex">
                <span className="input w-auto rounded-r-none flex items-center bg-sawdust/60">+91</span>
                <input id="phone" className="input rounded-l-none" type="tel" inputMode="numeric" autoComplete="tel-national"
                  value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  pattern="[6-9][0-9]{9}" placeholder="98765 43210" required />
              </div>
            </div>
            <button className="btn-primary w-full" disabled={busy || phone.length !== 10}>{t('auth.sendOtp')}</button>
            <p className="text-xs text-teak dark:text-sawdust">{t('auth.privacy')}</p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={(e) => { e.preventDefault(); void verify(false); }} className="space-y-3">
            <p className="text-sm">+91 {phone} <button type="button" className="underline ml-2" onClick={() => setStep('phone')}>{t('common.edit')}</button></p>
            <div>
              <label className="label" htmlFor="otp">{t('auth.otp')}</label>
              <input id="otp" className="input text-center text-2xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} pattern="\d{6}" required />
            </div>
            <p className="text-xs text-teak dark:text-sawdust">{t('auth.otpSent', { phone })}</p>
            {testOtp && <p className="text-xs text-forest dark:text-brass">{t('auth.devHint', { code: testOtp })}</p>}
            <button className="btn-primary w-full" disabled={busy || code.length !== 6}>{t('auth.verify')}</button>
            <button type="button" className="btn-ghost w-full" onClick={() => void sendOtp()} disabled={busy}>{t('auth.resend')}</button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={(e) => { e.preventDefault(); void verify(true); }} className="space-y-3">
            <div>
              <label className="label" htmlFor="name">{t('auth.name')}</label>
              <input id="name" className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} minLength={2} autoComplete="name" required />
            </div>
            <div>
              <label className="label" htmlFor="area">{t('auth.area')}</label>
              <select id="area" className="input" value={profile.area} onChange={(e) => setProfile({ ...profile, area: e.target.value })}>
                {AREAS.map((a) => <option key={a} value={a}>{t(`areas.${a}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ct">{t('auth.customerType')}</label>
              <select id="ct" className="input" value={profile.customerType} onChange={(e) => setProfile({ ...profile, customerType: e.target.value })}>
                {CUSTOMER_TYPES.map((a) => <option key={a} value={a}>{t(`ctypes.${a}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ref">{t('auth.referralCode')}</label>
              <input id="ref" className="input uppercase" value={profile.referralCode}
                onChange={(e) => setProfile({ ...profile, referralCode: e.target.value.toUpperCase() })} placeholder="SHYAM-XXXXXX" />
              {profile.referralCode.length >= 8 && refCheck.data && !refCheck.data.valid && (
                <p className="text-red-700 dark:text-red-300 text-sm mt-1">{t('auth.invalidCode')}</p>
              )}
            </div>
            <button className="btn-primary w-full" disabled={busy}>{t('auth.createAccount')}</button>
          </form>
        )}

        {err && <p className="text-red-700 dark:text-red-300 text-sm" role="alert">{err}</p>}
      </div>
    </div>
  );
}
