import { useState } from 'react';
import { Icon, icons } from './ui';
import type { PostImageDTO } from '@shared/types';

export function ImageCarousel({ images, title, aspect = 'aspect-[4/3]' }: { images: PostImageDTO[]; title: string; aspect?: string }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className={`${aspect} wood grid place-items-center text-cream/70 font-serif text-3xl`}>{title.slice(0, 1)}</div>;
  const go = (n: number) => setI((prev) => (prev + n + images.length) % images.length);
  return (
    <div className={`relative ${aspect} bg-sawdust dark:bg-walnut overflow-hidden`}>
      <div className="flex h-full transition-transform duration-300" style={{ transform: `translateX(-${i * 100}%)` }}
        onTouchStart={(e) => ((e.currentTarget as HTMLElement).dataset.x = String(e.touches[0]?.clientX ?? 0))}
        onTouchEnd={(e) => {
          const dx = (e.changedTouches[0]?.clientX ?? 0) - Number((e.currentTarget as HTMLElement).dataset.x ?? 0);
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}>
        {images.map((img, n) => (
          <img key={img.id} src={img.url} alt={img.alt ?? `${title} photo ${n + 1}`} loading={n === 0 ? 'eager' : 'lazy'} className="w-full h-full object-cover shrink-0" />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/45 text-white grid place-items-center" onClick={() => go(-1)} aria-label="Previous image"><Icon d={icons.chevL} /></button>
          <button className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/45 text-white grid place-items-center" onClick={() => go(1)} aria-label="Next image"><Icon d={icons.chevR} /></button>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
            {images.map((img, n) => <span key={img.id} className={`w-2 h-2 rounded-full ${n === i ? 'bg-brass' : 'bg-white/60'}`} />)}
          </div>
        </>
      )}
    </div>
  );
}
