import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotifications, qk } from '@/api/hooks';
import { useAuth } from '@/lib/auth';
import { api } from '@/api/client';
import { Empty, Spinner, icons } from '@/components/ui';
import { fmtDate } from '@/lib/utils';

const emoji: Record<string, string> = {
  NEW_POST: '🪵', COMMENT_APPROVED: '✅', COMMENT_REPLIED: '💬', REFERRAL_JOINED: '🤝',
  REWARD_EARNED: '🎁', REWARD_EXPIRING: '⏰', SYSTEM: 'ℹ️',
};

export default function Alerts() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useNotifications(!!user);
  const read = useMutation({
    mutationFn: () => api('/notifications/read', { method: 'POST', json: {} }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: qk.notes }); void qc.invalidateQueries({ queryKey: qk.me }); },
  });

  if (!user) return <Empty text={t('refer.loginPrompt')} icon={icons.bell} action={<Link to="/join" className="btn-primary">{t('nav.login')}</Link>} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl">{t('alerts.title')}</h1>
        {!!q.data?.unread && <button className="btn-ghost text-sm" onClick={() => read.mutate()}>{t('alerts.markRead')}</button>}
      </div>
      {q.isLoading ? <Spinner /> : !q.data?.items.length ? <Empty text={t('alerts.empty')} icon={icons.bell} /> : (
        <ul className="space-y-2">
          {q.data.items.map((n) => (
            <li key={n.id}>
              <Link to={n.link ?? '#'} className={`card p-3 flex gap-3 ${!n.readAt ? 'border-l-4 border-l-brass' : 'opacity-80'}`}>
                <span className="text-2xl" aria-hidden="true">{emoji[n.type] ?? '🔔'}</span>
                <div className="min-w-0">
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-walnut/80 dark:text-cream/80">{n.body}</p>
                  <p className="text-xs text-teak mt-1">{fmtDate(n.createdAt, i18n.language)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
