import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { CommentDTO, Paginated, PostDTO, RewardSettings, ShopSettings, UserDTO } from '@shared/types';

export const qk = {
  me: ['me'] as const,
  settings: ['settings'] as const,
  posts: (f: object) => ['posts', f] as const,
  post: (id: string) => ['post', id] as const,
  comments: (id: string) => ['comments', id] as const,
  refer: ['refer'] as const,
  notes: ['notifications'] as const,
};

export const usePublicSettings = () =>
  useQuery({ queryKey: qk.settings, queryFn: () => api<{ shop: ShopSettings; rewards: RewardSettings }>('/public/settings'), staleTime: 600_000 });

export const useMe = () =>
  useQuery({ queryKey: qk.me, queryFn: () => api<{ user: UserDTO; unread: number }>('/me'), retry: false, staleTime: 60_000 });

export function usePosts(filters: { category?: string; q?: string; saved?: boolean }) {
  const qs = (cursor?: string) => {
    const p = new URLSearchParams({ limit: '8' });
    if (filters.category) p.set('category', filters.category);
    if (filters.q) p.set('q', filters.q);
    if (cursor) p.set('cursor', cursor);
    return p.toString();
  };
  return useInfiniteQuery({
    queryKey: qk.posts(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api<Paginated<PostDTO>>(`/posts${filters.saved ? '/saved' : ''}?${qs(pageParam)}`),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export const usePost = (id: string) => useQuery({ queryKey: qk.post(id), queryFn: () => api<PostDTO>(`/posts/${id}`) });
export const useComments = (id: string) => useQuery({ queryKey: qk.comments(id), queryFn: () => api<CommentDTO[]>(`/posts/${id}/comments`) });

/** Optimistic like/save toggles - patches every cached copy of the post. */
export function usePostAction(action: 'like' | 'save') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ liked?: boolean; likeCount?: number; saved?: boolean }>(`/posts/${id}/${action}`, { method: 'POST' }),
    onMutate: async (id) => {
      const patch = (p: PostDTO): PostDTO =>
        p.id !== id ? p
          : action === 'like' ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) }
          : { ...p, saved: !p.saved };
      qc.setQueriesData<{ pages: Paginated<PostDTO>[] }>({ queryKey: ['posts'] }, (d) =>
        d ? { ...d, pages: d.pages.map((pg) => ({ ...pg, items: pg.items.map(patch) })) } : d);
      qc.setQueryData<PostDTO>(qk.post(id), (p) => (p ? patch(p) : p));
    },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ['posts'] }); },
  });
}

export interface NotificationItem {
  id: string; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string;
}
export const useNotifications = (enabled: boolean) =>
  useQuery({ queryKey: qk.notes, queryFn: () => api<{ items: NotificationItem[]; unread: number }>('/notifications'), enabled, refetchInterval: 60_000 });
