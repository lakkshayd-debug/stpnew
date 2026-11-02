import { NavLink, Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Icon, icons } from '@/components/ui';

export default function AdminLayout() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const links = [['', 'dashboard'], ['posts', 'posts'], ['moderation', 'moderation'], ['customers', 'customers'],
    ['referrals', 'referrals'], ['rewards', 'rewards'], ['settings', 'settings']] as const;

  const nav = (
    <nav className="flex flex-col gap-1 p-3" aria-label="Admin">
      {links.map(([to, key]) => (
        <NavLink key={key} to={`/admin/${to}`} end={to === ''} onClick={() => setOpen(false)}
          className={({ isActive }) => `btn justify-start ${isActive ? 'bg-brass text-walnut' : 'text-cream hover:bg-white/10'}`}>
          {t(`admin.${key}`)}
        </NavLink>
      ))}
      <Link to="/" className="btn justify-start text-cream/80 hover:bg-white/10 mt-4">← {t('nav.home')}</Link>
    </nav>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="wood text-cream hidden md:block sticky top-0 h-screen">
        <div className="p-4 font-serif font-bold text-lg border-b border-white/10">{t('nav.admin')} · Shyam Timber</div>
        {nav}
      </aside>
      <div>
        <header className="wood text-cream md:hidden flex items-center justify-between px-4 h-14 sticky top-0 z-40">
          <span className="font-serif font-bold">{t('nav.admin')}</span>
          <button className="btn-ghost text-cream w-11 h-11 p-0" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            <Icon d={open ? icons.x : icons.menu} />
          </button>
        </header>
        {open && <div className="wood text-cream md:hidden">{nav}</div>}
        <main className="p-4 max-w-5xl"><Outlet /></main>
      </div>
    </div>
  );
}
