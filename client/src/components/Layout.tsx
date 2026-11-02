import { NavLink, Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/api/hooks';
import { Icon, icons } from './ui';

export function Layout() {
  const { t, i18n } = useTranslation();
  const { user, isOwner } = useAuth();
  const notes = useNotifications(!!user);
  const unread = notes.data?.unread ?? 0;

  const tabs = [
    { to: '/', icon: icons.home, label: t('nav.home'), badge: 0 },
    { to: '/saved', icon: icons.bookmark, label: t('nav.saved'), badge: 0 },
    { to: '/refer', icon: icons.gift, label: t('nav.refer'), badge: 0 },
    { to: '/alerts', icon: icons.bell, label: t('nav.alerts'), badge: unread },
    { to: user ? '/profile' : '/join', icon: icons.user, label: user ? t('nav.profile') : t('nav.login'), badge: 0 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="wood text-cream sticky top-0 z-40 shadow-lift">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-h-[44px]">
            <span className="w-9 h-9 rounded-lg bg-brass text-walnut font-serif font-black grid place-items-center">ST</span>
            <span className="font-serif font-bold leading-tight text-sm sm:text-lg">{t('app.name')}</span>
          </Link>
          <div className="flex items-center gap-1">
            <button className="btn-ghost text-cream px-3 min-h-[40px] text-sm font-bold"
              onClick={() => void i18n.changeLanguage(i18n.language === 'ta' ? 'en' : 'ta')} aria-label={t('profile.language')}>
              {i18n.language === 'ta' ? 'EN' : 'தமிழ்'}
            </button>
            {isOwner && <Link to="/admin" className="btn-gold min-h-[40px] text-sm px-3">{t('nav.admin')}</Link>}
            <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Main">
              {tabs.map((tb) => (
                <NavLink key={tb.to} to={tb.to} end={tb.to === '/'}
                  className={({ isActive }) => `btn-ghost text-cream px-3 min-h-[40px] relative ${isActive ? 'bg-white/15' : ''}`}>
                  {tb.label}
                  {!!tb.badge && <span className="absolute -top-1 -right-1 bg-brass text-walnut text-xs font-bold rounded-full min-w-5 h-5 px-1 grid place-items-center">{tb.badge}</span>}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-4 pb-24 md:pb-8"><Outlet /></main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-bark border-t border-sawdust dark:border-walnut safe-bottom" aria-label="Bottom navigation">
        <ul className="grid grid-cols-5">
          {tabs.map((tb) => (
            <li key={tb.to}>
              <NavLink to={tb.to} end={tb.to === '/'}
                className={({ isActive }) => `relative flex flex-col items-center justify-center min-h-[60px] gap-0.5 text-xs font-medium ${isActive ? 'text-walnut dark:text-brass' : 'text-teak dark:text-sawdust/80'}`}>
                {({ isActive }) => (
                  <>
                    <Icon d={tb.icon} filled={isActive} />
                    {tb.label}
                    {!!tb.badge && <span className="absolute top-2 right-1/4 bg-brass text-walnut text-[11px] font-bold rounded-full min-w-5 h-5 px-1 grid place-items-center">{tb.badge}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
