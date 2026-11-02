import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { usePost } from '@/api/hooks';
import { PostCard } from '@/components/PostCard';
import { Comments } from '@/components/Comments';
import { PostSkeleton, ErrorBox, Icon, icons } from '@/components/ui';

export default function PostPage() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const { t } = useTranslation();
  const q = usePost(id);

  // Carry a referral code arriving from a shared link into the signup flow.
  useEffect(() => { const ref = sp.get('ref'); if (ref) sessionStorage.setItem('st_ref', ref.toUpperCase()); }, [sp]);

  useEffect(() => {
    if (q.data) document.title = `${q.data.title} · Shyam Timber and Plywoods`;
    return () => { document.title = 'Shyam Timber and Plywoods · Porur, Chennai'; };
  }, [q.data]);

  return (
    <div>
      <Link to="/" className="btn-ghost -ml-3 mb-2"><Icon d={icons.chevL} />{t('post.back')}</Link>
      {q.isLoading ? <PostSkeleton /> : q.isError || !q.data ? <ErrorBox retry={() => void q.refetch()} /> : (
        <>
          <PostCard post={q.data} full />
          <Comments postId={id} />
        </>
      )}
    </div>
  );
}
