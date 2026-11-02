import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

export const Icon = ({ d, className = 'w-6 h-6', filled = false }: { d: string; className?: string; filled?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const icons = {
  home: 'M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z',
  bookmark: 'M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z',
  comment: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  map: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  copy: 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  pin: 'M12 17v5M5 8l2-5h10l2 5M5 8h14l-2 9H7z',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  chevL: 'M15 18l-6-6 6-6',
  chevR: 'M9 18l6-6-6-6',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  wa: 'M3 21l1.7-5A9 9 0 1 1 8 19.3zM8.5 9.5c.3 2.5 3.5 5.7 6 6l1.5-1.5-2-1-1 .8c-1-.3-2.5-1.8-2.8-2.8l.8-1-1-2z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  search: 'M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z',
};

export const Spinner = () => (
  <div className="flex justify-center p-6">
    <div className="w-8 h-8 border-4 border-sawdust border-t-walnut rounded-full animate-spin" role="status" aria-label="Loading" />
  </div>
);

export const Empty = ({ text, icon = icons.bookmark, action }: { text: string; icon?: string; action?: ReactNode }) => (
  <div className="text-center py-14 px-6 text-teak dark:text-sawdust">
    <Icon d={icon} className="w-12 h-12 mx-auto mb-3 opacity-60" />
    <p className="text-lg">{text}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const ErrorBox = ({ message, retry }: { message?: string; retry?: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="card p-5 text-center border-red-300" role="alert">
      <p className="text-red-700 dark:text-red-300 font-medium">{message ?? t('common.error')}</p>
      {retry && <button className="btn-outline mt-3" onClick={retry}>{t('common.retry')}</button>}
    </div>
  );
};

export const PostSkeleton = () => (
  <div className="card overflow-hidden">
    <div className="skeleton aspect-[4/3] rounded-none" />
    <div className="p-4 space-y-3">
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton h-11 w-full" />
    </div>
  </div>
);

export const Badge = ({ kind }: { kind: string }) => {
  const { t } = useTranslation();
  const gold = kind === 'GOLD';
  return (
    <span className={`tag inline-flex items-center gap-1 ${gold ? 'bg-brass text-walnut' : 'bg-gray-200 text-gray-800'}`}>
      <Icon d={icons.star} className="w-3.5 h-3.5" filled />
      {t(`badge.${kind}`, kind)}
    </span>
  );
};

const statusColors: Record<string, string> = {
  JOINED: 'bg-sawdust text-walnut', PURCHASED: 'bg-blue-100 text-blue-900', REWARDED: 'bg-green-100 text-green-900',
  FLAGGED: 'bg-red-100 text-red-900', AVAILABLE: 'bg-green-100 text-green-900', USED: 'bg-gray-200 text-gray-800',
  EXPIRED: 'bg-red-100 text-red-900', PENDING: 'bg-amber-100 text-amber-900', APPROVED: 'bg-green-100 text-green-900',
  REJECTED: 'bg-red-100 text-red-900',
};
export const StatusTag = ({ s }: { s: string }) => {
  const { t } = useTranslation();
  return <span className={`tag ${statusColors[s] ?? 'bg-sawdust text-walnut'}`}>{t(`status.${s}`, s)}</span>;
};

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-cream dark:bg-ember w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl">{title}</h2>
          <button className="btn-ghost w-11 h-11 p-0" onClick={onClose} aria-label="Close"><Icon d={icons.x} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Tiny toast helper - no extra dependency. */
export function useToast() {
  return (msg: string) => {
    const el = document.createElement('div');
    el.textContent = msg;
    el.setAttribute('role', 'status');
    el.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-walnut text-cream px-4 py-3 rounded-xl shadow-lift z-[60] text-base max-w-[90vw] text-center';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  };
}
