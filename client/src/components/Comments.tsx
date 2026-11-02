import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useComments, qk } from '@/api/hooks';
import { api, HttpError } from '@/api/client';
import { useAuth } from '@/lib/auth';
import { Spinner, useToast } from './ui';
import { fmtDate } from '@/lib/utils';

export function Comments({ postId }: { postId: string }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useComments(postId);
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');

  const add = useMutation({
    mutationFn: () => api(`/posts/${postId}/comments`, { method: 'POST', json: { body } }),
    onSuccess: () => {
      setBody(''); setErr(''); toast(t('comments.submitted'));
      void qc.invalidateQueries({ queryKey: qk.comments(postId) });
    },
    onError: (e) => setErr(e instanceof HttpError ? e.message : t('common.error')),
  });

  return (
    <section id="comments" className="card p-4 mt-4">
      <h3 className="text-lg mb-3">{t('comments.title')}</h3>

      {q.isLoading ? <Spinner /> : !q.data?.length ? <p className="text-teak dark:text-sawdust">{t('comments.empty')}</p> : (
        <ul className="space-y-3">
          {q.data.map((c) => (
            <li key={c.id} className={`rounded-xl p-3 ${c.status !== 'APPROVED' ? 'bg-amber-50 dark:bg-walnut/40 border border-dashed border-amber-400' : 'bg-cream dark:bg-walnut/30'}`}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="font-semibold">{c.author.name}</span>
                <span className="text-teak dark:text-sawdust">{fmtDate(c.createdAt, i18n.language)}</span>
              </div>
              <p className="mt-1">{c.body}</p>
              {c.status === 'PENDING' && <span className="tag bg-amber-100 text-amber-900 mt-2">⏳ {t('comments.pending')}</span>}
              {c.status === 'REJECTED' && <span className="tag bg-red-100 text-red-900 mt-2">{t('comments.rejected')}</span>}
              {c.ownerReply && (
                <div className="mt-2 ml-3 pl-3 border-l-4 border-brass">
                  <p className="text-sm font-semibold text-brass">{t('comments.ownerReply')}</p>
                  <p>{c.ownerReply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <form className="mt-4" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <label htmlFor="cbody" className="label">{t('comments.title')}</label>
          <textarea id="cbody" className="input py-2 min-h-[88px]" value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={t('comments.placeholder')} maxLength={600} minLength={2} required />
          {err && <p className="text-red-700 dark:text-red-300 text-sm mt-1" role="alert">{err}</p>}
          <button className="btn-primary mt-2 w-full" disabled={add.isPending || body.trim().length < 2}>{t('comments.submit')}</button>
        </form>
      ) : <Link to="/join" className="btn-outline mt-4 w-full">{t('comments.loginToComment')}</Link>}
    </section>
  );
}
