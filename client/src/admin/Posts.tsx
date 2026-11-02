import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, POST_TYPES } from '@shared/types';
import { api } from '@/api/client';
import { useAdmin, useAdminMutation } from './shared';
import { Modal, Icon, icons, Spinner, useToast } from '@/components/ui';
import { inr } from '@/lib/utils';

interface AdminPost {
  id: string; title: string; description: string; category: string; type: string;
  price: number | null; priceLabel: string | null; priceUnit: string | null; pinned: boolean;
  images: { id: string; url: string }[]; _count: { likes: number; comments: number };
}

const empty = { title: '', description: '', category: 'Plywood', type: 'NEW_ARRIVAL', price: '', priceLabel: 'from', priceUnit: 'sq ft', pinned: false, notifyMembers: false };

export default function AdminPosts() {
  const { t } = useTranslation();
  const toast = useToast();
  const q = useAdmin<AdminPost[]>('/posts');
  const [editing, setEditing] = useState<AdminPost | 'new' | null>(null);
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState<File[]>([]);
  const [keep, setKeep] = useState<string[]>([]);

  const open = (p: AdminPost | 'new') => {
    setEditing(p); setFiles([]);
    if (p === 'new') { setForm(empty); setKeep([]); }
    else {
      setForm({ title: p.title, description: p.description, category: p.category, type: p.type,
        price: p.price?.toString() ?? '', priceLabel: p.priceLabel ?? 'from', priceUnit: p.priceUnit ?? '', pinned: p.pinned, notifyMembers: false });
      setKeep(p.images.map((i) => i.id));
    }
  };

  const save = useAdminMutation(async () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (k === 'price' && v === '') return; fd.append(k, String(v)); });
    if (editing !== 'new') fd.append('keepImageIds', keep.join(','));
    files.forEach((f) => fd.append('images', f));
    await api(editing === 'new' ? '/admin/posts' : `/admin/posts/${(editing as AdminPost).id}`, { method: editing === 'new' ? 'POST' : 'PUT', form: fd });
  }, ['admin', 'posts']);

  const pin = useAdminMutation((id: string) => api(`/admin/posts/${id}/pin`, { method: 'PATCH' }), ['admin', 'posts']);
  const del = useAdminMutation((id: string) => api(`/admin/posts/${id}`, { method: 'DELETE' }), ['admin', 'posts']);

  const field = (k: keyof typeof empty) => ({
    value: String(form[k]),
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{t('admin.posts')}</h1>
        <button className="btn-primary" onClick={() => open('new')}>+ {t('admin.newPost')}</button>
      </div>

      {q.isLoading ? <Spinner /> : (
        <ul className="space-y-2">
          {q.data?.map((p) => (
            <li key={p.id} className="card p-3 flex gap-3 items-center">
              {p.images[0] ? <img src={p.images[0].url} alt="" className="w-16 h-16 rounded-lg object-cover" /> : <div className="w-16 h-16 rounded-lg wood" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.pinned && '📌 '}{p.title}</p>
                <p className="text-sm text-teak">{t(`types.${p.type}`)} · {p.category}{p.price != null && ` · ${inr(p.price)}`} · ❤️ {p._count.likes} · 💬 {p._count.comments}</p>
              </div>
              <button className="btn-ghost w-11 h-11 p-0" onClick={() => pin.mutate(p.id)} aria-label={t('admin.pinned')}><Icon d={icons.pin} filled={p.pinned} /></button>
              <button className="btn-ghost w-11 h-11 p-0" onClick={() => open(p)} aria-label={t('common.edit')}><Icon d={icons.edit} /></button>
              <button className="btn-ghost w-11 h-11 p-0 text-red-700" onClick={() => { if (confirm(`${t('common.delete')}?`)) del.mutate(p.id); }} aria-label={t('common.delete')}><Icon d={icons.trash} /></button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? t('admin.newPost') : t('admin.editPost')}>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          save.mutate(undefined, { onSuccess: () => { setEditing(null); toast('✓'); }, onError: (err) => toast(err.message) });
        }}>
          <div><label className="label" htmlFor="ptitle">{t('admin.title')}</label><input id="ptitle" className="input" required minLength={3} {...field('title')} /></div>
          <div><label className="label" htmlFor="pdesc">{t('admin.description')}</label><textarea id="pdesc" className="input min-h-[120px] py-2" required minLength={10} {...field('description')} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="pcat">{t('admin.category')}</label>
              <select id="pcat" className="input" {...field('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label" htmlFor="ptype">{t('admin.type')}</label>
              <select id="ptype" className="input" {...field('type')}>{POST_TYPES.map((c) => <option key={c} value={c}>{t(`types.${c}`)}</option>)}</select></div>
            <div><label className="label" htmlFor="pprice">{t('admin.price')}</label><input id="pprice" className="input" type="number" min="0" step="0.01" {...field('price')} /></div>
            <div><label className="label" htmlFor="plabel">{t('admin.priceLabel')}</label>
              <select id="plabel" className="input" {...field('priceLabel')}><option value="from">from</option><option value="starting at">starting at</option></select></div>
            <div className="col-span-2"><label className="label" htmlFor="punit">{t('admin.priceUnit')}</label><input id="punit" className="input" {...field('priceUnit')} /></div>
          </div>

          <div>
            <label className="label" htmlFor="pimgs">{t('admin.images')}</label>
            <input id="pimgs" className="input py-2" type="file" accept="image/*" multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5 - keep.length))} />
            {editing !== 'new' && editing && (
              <>
                <p className="text-xs text-teak mt-1">{t('admin.keepImages')}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {editing.images.map((i) => (
                    <button type="button" key={i.id} onClick={() => setKeep(keep.includes(i.id) ? keep.filter((k) => k !== i.id) : [...keep, i.id])}
                      className={`rounded-lg overflow-hidden border-4 ${keep.includes(i.id) ? 'border-forest' : 'border-red-500 opacity-50'}`} aria-pressed={keep.includes(i.id)}>
                      <img src={i.url} alt="" className="w-16 h-16 object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <label className="flex items-center gap-2 min-h-[44px]">
            <input type="checkbox" className="w-5 h-5" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />{t('admin.pinned')}
          </label>
          {editing === 'new' && (
            <label className="flex items-center gap-2 min-h-[44px]">
              <input type="checkbox" className="w-5 h-5" checked={form.notifyMembers} onChange={(e) => setForm({ ...form, notifyMembers: e.target.checked })} />{t('admin.notify')}
            </label>
          )}
          <button className="btn-primary w-full" disabled={save.isPending}>{editing === 'new' ? t('admin.publish') : t('admin.update')}</button>
        </form>
      </Modal>
    </div>
  );
}
