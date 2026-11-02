import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useAdmin, useAdminMutation } from './shared';
import { Spinner, Empty, icons, StatusTag } from '@/components/ui';
import { fmtDate } from '@/lib/utils';

interface C {
  id: string; body: string; status: string; createdAt: string; ownerReply: string | null;
  author: { id: string; name: string; phone: string }; post: { id: string; title: string };
}

export default function Moderation() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState('PENDING');
  const q = useAdmin<C[]>(`/comments?status=${status}`);
  const [reply, setReply] = useState<Record<string, string>>({});

  const act = useAdminMutation(({ id, action, body }: { id: string; action: 'approve' | 'reject' | 'reply' | 'delete'; body?: string }) =>
    api(`/admin/comments/${id}${action === 'delete' ? '' : '/' + action}`, {
      method: action === 'delete' ? 'DELETE' : 'POST', json: body ? { body } : undefined,
    }), ['admin']);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t('admin.moderation')}</h1>
      <div className="flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
          <button key={s} className={`chip ${status === s ? 'chip-active' : ''}`} onClick={() => setStatus(s)}>{t(`status.${s}`)}</button>
        ))}
      </div>

      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty text={t('admin.noPending')} icon={icons.check} /> : (
        <ul className="space-y-3">
          {q.data.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex justify-between gap-2 text-sm">
                <span><b>{c.author.name}</b> · {c.author.phone}</span>
                <span className="text-teak">{fmtDate(c.createdAt, i18n.language)}</span>
              </div>
              <p className="text-sm text-teak">on <Link className="underline" to={`/post/${c.post.id}`}>{c.post.title}</Link> <StatusTag s={c.status} /></p>
              <p className="mt-2 text-lg">{c.body}</p>
              {c.ownerReply && <p className="mt-2 pl-3 border-l-4 border-brass text-sm">{t('comments.ownerReply')}: {c.ownerReply}</p>}

              <div className="flex flex-wrap gap-2 mt-3">
                {c.status !== 'APPROVED' && <button className="btn-green" onClick={() => act.mutate({ id: c.id, action: 'approve' })}>{t('admin.approve')}</button>}
                {c.status !== 'REJECTED' && <button className="btn-outline" onClick={() => act.mutate({ id: c.id, action: 'reject' })}>{t('admin.reject')}</button>}
                <button className="btn-ghost text-red-700" onClick={() => { if (confirm(`${t('common.delete')}?`)) act.mutate({ id: c.id, action: 'delete' }); }}>{t('common.delete')}</button>
              </div>

              {c.status === 'APPROVED' && (
                <form className="flex gap-2 mt-3" onSubmit={(e) => {
                  e.preventDefault();
                  act.mutate({ id: c.id, action: 'reply', body: reply[c.id] });
                  setReply({ ...reply, [c.id]: '' });
                }}>
                  <input className="input" placeholder={t('admin.replyPlaceholder')} required value={reply[c.id] ?? ''}
                    onChange={(e) => setReply({ ...reply, [c.id]: e.target.value })} aria-label={t('admin.reply')} />
                  <button className="btn-primary">{t('admin.reply')}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
