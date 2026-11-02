import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { PostDTO } from '@shared/types';
import { ImageCarousel } from './ImageCarousel';
import { Icon, icons, Modal, useToast } from './ui';
import { usePostAction, usePublicSettings } from '@/api/hooks';
import { useAuth } from '@/lib/auth';
import { api } from '@/api/client';
import { inr, waLink, shareUrl, copy } from '@/lib/utils';

const typeColor: Record<string, string> = {
  NEW_ARRIVAL: 'bg-forest text-white', OFFER: 'bg-brass text-walnut', TIP: 'bg-blue-100 text-blue-900',
  PROJECT: 'bg-purple-100 text-purple-900', ANNOUNCEMENT: 'bg-sawdust text-walnut',
};

export function PostCard({ post, full = false }: { post: PostDTO; full?: boolean }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { user } = useAuth();
  const settings = usePublicSettings();
  const like = usePostAction('like');
  const save = usePostAction('save');
  const toast = useToast();
  const [shareOpen, setShareOpen] = useState(false);

  const wa = settings.data?.shop.whatsapp ?? '+919342194431';
  const guard = (fn: () => void) => (user ? fn() : nav('/join'));
  const url = shareUrl(post.id, user?.referralCode);
  const shareText = t('post.shareMsg', { title: post.title, url });
  const track = () => void api(`/posts/${post.id}/share`, { method: 'POST' }).catch(() => undefined);

  const doShare = async (kind: 'wa' | 'copy' | 'native') => {
    track();
    if (kind === 'wa') window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
    else if (kind === 'copy') { await copy(url); toast(t('post.copied')); }
    else if (navigator.share) await navigator.share({ title: post.title, text: shareText, url }).catch(() => undefined);
    setShareOpen(false);
  };

  return (
    <article className="card overflow-hidden">
      <ImageCarousel images={post.images} title={post.title} />
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`tag ${typeColor[post.type] ?? 'bg-sawdust'}`}>{t(`types.${post.type}`)}</span>
          <span className="tag bg-sawdust/70 dark:bg-walnut text-walnut dark:text-sawdust">{post.category}</span>
          {post.pinned && <span className="tag bg-walnut text-cream inline-flex items-center gap-1"><Icon d={icons.pin} className="w-3 h-3" />{t('feed.pinned')}</span>}
          {post.isSample && <span className="tag border border-dashed border-teak text-teak">{t('app.sample')}</span>}
        </div>

        <h2 className="text-xl leading-snug">
          {full ? post.title : <Link to={`/post/${post.id}`} className="hover:underline">{post.title}</Link>}
        </h2>

        {post.price != null && (
          <p className="mt-1 text-forest dark:text-brass font-bold text-lg">
            {post.priceLabel && (
              <span className="text-sm font-medium text-teak dark:text-sawdust mr-1">
                {t(post.priceLabel === 'starting at' ? 'post.startingAt' : 'post.from')}
              </span>
            )}
            {inr(post.price)}
            {post.priceUnit && <span className="text-sm font-medium">/{post.priceUnit}</span>}
          </p>
        )}

        <p className={`mt-2 text-walnut/90 dark:text-cream/90 whitespace-pre-line ${full ? '' : 'line-clamp-3'}`}>{post.description}</p>
        {!full && post.description.length > 140 && <Link to={`/post/${post.id}`} className="text-teak dark:text-brass font-semibold text-sm">…more</Link>}

        <a href={waLink(wa, t('post.enquireMsg', { title: post.title }))} target="_blank" rel="noreferrer" className="btn-green w-full mt-4 text-lg min-h-[52px]">
          <Icon d={icons.wa} />{t('post.enquire')}
        </a>

        <div className="grid grid-cols-4 gap-1 mt-3 border-t border-sawdust dark:border-walnut pt-2">
          <button onClick={() => guard(() => like.mutate(post.id))} className={`btn-ghost flex-col gap-0 text-xs ${post.liked ? 'text-red-600' : ''}`} aria-pressed={post.liked} aria-label={`${t('post.like')} (${post.likeCount})`}>
            <Icon d={icons.heart} filled={post.liked} />{post.likeCount} {t('post.like')}
          </button>
          <Link to={`/post/${post.id}#comments`} className="btn-ghost flex-col gap-0 text-xs">
            <Icon d={icons.comment} />{post.commentCount} {t('post.comment')}
          </Link>
          <button onClick={() => guard(() => save.mutate(post.id))} className={`btn-ghost flex-col gap-0 text-xs ${post.saved ? 'text-brass' : ''}`} aria-pressed={post.saved}>
            <Icon d={icons.bookmark} filled={post.saved} />{post.saved ? t('post.saved') : t('post.save')}
          </button>
          <button onClick={() => setShareOpen(true)} className="btn-ghost flex-col gap-0 text-xs">
            <Icon d={icons.share} />{t('post.share')}
          </button>
        </div>
      </div>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={t('post.share')}>
        <div className="grid gap-2">
          <button className="btn-green" onClick={() => void doShare('wa')}><Icon d={icons.wa} />{t('post.shareWa')}</button>
          <button className="btn-outline" onClick={() => void doShare('copy')}><Icon d={icons.copy} />{t('post.copy')}</button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button className="btn-outline" onClick={() => void doShare('native')}><Icon d={icons.share} />{t('post.native')}</button>
          )}
          {user && <p className="text-sm text-teak dark:text-sawdust text-center mt-1">🎁 {t('post.refIncluded', { code: user.referralCode })}</p>}
        </div>
      </Modal>
    </article>
  );
}
