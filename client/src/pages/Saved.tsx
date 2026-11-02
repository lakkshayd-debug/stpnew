import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePosts } from '@/api/hooks';
import { useAuth } from '@/lib/auth';
import { PostCard } from '@/components/PostCard';
import { PostSkeleton, Empty, icons } from '@/components/ui';

export default function Saved() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const q = usePosts({ saved: true });

  if (loading) return <PostSkeleton />;
  if (!user) return <Empty text={t('saved.loginPrompt')} icon={icons.bookmark} action={<Link to="/join" className="btn-primary">{t('nav.login')}</Link>} />;

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t('saved.title')}</h1>
      {q.isLoading ? <PostSkeleton /> : !items.length ? <Empty text={t('saved.empty')} icon={icons.bookmark} /> : items.map((p) => <PostCard key={p.id} post={p} />)}
      {q.hasNextPage && <button className="btn-outline w-full" onClick={() => void q.fetchNextPage()}>{t('feed.loadMore')}</button>}
    </div>
  );
}
