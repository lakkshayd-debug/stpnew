import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '@shared/types';
import { usePosts, usePublicSettings } from '@/api/hooks';
import { PostCard } from '@/components/PostCard';
import { Icon, icons, PostSkeleton, Empty, ErrorBox } from '@/components/ui';
import { waLink, isOpenNow } from '@/lib/utils';

export default function Home() {
  const { t } = useTranslation();
  const settings = usePublicSettings();
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => { const id = setTimeout(() => setDebounced(q), 350); return () => clearTimeout(id); }, [q]);

  const posts = usePosts({ category: category || undefined, q: debounced || undefined });
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = posts;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const shop = settings.data?.shop;
  const rw = settings.data?.rewards;
  const open = shop ? isOpenNow(shop.hours) : null;
  const items = posts.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-4">
      <section className="wood text-cream rounded-2xl p-5 shadow-lift">
        <h1 className="text-2xl sm:text-3xl">{t('app.name')}</h1>
        <p className="text-cream/85 mt-1">{t('app.tagline')} · {t('app.since')}</p>
        {open && (
          <p className="text-sm mt-1 font-semibold text-brass">
            {open.open ? t('hero.openNow', { time: open.closes }) : open.opens ? t('hero.opens', { time: open.opens }) : t('hero.closed')}
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <a href={`tel:${shop?.phone ?? '+919342194431'}`} className="btn bg-white/15 hover:bg-white/25 text-cream flex-col gap-0 py-2"><Icon d={icons.phone} />{t('hero.call')}</a>
          <a href={waLink(shop?.whatsapp ?? '+919342194431', 'Hi Shyam Timber, I have an enquiry.')} target="_blank" rel="noreferrer" className="btn bg-forest hover:bg-[#264b2f] text-white flex-col gap-0 py-2"><Icon d={icons.wa} />{t('hero.whatsapp')}</a>
          <a href={shop?.mapsUrl ?? '#'} target="_blank" rel="noreferrer" className="btn bg-white/15 hover:bg-white/25 text-cream flex-col gap-0 py-2"><Icon d={icons.map} />{t('hero.directions')}</a>
        </div>
        {shop && <address className="not-italic text-xs text-cream/70 mt-3">{shop.address}</address>}
      </section>

      <Link to="/refer" className="block card p-4 border-2 border-brass bg-gradient-to-r from-brass/20 to-transparent">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-full bg-brass text-walnut grid place-items-center shrink-0"><Icon d={icons.gift} /></span>
          <div>
            <p className="font-serif font-bold text-lg">{t('referBanner.title')}</p>
            <p className="text-sm">{t('referBanner.body', { welcome: rw?.welcomeAmount ?? 250, min: (rw?.welcomeMinPurchase ?? 5000).toLocaleString('en-IN'), referrer: rw?.referrerAmount ?? 400 })}</p>
          </div>
        </div>
      </Link>

      <div className="sticky top-14 z-30 -mx-4 px-4 py-2 bg-cream/95 dark:bg-ember/95 backdrop-blur space-y-2">
        <div className="relative">
          <Icon d={icons.search} className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-teak pointer-events-none" />
          <input className="input pl-10" type="search" placeholder={t('feed.search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('feed.search')} />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4" role="tablist" aria-label={t('admin.category')}>
          <button role="tab" aria-selected={!category} className={`chip ${!category ? 'chip-active' : ''}`} onClick={() => setCategory('')}>{t('feed.all')}</button>
          {CATEGORIES.map((c) => (
            <button role="tab" key={c} aria-selected={category === c} className={`chip ${category === c ? 'chip-active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
      </div>

      {posts.isLoading ? <><PostSkeleton /><PostSkeleton /></>
        : posts.isError ? <ErrorBox message={t('feed.error')} retry={() => void posts.refetch()} />
        : !items.length ? <Empty text={t('feed.empty')} icon={icons.search} />
        : (
          <div className="space-y-4">
            {items.map((p) => <PostCard key={p.id} post={p} />)}
            <div ref={sentinel} aria-hidden="true" />
            {posts.isFetchingNextPage ? <PostSkeleton /> : !posts.hasNextPage && <p className="text-center text-teak dark:text-sawdust py-4">{t('feed.end')}</p>}
          </div>
        )}
    </div>
  );
}
